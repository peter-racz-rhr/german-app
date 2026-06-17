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

const ASSESS_SYSTEM = `You are a friendly German placement-test examiner. The learner is Hungarian. Figure out their CEFR level (A1–C2) through a short adaptive conversation.
Rules:
- One question per turn. Use German questions (with Hungarian explanation in parentheses for beginners). If they struggle, switch to simpler German or add more Hungarian context. If they're advanced, use pure German.
- Cover: greetings, vocab, verb conjugation, tenses, subordinate clauses, opinions.
- After at most 6 learner answers, stop and produce a final verdict.
- Respond ONLY with a JSON object, no markdown:
  {"reply": "<question or friendly closing — use Hungarian for meta-communication, German for the actual test>", "done": false, "level": ""}`;

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
    system: (level) => `You are Anna, 22, a warm and funny German friend texting casually with a Hungarian learner at CEFR level ${level || "A2"}. Talk about everyday life like a real friend. Keep replies short (1-3 sentences), end with a question. If the learner makes a grammar/spelling mistake, briefly note it in HUNGARIAN. Respond ONLY with JSON: {"reply": "<German text>", "correction": "<rövid magyar nyelvű javítás, pl. 'A „gehe" helyett „gehen" a helyes alak.' — vagy üres string ha nincs hiba>"}`,
  },
  prof: {
    name: "Prof. Weber",
    system: (level) => `You are Professor Weber, a formal and precise German professor. The learner is Hungarian, CEFR level ${level || "A2"}. Discuss culture, history, literature in German (formal Sie). Always correct mistakes with explanation written in HUNGARIAN. Respond ONLY with JSON: {"reply": "<German text>", "correction": "<magyar nyelvű javítás magyarázattal, vagy üres string>"}`,
  },
  marco: {
    name: "Marco",
    system: (level) => `You are Marco, an Italian expat in Berlin, funny and expressive. The learner is Hungarian at CEFR ${level || "A2"}. Occasionally use Italian words (ciao, mamma mia). Correct mistakes gently in HUNGARIAN. Respond ONLY with JSON: {"reply": "<German text with Italian flair>", "correction": "<magyar nyelvű javítás, vagy üres string>"}`,
  },
  lena: {
    name: "Lena",
    system: (level) => `You are Lena, a young Berlin startup professional. The learner is Hungarian at CEFR ${level || "A2"}. Text in business-casual German about work, coffee, city life. Correct mistakes briefly in HUNGARIAN. Respond ONLY with JSON: {"reply": "<German text>", "correction": "<magyar nyelvű javítás, vagy üres string>"}`,
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
    const system = `You are a German-Hungarian dictionary for a Hungarian learner at CEFR ${level || "A2"}. Given a German word, return its Hungarian translation and a short note in Hungarian (gender for nouns, key conjugation for verbs). Respond ONLY with JSON: {"translation": "<rövid magyar fordítás>", "note": "<<=12 szó, pl. 'der Hund (hím) — kutya' vagy üres string>"}`;
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
    const system = `You are a concise German grammar teacher for a Hungarian learner at CEFR ${level || "A2"}. Generate a short lesson on: "${topic}".
Write the explanation and tip in HUNGARIAN. Examples are German sentences. Exercise can be Hungarian→German or fill-in-the-blank.
Return ONLY a JSON object:
{
  "explanation": "<2-3 mondatos magyarázat magyarul>",
  "examples": ["<német mondat 1>", "<német mondat 2>", "<német mondat 3>"],
  "tip": "<egy emlékezetes tipp vagy ökölszabály magyarul>",
  "exercise": "<egy feladat — kitöltős vagy fordítás>",
  "answer": "<helyes válasz>"
}`;
    res.json(await callJson({ system, messages: [{ role: "user", content: topic }], maxTokens: 700 }));
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

// ── Dictionary lookup ─────────────────────────────────────────────────────────

app.post("/api/lookup", async (req, res) => {
  try {
    const { word, level } = req.body;
    const system = `You are a German-Hungarian / Hungarian-German dictionary for a Hungarian learner at CEFR ${level || "A2"}.

Detect the language of the input word:
- If the word is HUNGARIAN: translate it to German, find the correct German word(s).
- If the word is GERMAN: translate it to Hungarian.

Return ONLY JSON:
{
  "direction": "hu→de OR de→hu",
  "word": "<the input word>",
  "translation": "<if hu→de: the German word(s) with article if noun, e.g. 'der Hund' / if de→hu: Hungarian translation>",
  "article": "<der / die / das — if German noun, otherwise '—'>",
  "plural": "<German plural nominative e.g. 'die Hunde' — if noun, otherwise '—'>",
  "forms": "<key forms in 1 line: for verbs present tense ich/du/er, for nouns akk+dat>",
  "example": "<short natural German example sentence>",
  "exampleHu": "<Hungarian translation of the example>"
}`;
    res.json(await callJson({ system, messages: [{ role: "user", content: word }], maxTokens: 350 }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

// ── Daily story ───────────────────────────────────────────────────────────────

app.get("/api/story/:contactId", async (req, res) => {
  try {
    const { contactId } = req.params;
    const today = new Date().toISOString().split("T")[0];
    const key = `story:${contactId}:${today}`;

    const cached = await store(key, null);
    if (cached) return res.json(cached);

    const persona = PERSONAS[contactId] || PERSONAS.anna;
    const system = `You are ${persona.name}. Send a short, casual German message to your Hungarian friend — something spontaneous you'd actually text: a thought, something you saw, plans, a question about their day. 1-2 sentences max in German.

Return ONLY JSON:
{
  "text": "<your German message>",
  "hint": "<1 sentence in Hungarian explaining what it's about, e.g. 'Anna arról kérdez, hogy...'>"
}`;

    const result = await callJson({ system, messages: [{ role: "user", content: "generate" }], maxTokens: 200 });
    await persist(key, result);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
