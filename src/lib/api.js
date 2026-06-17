const BASE = import.meta.env.VITE_API_URL || "";

async function post(path, body) {
  const res = await fetch(`${BASE}/api${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json();
}

async function get(path) {
  const res = await fetch(`${BASE}/api${path}`);
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json();
}

async function del(path) {
  const res = await fetch(`${BASE}/api${path}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json();
}

export const assessAnswer = ({ history }) => post("/assess", { history });
export const sendChatMessage = ({ messages, level, contactId }) =>
  post(`/chat/${contactId || "anna"}`, { messages, level });
export const defineWord = ({ word, sentence, level }) => post("/define", { word, sentence, level });

export const fetchProfile = () => get("/profile");
export const persistProfile = (profile) => post("/profile", profile);
export const resetProfile = () => fetch(`${BASE}/api/profile`, { method: "DELETE" });

export const fetchMessages = (contactId) => get(`/messages/${contactId}`);
export const persistMessages = (contactId, messages) => post(`/messages/${contactId}`, messages);

export const fetchVocab = () => get("/vocab");
export const saveVocabWord = (entry) => post("/vocab", entry);
export const deleteVocabWord = (word) => del(`/vocab/${encodeURIComponent(word)}`);

export const fetchGrammarLesson = ({ topic, level }) => post("/grammar/lesson", { topic, level });

export const fetchStory = (contactId) => get(`/story/${contactId}`);

export const lookupWord = ({ word, level }) => post("/lookup", { word, level });
