const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

let token = localStorage.getItem('jsc.token') || '';

export function setToken(t) {
  token = t || '';
  if (t) localStorage.setItem('jsc.token', t);
  else localStorage.removeItem('jsc.token');
}

async function req(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  async signup(payload) {
    const data = await req('/api/auth/signup', { method: 'POST', body: payload, auth: false });
    setToken(data.token);
    return data;
  },
  async login(payload) {
    const data = await req('/api/auth/login', { method: 'POST', body: payload, auth: false });
    setToken(data.token);
    return data;
  },
  async me() {
    return req('/api/me');
  },
  async rooms() {
    return req('/api/rooms');
  },
  async createRoom(payload) {
    return req('/api/rooms', { method: 'POST', body: payload });
  },
  async room(id) {
    return req(`/api/rooms/${id}`);
  },
  async problems(roomId) {
    return req(`/api/rooms/${roomId}/problems`);
  },
  async problem(roomId, problemId) {
    return req(`/api/rooms/${roomId}/problems/${problemId}`);
  },
  async deleteProblem(roomId, problemId) {
    return req(`/api/rooms/${roomId}/problems/${problemId}`, { method: 'DELETE' });
  },
  async getCode(id) {
    return req(`/api/rooms/${id}/code`);
  },
  async saveCode(id, code) {
    return req(`/api/rooms/${id}/code`, { method: 'PUT', body: { code } });
  },
  async getProblemCode(roomId, problemId) {
    return req(`/api/rooms/${roomId}/problems/${problemId}/code`);
  },
  async saveProblemCode(roomId, problemId, code) {
    return req(`/api/rooms/${roomId}/problems/${problemId}/code`, { method: 'PUT', body: { code } });
  },
  async shareRoom(id) {
    return req(`/api/rooms/${id}/share`, { method: 'POST' });
  },
  async deleteRoom(id) {
    return req(`/api/rooms/${id}`, { method: 'DELETE' });
  },
  async submitSolution(id, code) {
    return req(`/api/rooms/${id}/submit`, { method: 'POST', body: { code } });
  },
  async submitProblemSolution(roomId, problemId, code) {
    return req(`/api/rooms/${roomId}/problems/${problemId}/submit`, { method: 'POST', body: { code } });
  },
  async createProblem(id, problem) {
    return req(`/api/rooms/${id}/problems`, { method: 'POST', body: problem });
  },
  async getHint(problemTitle, problemDescription, currentCode, difficulty) {
    return req('/api/hint', { 
      method: 'POST', 
      body: { 
        problemTitle, 
        problemDescription, 
        currentCode, 
        difficulty 
      } 
    });
  },
  async getAllUsers() {
    return req('/api/users');
  },
  async inviteMember(roomId, userEmail) {
    return req(`/api/rooms/${roomId}/invite`, { method: 'POST', body: { userEmail } });
  },
  async getRoomMembers(roomId) {
    return req(`/api/rooms/${roomId}/members`);
  },
  token,
  API_URL,
};
