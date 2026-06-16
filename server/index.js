import "dotenv/config";
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");
const PROFILE_FILE = path.join(DATA_DIR, "profile.json");
const MESSAGES_FILE = path.join(DATA_DIR, "messages.json");

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const usingCloudStore = Boolean(UPSTASH_URL && UPSTASH_TOKEN);

if (!usingCloudStore) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.warn(
    "UPSTASH_REDIS_REST_URL/TOKEN not set — falling back to local JSON files in server/data. " +
      "This data will NOT survive a cloud redeploy. Set the Upstash env vars for permanent storage."
  );
}

function readJsonFile(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch {
    return fallback;
  }
}

function writeJsonFile(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

async function upstash(command) {
  const res = await fetch(UPSTASH_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  if (!res.ok) {
    throw new Error(`Upstash error ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return data.result;
}

async function store(key, fallback) {
  if (usingCloudStore) {
    const raw = await upstash(["GET", key]);
    return raw ? JSON.parse(raw) : fallback;
  }
  return readJsonFile(key === "profile" ? PROFILE_FILE : MESSAGES_FILE, fallback);
}

async function persist(key, value) {
  if (usingCloudStore) {
    await upstash(["SET", key, JSON.stringify(value)]);
    return;
  }
  writeJsonFile(key === "profile" ? PROFILE_FILE : MESSAGES_FILE, value);
}

const PORT = process.env.PORT || 8787;
const MODEL = "llama-3.3-70b-versatile";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

if (!process.env.GROQ_API_KEY) {
  console.error("Missing GROQ_API_KEY — copy server/.env.example to server/.env and fill it in.");
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json());

function extractJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`No JSON found in model output: ${text}`);
  return JSON.parse(match[0]);
}

async function callJson({ system, messages, maxTokens = 600 }) {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Groq API error ${res.status}: ${text}`);
  }
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "";
  return extractJson(text);
}

const ASSESS_SYSTEM = `You are a friendly German placement-test examiner. Your job is to figure out the learner's CEFR level (A1, A2, B1, B2, C1, or C2) through a short adaptive conversation.

Rules:
- Ask exactly one question per turn, mixing German and English depending on how the learner is doing (start simple, in German with an English gloss in parentheses if needed; if they struggle, drop to easier German or English; if they handle it well, escalate difficulty and use more German).
- Cover a mix: basic vocabulary/greetings, simple sentence construction, verb conjugation, then (if they're doing well) tense usage, subordinate clauses, and opinion/abstract topics.
- After at most 6 exchanges (6 of the learner's answers), stop asking questions and instead produce a final verdict.
- Always respond with ONLY a JSON object, no other text, no markdown fences:
  {"reply": "<your next question, or a short friendly closing message if done>", "done": <true|false>, "level": "<CEFR level, only meaningful when done is true, otherwise empty string>"}
- Keep "reply" to 1-3 sentences.`;

app.post("/api/assess", async (req, res) => {
  try {
    const { history = [] } = req.body;
    const messages = history.length
      ? history
      : [{ role: "user", content: "(start the placement test)" }];
    const result = await callJson({ system: ASSESS_SYSTEM, messages });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

function chatSystem(level) {
  return `You are Anna, a warm, casual German conversation partner texting with a friend at CEFR level ${level || "A2"}. Talk about everyday life — plans, food, weather, hobbies, weekend, work/school — like a real friend over text, not a teacher giving a lecture.

Rules:
- Write your reply mostly in German, calibrated to the learner's level (simpler grammar/vocab for A1-A2, more natural and idiomatic for B1+).
- Keep replies short and conversational, like real texting (1-3 sentences), and end with a question or comment that invites a reply.
- If the learner's last message has a meaningful grammar, vocabulary, or spelling mistake, briefly and kindly point it out — what was wrong and the corrected version — but don't let it dominate; keep the conversation flowing.
- If there's no mistake worth mentioning, leave the correction field empty.
- Respond with ONLY a JSON object, no other text, no markdown fences:
  {"reply": "<your German chat message>", "correction": "<short correction note in plain language, or empty string if nothing to correct>"}`;
}

app.post("/api/chat", async (req, res) => {
  try {
    const { messages = [], level } = req.body;
    const result = await callJson({ system: chatSystem(level), messages });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

function defineSystem(level) {
  return `You are a German-English dictionary assistant for a learner at CEFR level ${level || "A2"}. Given a German word (possibly inflected, possibly with punctuation already stripped), return its base form's translation and a very short usage note (gender for nouns, key conjugation note for verbs, or register note). Respond with ONLY a JSON object, no other text, no markdown fences:
  {"translation": "<short English translation>", "note": "<<=12 words, e.g. 'der Hund (m.) — dog' style note, or empty string>"}`;
}

app.post("/api/define", async (req, res) => {
  try {
    const { word, level } = req.body;
    const result = await callJson({
      system: defineSystem(level),
      messages: [{ role: "user", content: word }],
      maxTokens: 200,
    });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

app.get("/api/profile", async (req, res) => {
  try {
    res.json(await store("profile", null));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

app.post("/api/profile", async (req, res) => {
  try {
    await persist("profile", req.body);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

app.delete("/api/profile", async (req, res) => {
  try {
    await persist("profile", null);
    await persist("messages", []);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

app.get("/api/messages", async (req, res) => {
  try {
    res.json(await store("messages", []));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

app.post("/api/messages", async (req, res) => {
  try {
    await persist("messages", req.body);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`German app API listening on http://localhost:${PORT}`);
});
