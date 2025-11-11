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
import multer from 'multer';
import pdfParse from 'pdf-parse';
import crypto from 'node:crypto';

// Load environment variables
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
await ensureData(__dirname);

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// multer for file uploads (memory storage)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

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
  
  // Determine role: professor or student (default student)
  const role = email === 'owner@owner' ? 'professor' : 'student';
  
  // Determine admin based on env to bootstrap at least one admin without UI
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const isAdmin = adminEmails.includes(email);
  
  const user = { 
    id, 
    email, 
    name: name || email.split('@')[0], 
    passwordHash, 
    role,  // professor or student
    createdAt: Date.now(), 
    isAdmin 
  };
  users.push(user);
  await writeJSON('users.json', users);
  const token = await signToken({ id: user.id, email: user.email });
  res.json({ 
    token, 
    user: { 
      id: user.id, 
      email: user.email, 
      name: user.name, 
      role: user.role,
      isAdmin: !!user.isAdmin 
    } 
  });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  const users = await readJSON('users.json');
  const user = users.find((u) => u.email === email);
  if (!user) return res.status(401).json({ error: 'invalid credentials' });
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'invalid credentials' });
  
  // Backfill role if missing (for existing users)
  if (!user.role) {
    user.role = user.email === 'owner@owner' ? 'professor' : 'student';
  }
  
  // Backfill admin flag from env if provided
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (adminEmails.includes(user.email) && !user.isAdmin) {
    user.isAdmin = true;
    await writeJSON('users.json', users);
  }
  const token = await signToken({ id: user.id, email: user.email });
  res.json({ 
    token, 
    user: { 
      id: user.id, 
      email: user.email, 
      name: user.name, 
      role: user.role,
      isAdmin: !!user.isAdmin 
    } 
  });
});

app.get('/api/me', authRequired, async (req, res) => {
  const users = await readJSON('users.json');
  const me = users.find((u) => u.id === req.user.id);
  if (!me) return res.status(401).json({ error: 'invalid token' });
  
  // Backfill role if missing
  if (!me.role) {
    me.role = me.email === 'owner@owner' ? 'professor' : 'student';
    await writeJSON('users.json', users);
  }
  
  const anyAdmin = users.some((u) => !!u.isAdmin);
  const bootstrapAdmin = !anyAdmin && users[0]?.id === me.id;
  res.json({ 
    id: me.id, 
    email: me.email, 
    name: me.name, 
    role: me.role,
    isAdmin: !!me.isAdmin || bootstrapAdmin 
  });
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

  // Check if user is professor
  const users = await readJSON('users.json');
  const user = users.find((u) => u.id === req.user.id);
  if (!user || user.role !== 'professor') {
    return res.status(403).json({ error: 'Only professors can create rooms' });
  }

  const rooms = await readJSON('rooms.json');
  const room = {
    id: crypto.randomUUID(),
    name,
    groupName: groupName || '',
    authorName: authorName || '',
    logoUrl: logoUrl || '',
    ownerId: req.user.id,
    public: !!makePublic,
    members: [req.user.id], // Initialize with owner as first member
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
  
  // Check access: public, owner, or member
  const isMember = room.members?.includes(req.user.id);
  if (!room.public && room.ownerId !== req.user.id && !isMember) {
    return res.status(403).json({ error: 'forbidden' });
  }
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

// Get all users (professors only, for inviting members)
app.get('/api/users', authRequired, async (req, res) => {
  const users = await readJSON('users.json');
  const currentUser = users.find((u) => u.id === req.user.id);
  
  if (!currentUser || currentUser.role !== 'professor') {
    return res.status(403).json({ error: 'Only professors can view users list' });
  }
  
  // Return user list without sensitive data
  const userList = users.map(u => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role || 'student'
  }));
  
  res.json(userList);
});

// Invite member to room (professor/owner only)
app.post('/api/rooms/:id/invite', authRequired, async (req, res) => {
  const { userEmail } = req.body || {};
  if (!userEmail) return res.status(400).json({ error: 'userEmail required' });
  
  const rooms = await readJSON('rooms.json');
  const users = await readJSON('users.json');
  
  const roomIdx = rooms.findIndex((r) => r.id === req.params.id);
  if (roomIdx === -1) return res.status(404).json({ error: 'Room not found' });
  
  const room = rooms[roomIdx];
  const currentUser = users.find((u) => u.id === req.user.id);
  
  // Only room owner (professor) can invite
  if (room.ownerId !== req.user.id || currentUser.role !== 'professor') {
    return res.status(403).json({ error: 'Only room owner can invite members' });
  }
  
  // Find user to invite
  const invitedUser = users.find((u) => u.email === userEmail);
  if (!invitedUser) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  // Initialize members array if not exists
  if (!room.members) {
    room.members = [room.ownerId];
  }
  
  // Check if already a member
  if (room.members.includes(invitedUser.id)) {
    return res.status(400).json({ error: 'User is already a member' });
  }
  
  // Add member
  room.members.push(invitedUser.id);
  rooms[roomIdx] = room;
  await writeJSON('rooms.json', rooms);
  
  res.json({ 
    ok: true, 
    message: `${invitedUser.name} has been invited to the room`,
    members: room.members 
  });
});

// Remove member from room (professor/owner only)
app.delete('/api/rooms/:id/members/:userId', authRequired, async (req, res) => {
  const rooms = await readJSON('rooms.json');
  const users = await readJSON('users.json');
  
  const roomIdx = rooms.findIndex((r) => r.id === req.params.id);
  if (roomIdx === -1) return res.status(404).json({ error: 'Room not found' });
  
  const room = rooms[roomIdx];
  const currentUser = users.find((u) => u.id === req.user.id);
  
  // Only room owner (professor) can remove members
  if (room.ownerId !== req.user.id || currentUser.role !== 'professor') {
    return res.status(403).json({ error: 'Only room owner can remove members' });
  }
  
  const userIdToRemove = req.params.userId;
  
  // Cannot remove the owner
  if (userIdToRemove === room.ownerId) {
    return res.status(400).json({ error: 'Cannot remove the room owner' });
  }
  
  // Initialize members array if not exists
  if (!room.members) {
    room.members = [room.ownerId];
  }
  
  // Check if user is a member
  if (!room.members.includes(userIdToRemove)) {
    return res.status(404).json({ error: 'User is not a member of this room' });
  }
  
  // Remove member
  room.members = room.members.filter(id => id !== userIdToRemove);
  rooms[roomIdx] = room;
  await writeJSON('rooms.json', rooms);
  
  const removedUser = users.find((u) => u.id === userIdToRemove);
  res.json({ 
    ok: true, 
    message: `${removedUser?.name || 'User'} has been removed from the room`,
    members: room.members 
  });
});

// Get room members (owner only)
app.get('/api/rooms/:id/members', authRequired, async (req, res) => {
  const rooms = await readJSON('rooms.json');
  const users = await readJSON('users.json');
  
  const room = rooms.find((r) => r.id === req.params.id);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  
  if (room.ownerId !== req.user.id) {
    return res.status(403).json({ error: 'Only room owner can view members' });
  }
  
  const memberIds = room.members || [room.ownerId];
  const members = users
    .filter(u => memberIds.includes(u.id))
    .map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role || 'student'
    }));
  
  res.json(members);
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

// Generate problems from uploaded PDF (owner/professor only)
app.post('/api/rooms/:id/generate-problems', authRequired, upload.single('file'), async (req, res) => {
  try {
    console.log('=== PDF Problem Generation Started ===');
    const roomId = req.params.id;
    const buffer = req.file?.buffer;
    
    if (!buffer) {
      console.log('Error: No file uploaded');
      return res.status(400).json({ error: 'PDF file is required' });
    }

    console.log('PDF file received, size:', buffer.length, 'bytes');

    // extract text from pdf
    console.log('Parsing PDF...');
    const parsed = await pdfParse(buffer);
    const text = (parsed && parsed.text) ? parsed.text.substring(0, 10000) : '';
    console.log('PDF text extracted, length:', text.length, 'characters');
    console.log('First 200 chars:', text.substring(0, 200));

    // Check API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_api_key_here') {
      console.log('Error: Gemini API key not configured');
      return res.status(503).json({ error: 'Gemini API key not configured' });
    }

    const users = await readJSON('users.json');
    const currentUser = users.find((u) => u.id === req.user.id);

    const rooms = await readJSON('rooms.json');
    const idx = rooms.findIndex((r) => r.id === roomId);
    if (idx === -1) return res.status(404).json({ error: 'Room not found' });
    const room = rooms[idx];

    // Only owner/professor can generate
    if (room.ownerId !== req.user.id && currentUser?.role !== 'professor') {
      return res.status(403).json({ error: 'Only room owner (professor) can generate problems' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `You are an AI that creates programming practice problems from lecture materials.

Given the lecture content below, generate exactly 3 programming problems suitable for students.

IMPORTANT: Return ONLY a JSON array, nothing else. No markdown, no code blocks, no explanations.

Each problem object must have:
- title: string (problem title)
- description: string (detailed problem description in Korean)
- difficulty: string ("Easy", "Medium", or "Hard")
- functionName: string (the function name to implement)
- starterCode: string (JavaScript starter code with function signature and TODO comment)
- samples: array of test cases (optional, can be empty [])
- tests: array of test cases with {input: array, output: any} format

Example format:
[
  {
    "title": "두 수의 합",
    "description": "배열에서 두 수를 더해 목표값이 되는 인덱스를 찾으세요.",
    "difficulty": "Easy",
    "functionName": "twoSum",
    "starterCode": "function twoSum(nums, target) {\\n  // TODO\\n}",
    "samples": [{"input": [[2,7,11,15], 9], "output": [0,1]}],
    "tests": [{"input": [[2,7,11,15], 9], "output": [0,1]}]
  }
]

Lecture content:
${text}

Return only the JSON array:`;

    console.log('Calling Gemini API for problem generation...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let generatedText = response.text().trim();
    
    console.log('Raw AI response:', generatedText.substring(0, 500));

    // Remove markdown code blocks if present
    if (generatedText.startsWith('```')) {
      generatedText = generatedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    }

    let problems;
    try {
      problems = JSON.parse(generatedText);
    } catch (e) {
      console.error('JSON parse error:', e.message);
      console.error('Generated text:', generatedText);
      return res.status(500).json({ error: 'AI returned invalid JSON', details: generatedText.substring(0, 1000) });
    }

    if (!Array.isArray(problems) || problems.length === 0) {
      console.log('Error: No problems in parsed result');
      return res.status(500).json({ error: 'No problems generated' });
    }

    console.log('Successfully generated', problems.length, 'problems');

    if (!Array.isArray(room.problems)) room.problems = [];
    const created = problems.map((p) => ({ 
      id: crypto.randomUUID(), 
      title: p.title || 'Untitled Problem',
      description: p.description || '',
      difficulty: p.difficulty || 'Easy',
      functionName: p.functionName || 'solve',
      language: 'javascript',
      starterCode: p.starterCode || '',
      samples: Array.isArray(p.samples) ? p.samples : [],
      tests: Array.isArray(p.tests) ? p.tests : []
    }));
    // prepend generated problems
    room.problems = [...created, ...room.problems];
    rooms[idx] = room;
    await writeJSON('rooms.json', rooms);

    console.log('Problems saved to room successfully');
    console.log('=== PDF Problem Generation Complete ===');
    res.json({ problems: created });
  } catch (err) {
    console.error('=== Generate problems error ===');
    console.error('Error:', err);
    console.error('Stack:', err.stack);
    res.status(500).json({ error: 'Failed to generate problems', details: err.message });
  }
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

    // Create a thoughtful prompt for hints in Korean with skeleton code
    const prompt = `당신은 친절하고 상세한 코딩 튜터입니다. 학생이 다음 문제를 풀고 있습니다:

제목: ${problemTitle || '코딩 문제'}
난이도: ${difficulty || '알 수 없음'}
문제 설명:
${problemDescription}

${currentCode ? `학생의 현재 코드:
\`\`\`javascript
${currentCode}
\`\`\`
` : '아직 코드를 작성하지 않았습니다.'}

다음 형식으로 자세한 힌트를 **한국어로** 제공해주세요:

1. **접근 방법** (2-3문장으로 핵심 아이디어 설명)
2. **추천 자료구조/알고리즘** (구체적으로 어떤 것을 사용하면 좋은지)
3. **스켈레톤 코드** (실제 동작하는 코드 구조를 보여주되, 핵심 로직은 주석이나 TODO로 남겨둠)
4. **시간 복잡도** (예상되는 시간/공간 복잡도)
5. **주의사항** (Edge case나 놓치기 쉬운 부분)

${currentCode ? '현재 코드의 문제점이나 개선 방향도 함께 알려주세요.' : ''}

스켈레톤 코드는 반드시 \`\`\`javascript 코드블록으로 감싸서 제공하고, 
학생이 구조를 이해하고 스스로 채워넣을 수 있도록 작성해주세요.
완전한 정답은 절대 알려주지 마세요.`;

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
