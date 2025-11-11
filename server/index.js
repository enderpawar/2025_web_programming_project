// Simple Express server with JWT auth, rooms CRUD, code storage, and Socket.IO for collaboration
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureData, readJSON, writeJSON, hashPassword, verifyPassword, signToken, authRequired } from './lib.js';
import { createServer } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import vm from 'node:vm';
import fs from 'node:fs/promises';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
await ensureData(__dirname);

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Health
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Auth
app.post('/api/auth/signup', async (req, res) => {
  const { email, password, name } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  const users = await readJSON('users.json');
  if (users.find((u) => u.email === email)) return res.status(409).json({ error: 'email already exists' });
  const id = crypto.randomUUID();
  const passwordHash = await hashPassword(password);
  // Determine admin based on env to bootstrap at least one admin without UI
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const isAdmin = adminEmails.includes(email);
  const user = { id, email, name: name || email.split('@')[0], passwordHash, createdAt: Date.now(), isAdmin };
  users.push(user);
  await writeJSON('users.json', users);
  const token = await signToken({ id: user.id, email: user.email });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, isAdmin: !!user.isAdmin } });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  const users = await readJSON('users.json');
  const user = users.find((u) => u.email === email);
  if (!user) return res.status(401).json({ error: 'invalid credentials' });
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'invalid credentials' });
  // Backfill admin flag from env if provided
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (adminEmails.includes(user.email) && !user.isAdmin) {
    user.isAdmin = true;
    await writeJSON('users.json', users);
  }
  const token = await signToken({ id: user.id, email: user.email });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, isAdmin: !!user.isAdmin } });
});

app.get('/api/me', authRequired, async (req, res) => {
  const users = await readJSON('users.json');
  const me = users.find((u) => u.id === req.user.id);
  if (!me) return res.status(401).json({ error: 'invalid token' });
  const anyAdmin = users.some((u) => !!u.isAdmin);
  const bootstrapAdmin = !anyAdmin && users[0]?.id === me.id;
  res.json({ id: me.id, email: me.email, name: me.name, isAdmin: !!me.isAdmin || bootstrapAdmin });
});

// Rooms
app.get('/api/rooms', authRequired, async (req, res) => {
  const rooms = await readJSON('rooms.json');
  const list = rooms.filter((r) => r.public || r.ownerId === req.user.id);
  res.json(list);
});

app.post('/api/rooms', authRequired, async (req, res) => {
  const { name, groupName, authorName, logoUrl, makePublic } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name required' });

  const rooms = await readJSON('rooms.json');
  const room = {
    id: crypto.randomUUID(),
    name,
    groupName: groupName || '',
    authorName: authorName || '',
    logoUrl: logoUrl || '',
    ownerId: req.user.id,
    public: !!makePublic,
    createdAt: Date.now(),
    // problem is created later via /api/rooms/:id/problem
    problem: undefined,
  };
  rooms.unshift(room);
  await writeJSON('rooms.json', rooms);
  res.status(201).json(room);
});

app.get('/api/rooms/:id', authRequired, async (req, res) => {
  const rooms = await readJSON('rooms.json');
  const room = rooms.find((r) => r.id === req.params.id);
  if (!room) return res.status(404).json({ error: 'not found' });
  if (!room.public && room.ownerId !== req.user.id) return res.status(403).json({ error: 'forbidden' });
  res.json(room);
});

app.put('/api/rooms/:id', authRequired, async (req, res) => {
  const rooms = await readJSON('rooms.json');
  const idx = rooms.findIndex((r) => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  const room = rooms[idx];
  // Only admin(owner) can edit room metadata and problem
  if (room.ownerId !== req.user.id) return res.status(403).json({ error: 'forbidden' });
  const { name, groupName, authorName, logoUrl, public: isPublic, problem } = req.body || {};
  if (name !== undefined) room.name = name;
  if (groupName !== undefined) room.groupName = groupName;
  if (authorName !== undefined) room.authorName = authorName;
  if (logoUrl !== undefined) room.logoUrl = logoUrl;
  if (typeof isPublic === 'boolean') room.public = isPublic;
  if (problem) {
    room.problem = {
      ...(room.problem || {}),
      title: problem.title ?? (room.problem?.title || room.name),
      description: problem.description ?? room.problem?.description ?? '',
      difficulty: problem.difficulty ?? room.problem?.difficulty ?? 'Easy',
      functionName: problem.functionName ?? room.problem?.functionName ?? 'solve',
      language: problem.language ?? room.problem?.language ?? 'javascript',
      starterCode: problem.starterCode ?? room.problem?.starterCode ?? '',
      samples: Array.isArray(problem.samples) ? problem.samples : (room.problem?.samples || []),
      tests: Array.isArray(problem.tests) ? problem.tests : (room.problem?.tests || []),
    };
  }
  rooms[idx] = room;
  await writeJSON('rooms.json', rooms);
  res.json(room);
});

// Create problem inside a room (owner only)
app.post('/api/rooms/:id/problem', authRequired, async (req, res) => {
  const rooms = await readJSON('rooms.json');
  const idx = rooms.findIndex((r) => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  const room = rooms[idx];
  if (room.ownerId !== req.user.id) return res.status(403).json({ error: 'forbidden' });
  const problem = req.body || {};
  const cleanProblem = {
    title: problem.title || room.name,
    description: problem.description || '',
    difficulty: problem.difficulty || 'Easy',
    functionName: problem.functionName || 'solve',
    language: problem.language || 'javascript',
    starterCode: problem.starterCode || '',
    samples: Array.isArray(problem.samples) ? problem.samples : [],
    tests: Array.isArray(problem.tests) ? problem.tests : [],
  };
  room.problem = cleanProblem;
  rooms[idx] = room;
  await writeJSON('rooms.json', rooms);
  res.status(201).json(room.problem);
});

app.delete('/api/rooms/:id', authRequired, async (req, res) => {
  const rooms = await readJSON('rooms.json');
  const idx = rooms.findIndex((r) => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  const room = rooms[idx];
  if (room.ownerId !== req.user.id) return res.status(403).json({ error: 'forbidden' });
  rooms.splice(idx, 1);
  await writeJSON('rooms.json', rooms);
  // Cleanup codes for this room (legacy and problem-scoped)
  try {
    const codesDir = path.join(__dirname, 'data', 'codes');
    const files = await fs.readdir(codesDir);
    const targets = files.filter((f) => f === `${req.params.id}.json` || f.startsWith(`${req.params.id}-`));
    await Promise.all(targets.map((f) => fs.unlink(path.join(codesDir, f)).catch(() => {})));
  } catch {}
  res.json({ ok: true });
});

// Code
app.get('/api/rooms/:id/code', authRequired, async (req, res) => {
  const rooms = await readJSON('rooms.json');
  const room = rooms.find((r) => r.id === req.params.id);
  if (!room) return res.status(404).json({ error: 'not found' });
  if (!room.public && room.ownerId !== req.user.id) return res.status(403).json({ error: 'forbidden' });
  const codeObj = await readJSON(path.join('codes', `${req.params.id}-${req.user.id}.json`), { code: '' });
  res.json(codeObj);
});

app.put('/api/rooms/:id/code', authRequired, async (req, res) => {
  const { code } = req.body || {};
  const rooms = await readJSON('rooms.json');
  const room = rooms.find((r) => r.id === req.params.id);
  if (!room) return res.status(404).json({ error: 'not found' });
  if (!room.public && room.ownerId !== req.user.id) return res.status(403).json({ error: 'forbidden' });
  await writeJSON(path.join('codes', `${req.params.id}-${req.user.id}.json`), { code: code || '' , ts: Date.now()});
  res.json({ ok: true });
});

// Share
app.post('/api/rooms/:id/share', authRequired, async (req, res) => {
  const rooms = await readJSON('rooms.json');
  const idx = rooms.findIndex((r) => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  const room = rooms[idx];
  if (room.ownerId !== req.user.id) return res.status(403).json({ error: 'forbidden' });
  room.public = true;
  rooms[idx] = room;
  await writeJSON('rooms.json', rooms);
  res.json({ ok: true, url: `/rooms/${room.id}` });
});

// Submission: run user's code against room tests (JS only) in a sandbox
app.post('/api/rooms/:id/submit', authRequired, async (req, res) => {
  const { code } = req.body || {};
  const rooms = await readJSON('rooms.json');
  const room = rooms.find((r) => r.id === req.params.id);
  if (!room) return res.status(404).json({ error: 'not found' });
  if (!room.public && room.ownerId !== req.user.id) return res.status(403).json({ error: 'forbidden' });
  const problem = room.problem;
  if (!problem || problem.language !== 'javascript' || !Array.isArray(problem.tests)) {
    return res.status(400).json({ error: 'no tests configured' });
  }

  const fnName = problem.functionName || 'solve';
  // Build sandbox
  const context = vm.createContext({ console: { log(){}, error(){}, warn(){}, info(){} } });
  const scriptCode = `${code}\n;typeof ${fnName}==='function' ? ${fnName} : undefined;`;
  let fn;
  try {
    const script = new vm.Script(scriptCode, { timeout: 1000 });
    fn = script.runInContext(context, { timeout: 1000 });
  } catch (e) {
    return res.status(200).json({ passed: false, results: [], error: String(e?.message || e) });
  }
  if (typeof fn !== 'function') {
    return res.status(200).json({ passed: false, results: [], error: `Function ${fnName} not found` });
  }

  const results = [];
  let allPass = true;
  for (const [index, t] of problem.tests.entries()) {
    const input = Array.isArray(t.input) ? t.input : [t.input];
    let actual;
    let ok = false;
    let err = null;
    try {
      const resv = fn.apply(null, input);
      actual = resv;
      ok = JSON.stringify(resv) === JSON.stringify(t.output);
    } catch (e) {
      allPass = false;
      ok = false;
      err = String(e?.message || e);
    }
    if (!ok) allPass = false;
    results.push({ index, input: t.input, expected: t.output, actual, pass: ok, error: err });
  }
  res.json({ passed: allPass, results });
});

// --- Multiple problems per room ---
app.get('/api/rooms/:id/problems', authRequired, async (req, res) => {
  const rooms = await readJSON('rooms.json');
  const room = rooms.find((r) => r.id === req.params.id);
  if (!room) return res.status(404).json({ error: 'not found' });
  if (!room.public && room.ownerId !== req.user.id) return res.status(403).json({ error: 'forbidden' });
  const list = Array.isArray(room.problems) ? room.problems : (room.problem ? [{ id: 'legacy', ...room.problem }] : []);
  res.json(list);
});

app.post('/api/rooms/:id/problems', authRequired, async (req, res) => {
  const rooms = await readJSON('rooms.json');
  const idx = rooms.findIndex((r) => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  const room = rooms[idx];
  if (room.ownerId !== req.user.id) return res.status(403).json({ error: 'forbidden' });
  const p = req.body || {};
  const problem = {
    id: crypto.randomUUID(),
    title: p.title || room.name,
    description: p.description || '',
    difficulty: p.difficulty || 'Easy',
    functionName: p.functionName || 'solve',
    language: p.language || 'javascript',
    starterCode: p.starterCode || '',
    samples: Array.isArray(p.samples) ? p.samples : [],
    tests: Array.isArray(p.tests) ? p.tests : [],
  };
  if (!Array.isArray(room.problems)) room.problems = [];
  room.problems.push(problem);
  rooms[idx] = room;
  await writeJSON('rooms.json', rooms);
  res.status(201).json(problem);
});

app.get('/api/rooms/:id/problems/:pid', authRequired, async (req, res) => {
  const rooms = await readJSON('rooms.json');
  const room = rooms.find((r) => r.id === req.params.id);
  if (!room) return res.status(404).json({ error: 'not found' });
  if (!room.public && room.ownerId !== req.user.id) return res.status(403).json({ error: 'forbidden' });
  const problem = (room.problems || []).find((p) => p.id === req.params.pid);
  if (!problem) return res.status(404).json({ error: 'problem not found' });
  res.json(problem);
});

app.delete('/api/rooms/:id/problems/:pid', authRequired, async (req, res) => {
  const rooms = await readJSON('rooms.json');
  const idx = rooms.findIndex((r) => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  const room = rooms[idx];
  if (room.ownerId !== req.user.id) return res.status(403).json({ error: 'forbidden' });
  if (!Array.isArray(room.problems)) room.problems = [];
  const pidx = room.problems.findIndex((p) => p.id === req.params.pid);
  if (pidx === -1) return res.status(404).json({ error: 'problem not found' });
  room.problems.splice(pidx, 1);
  rooms[idx] = room;
  await writeJSON('rooms.json', rooms);
  // cleanup codes for this specific problem
  try {
    const codesDir = path.join(__dirname, 'data', 'codes');
    const files = await fs.readdir(codesDir);
    const prefix = `${req.params.id}-${req.params.pid}-`;
    const targets = files.filter((f) => f.startsWith(prefix));
    await Promise.all(targets.map((f) => fs.unlink(path.join(codesDir, f)).catch(() => {})));
  } catch {}
  res.json({ ok: true });
});

// Problem-scoped code
app.get('/api/rooms/:id/problems/:pid/code', authRequired, async (req, res) => {
  const rooms = await readJSON('rooms.json');
  const room = rooms.find((r) => r.id === req.params.id);
  if (!room) return res.status(404).json({ error: 'not found' });
  if (!room.public && room.ownerId !== req.user.id) return res.status(403).json({ error: 'forbidden' });
  const problem = (room.problems || []).find((p) => p.id === req.params.pid);
  if (!problem) return res.status(404).json({ error: 'problem not found' });
  const codeObj = await readJSON(path.join('codes', `${req.params.id}-${req.params.pid}-${req.user.id}.json`), { code: '' });
  res.json(codeObj);
});

app.put('/api/rooms/:id/problems/:pid/code', authRequired, async (req, res) => {
  const { code } = req.body || {};
  const rooms = await readJSON('rooms.json');
  const room = rooms.find((r) => r.id === req.params.id);
  if (!room) return res.status(404).json({ error: 'not found' });
  if (!room.public && room.ownerId !== req.user.id) return res.status(403).json({ error: 'forbidden' });
  const problem = (room.problems || []).find((p) => p.id === req.params.pid);
  if (!problem) return res.status(404).json({ error: 'problem not found' });
  await writeJSON(path.join('codes', `${req.params.id}-${req.params.pid}-${req.user.id}.json`), { code: code || '', ts: Date.now() });
  res.json({ ok: true });
});

// Problem submission
app.post('/api/rooms/:id/problems/:pid/submit', authRequired, async (req, res) => {
  const { code } = req.body || {};
  const rooms = await readJSON('rooms.json');
  const room = rooms.find((r) => r.id === req.params.id);
  if (!room) return res.status(404).json({ error: 'not found' });
  if (!room.public && room.ownerId !== req.user.id) return res.status(403).json({ error: 'forbidden' });
  const problem = (room.problems || []).find((p) => p.id === req.params.pid);
  if (!problem) return res.status(404).json({ error: 'problem not found' });
  if (problem.language !== 'javascript' || !Array.isArray(problem.tests)) {
    return res.status(400).json({ error: 'no tests configured' });
  }
  const fnName = problem.functionName || 'solve';
  const context = vm.createContext({ console: { log(){}, error(){}, warn(){}, info(){} } });
  const scriptCode = `${code}\n;typeof ${fnName}==='function' ? ${fnName} : undefined;`;
  let fn;
  try {
    const script = new vm.Script(scriptCode, { timeout: 1000 });
    fn = script.runInContext(context, { timeout: 1000 });
  } catch (e) {
    return res.status(200).json({ passed: false, results: [], error: String(e?.message || e) });
  }
  if (typeof fn !== 'function') {
    return res.status(200).json({ passed: false, results: [], error: `Function ${fnName} not found` });
  }
  const results = [];
  let allPass = true;
  for (const [index, t] of problem.tests.entries()) {
    const input = Array.isArray(t.input) ? t.input : [t.input];
    let actual; let ok = false; let err = null;
    try {
      const resv = fn.apply(null, input);
      actual = resv;
      ok = JSON.stringify(resv) === JSON.stringify(t.output);
    } catch (e) {
      allPass = false; ok = false; err = String(e?.message || e);
    }
    if (!ok) allPass = false;
    results.push({ index, input: t.input, expected: t.output, actual, pass: ok, error: err });
  }
  res.json({ passed: allPass, results });
});

// AI Hint endpoint using Gemini
app.post('/api/hint', authRequired, async (req, res) => {
  try {
    const { problemDescription, problemTitle, currentCode, difficulty } = req.body || {};
    
    if (!problemDescription && !problemTitle) {
      return res.status(400).json({ error: 'Problem description or title required' });
    }

    // Check if API key is configured
    const apiKey = process.env.GEMINI_API_KEY;
    console.log('API Key configured:', apiKey ? `Yes (${apiKey.substring(0, 10)}...)` : 'No');
    
    if (!apiKey || apiKey === 'your_api_key_here') {
      return res.status(503).json({ 
        error: 'Gemini API key not configured. Please add GEMINI_API_KEY to .env file' 
      });
    }

    console.log('Initializing Gemini AI...');
    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Create a thoughtful prompt for hints
    const prompt = `You are a helpful coding tutor. A student is working on the following problem:

Title: ${problemTitle || 'Coding Problem'}
Difficulty: ${difficulty || 'Unknown'}
Description:
${problemDescription}

${currentCode ? `Their current code is:
\`\`\`javascript
${currentCode}
\`\`\`
` : 'They haven\'t started coding yet.'}

Please provide a helpful hint that:
1. Does NOT give away the complete solution
2. Guides them toward the right approach
3. Suggests what data structures or algorithms might be useful
4. Points out any obvious issues in their current code (if provided)
5. Encourages them to think about edge cases

Keep the hint concise (3-5 sentences) and educational.`;

    console.log('Sending request to Gemini API...');
    const result = await model.generateContent(prompt);
    console.log('Received response from Gemini API');
    const response = await result.response;
    const hint = response.text();
    console.log('Hint generated successfully, length:', hint.length);

    res.json({ hint });
  } catch (error) {
    console.error('=== Gemini API Error ===');
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);
    console.error('Full Error:', JSON.stringify(error, null, 2));
    console.error('=======================');
    
    res.status(500).json({ 
      error: 'Failed to generate hint', 
      details: error.message,
      errorType: error.name
    });
  }
});

// Start HTTP + Socket.IO
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, { cors: { origin: '*' } });

io.on('connection', (socket) => {
  socket.on('join', ({ roomId }) => {
    if (!roomId) return;
    socket.join(roomId);
  });
  socket.on('code:change', ({ roomId, code, clientId }) => {
    if (!roomId) return;
    socket.to(roomId).emit('code:remote', { code, clientId });
  });
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});
