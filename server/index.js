import "dotenv/config";
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const usingCloudStore = Boolean(UPSTASH_URL && UPSTASH_TOKEN);

if (!usingCloudStore) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.warn("UPSTASH not set — using local JSON files (data lost on redeploy).");
}

function readJsonFile(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf-8")); }
  catch { return fallback; }
}

function writeJsonFile(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

async function upstash(command) {
  const res = await fetch(UPSTASH_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });
  if (!res.ok) throw new Error(`Upstash error ${res.status}: ${await res.text()}`);
  return (await res.json()).result;
}

async function store(key, fallback) {
  if (usingCloudStore) {
    const raw = await upstash(["GET", key]);
    return raw ? JSON.parse(raw) : fallback;
  }
  const file = path.join(DATA_DIR, `${key.replace(/:/g, "_")}.json`);
  return readJsonFile(file, fallback);
}

async function persist(key, value) {
  if (usingCloudStore) {
    await upstash(["SET", key, JSON.stringify(value)]);
    return;
  }
  const file = path.join(DATA_DIR, `${key.replace(/:/g, "_")}.json`);
  writeJsonFile(file, value);
}

const PORT = process.env.PORT || 8787;
const MODEL = "llama-3.3-70b-versatile";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

if (!process.env.GROQ_API_KEY) {
  console.error("Missing GROQ_API_KEY");
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json());

function extractJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`No JSON in: ${text}`);
  return JSON.parse(match[0]);
}

async function callJson({ system, messages, maxTokens = 600 }) {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });
  if (!res.ok) throw new Error(`Groq API error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return extractJson(data.choices?.[0]?.message?.content || "");
}

// ── Placement test ────────────────────────────────────────────────────────────

const ASSESS_SYSTEM = `You are a friendly German placement-test examiner. Figure out the learner's CEFR level (A1–C2) through a short adaptive conversation.
Rules:
- One question per turn. Mix German and English based on their level.
- Cover: greetings, vocab, verb conjugation, tenses, subordinate clauses, opinions.
- After at most 6 learner answers, stop and produce a final verdict.
- Respond ONLY with a JSON object, no markdown:
  {"reply": "<question or friendly closing>", "done": false, "level": ""}`;

app.post("/api/assess", async (req, res) => {
  try {
    const { history = [] } = req.body;
    const messages = history.length ? history : [{ role: "user", content: "(start the placement test)" }];
    res.json(await callJson({ system: ASSESS_SYSTEM, messages }));
  } catch (err) { console.error(err); res.status(500).json({ error: String(err) }); }
});

// ── Contact personas ──────────────────────────────────────────────────────────

const PERSONAS = {
  anna: {
    name: "Anna",
    system: (level) => `You are Anna, 22, a warm and funny German friend texting casually at CEFR level ${level || "A2"}. You talk about everyday life — plans, food, weekend, hobbies — like a real friend, not a teacher. Keep replies short and chatty (1-3 sentences), end with a question. If the learner makes a grammar/spelling mistake, briefly note it kindly. Respond ONLY with JSON: {"reply": "<German text>", "correction": "<short fix note or empty string>"}`,
  },
  prof: {
    name: "Prof. Weber",
    system: (level) => `You are Professor Weber, a formal and precise German professor helping a learner at CEFR level ${level || "A2"}. You are encouraging but strict about grammar. You discuss culture, history, literature. Replies are 2-3 sentences, formal register (Sie). Always correct mistakes with explanation. Respond ONLY with JSON: {"reply": "<German text>", "correction": "<correction note or empty string>"}`,
  },
  marco: {
    name: "Marco",
    system: (level) => `You are Marco, an Italian expat living in Berlin, funny and expressive, CEFR level ${level || "A2"} learner's chat buddy. You occasionally slip in Italian words (ciao, mamma mia, etc.) and compare Germany with Italy humorously. Very warm and enthusiastic. Correct mistakes gently and briefly. Respond ONLY with JSON: {"reply": "<German text with occasional Italian flair>", "correction": "<correction or empty string>"}`,
  },
  lena: {
    name: "Lena",
    system: (level) => `You are Lena, a young Berlin professional (startup world). You text in business-casual German at CEFR level ${level || "A2"}, talk about work, coffee, city life, career. Efficient but friendly. Correct grammar mistakes briefly. Respond ONLY with JSON: {"reply": "<German text>", "correction": "<correction or empty string>"}`,
  },
};

app.post("/api/chat/:contactId", async (req, res) => {
  try {
    const { contactId } = req.params;
    const { messages = [], level } = req.body;
    const persona = PERSONAS[contactId] || PERSONAS.anna;
    res.json(await callJson({ system: persona.system(level), messages }));
  } catch (err) { console.error(err); res.status(500).json({ error: String(err) }); }
});

// keep old route working too
app.post("/api/chat", async (req, res) => {
  try {
    const { messages = [], level } = req.body;
    res.json(await callJson({ system: PERSONAS.anna.system(level), messages }));
  } catch (err) { console.error(err); res.status(500).json({ error: String(err) }); }
});

// ── Word definition ───────────────────────────────────────────────────────────

app.post("/api/define", async (req, res) => {
  try {
    const { word, level } = req.body;
    const system = `You are a German-English dictionary for a CEFR ${level || "A2"} learner. Given a German word, return its translation and a short note (gender for nouns, key conjugation for verbs). Respond ONLY with JSON: {"translation": "<short English translation>", "note": "<<=12 words, e.g. 'der Hund (m.) — dog', or empty string>"}`;
    res.json(await callJson({ system, messages: [{ role: "user", content: word }], maxTokens: 150 }));
  } catch (err) { console.error(err); res.status(500).json({ error: String(err) }); }
});

// ── Profile ───────────────────────────────────────────────────────────────────

app.get("/api/profile", async (req, res) => {
  try { res.json(await store("profile", null)); }
  catch (err) { res.status(500).json({ error: String(err) }); }
});

app.post("/api/profile", async (req, res) => {
  try { await persist("profile", req.body); res.json({ ok: true }); }
  catch (err) { res.status(500).json({ error: String(err) }); }
});

app.delete("/api/profile", async (req, res) => {
  try {
    await persist("profile", null);
    for (const id of Object.keys(PERSONAS)) await persist(`messages:${id}`, []);
    await persist("vocab", []);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

// ── Messages per contact ──────────────────────────────────────────────────────

app.get("/api/messages/:contactId", async (req, res) => {
  try {
    const { contactId } = req.params;
    let msgs = await store(`messages:${contactId}`, null);
    // migrate from old single-contact storage
    if (!msgs && contactId === "anna") msgs = await store("messages", []);
    res.json(msgs || []);
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

app.post("/api/messages/:contactId", async (req, res) => {
  try {
    await persist(`messages:${req.params.contactId}`, req.body);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

// ── Vocab ─────────────────────────────────────────────────────────────────────

app.get("/api/vocab", async (req, res) => {
  try { res.json(await store("vocab", [])); }
  catch (err) { res.status(500).json({ error: String(err) }); }
});

app.post("/api/vocab", async (req, res) => {
  try {
    const entry = req.body; // { word, translation, note }
    const vocab = await store("vocab", []);
    if (!vocab.some((v) => v.word === entry.word)) {
      vocab.unshift({ ...entry, addedAt: Date.now() });
    }
    await persist("vocab", vocab);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

app.delete("/api/vocab/:word", async (req, res) => {
  try {
    const vocab = await store("vocab", []);
    await persist("vocab", vocab.filter((v) => v.word !== decodeURIComponent(req.params.word)));
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

// ── Grammar lessons ───────────────────────────────────────────────────────────

app.post("/api/grammar/lesson", async (req, res) => {
  try {
    const { topic, level } = req.body;
    const system = `You are a concise German grammar teacher. Generate a short lesson for a CEFR ${level || "A2"} learner on: "${topic}".
Return ONLY a JSON object:
{
  "explanation": "<2-3 sentence explanation in English>",
  "examples": ["<German sentence 1>", "<German sentence 2>", "<German sentence 3>"],
  "tip": "<one memorable tip or mnemonic in English>",
  "exercise": "<one fill-in-the-blank or translate exercise>",
  "answer": "<correct answer>"
}`;
    res.json(await callJson({ system, messages: [{ role: "user", content: topic }], maxTokens: 700 }));
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
