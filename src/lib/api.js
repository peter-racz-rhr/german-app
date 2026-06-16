const BASE = import.meta.env.VITE_API_URL || "";

async function post(path, body) {
  const res = await fetch(`${BASE}/api${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${path} failed: ${res.status} ${text}`);
  }
  return res.json();
}

async function get(path) {
  const res = await fetch(`${BASE}/api${path}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${path} failed: ${res.status} ${text}`);
  }
  return res.json();
}

export function assessAnswer({ question, answer, history }) {
  return post("/assess", { question, answer, history });
}

export function sendChatMessage({ messages, level }) {
  return post("/chat", { messages, level });
}

export function defineWord({ word, sentence, level }) {
  return post("/define", { word, sentence, level });
}

export function fetchProfile() {
  return get("/profile");
}

export function persistProfile(profile) {
  return post("/profile", profile);
}

export function fetchMessages() {
  return get("/messages");
}

export function persistMessages(messages) {
  return post("/messages", messages);
}

export function resetProfile() {
  return fetch(`${BASE}/api/profile`, { method: "DELETE" });
}
