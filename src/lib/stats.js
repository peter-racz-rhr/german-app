const TODAY = () => new Date().toISOString().split("T")[0];

// ── XP levels ─────────────────────────────────────────────────────────────────
export const XP_LEVELS = [
  { label: "A1", min: 0,    max: 99   },
  { label: "A2", min: 100,  max: 299  },
  { label: "B1", min: 300,  max: 699  },
  { label: "B2", min: 700,  max: 1499 },
  { label: "C1", min: 1500, max: 2999 },
  { label: "C2", min: 3000, max: Infinity },
];

export const XP_REWARDS = { msg: 5, word: 10, lesson: 15 };

export function getXP() {
  try { return parseInt(localStorage.getItem("xp") || "0", 10); } catch { return 0; }
}

export function addXP(amount) {
  const next = getXP() + amount;
  localStorage.setItem("xp", String(next));
  return next;
}

export function getLevelInfo(xp) {
  const x = xp ?? getXP();
  for (let i = XP_LEVELS.length - 1; i >= 0; i--) {
    if (x >= XP_LEVELS[i].min) {
      const lvl = XP_LEVELS[i];
      const next = XP_LEVELS[i + 1];
      const pct = next
        ? Math.round(((x - lvl.min) / (next.min - lvl.min)) * 100)
        : 100;
      return { label: lvl.label, xp: x, pct, nextMin: next?.min ?? null };
    }
  }
  return { label: "A1", xp: x, pct: 0, nextMin: 100 };
}

// ── Streak ────────────────────────────────────────────────────────────────────
function getDays() {
  try { return JSON.parse(localStorage.getItem("activeDays") || "[]"); }
  catch { return []; }
}

export function recordActivity() {
  const today = TODAY();
  const days = getDays();
  if (!days.includes(today)) {
    days.push(today);
    localStorage.setItem("activeDays", JSON.stringify(days.slice(-365)));
  }
}

export function getStreak() {
  const days = getDays().sort();
  if (!days.length) return 0;
  const today = TODAY();
  const last = days[days.length - 1];
  if (dayDiff(today, last) > 1) return 0;
  let streak = 1;
  for (let i = days.length - 2; i >= 0; i--) {
    if (dayDiff(days[i + 1], days[i]) === 1) streak++;
    else break;
  }
  return streak;
}

// ── Messages ──────────────────────────────────────────────────────────────────
export function getMsgCount() {
  try { return parseInt(localStorage.getItem("totalMsgSent") || "0", 10); } catch { return 0; }
}

export function recordMsg() {
  localStorage.setItem("totalMsgSent", String(getMsgCount() + 1));
  addXP(XP_REWARDS.msg);
}

// ── Vocab ─────────────────────────────────────────────────────────────────────
export function getVocabCount() {
  try {
    return JSON.parse(localStorage.getItem("vocab_cache") || "[]").length;
  } catch { return 0; }
}

export function recordWordSave() {
  addXP(XP_REWARDS.word);
}

// ── Grammar ───────────────────────────────────────────────────────────────────
export function recordLesson() {
  addXP(XP_REWARDS.lesson);
}

// ── Util ──────────────────────────────────────────────────────────────────────
function dayDiff(laterStr, earlierStr) {
  return Math.round((new Date(laterStr) - new Date(earlierStr)) / 86400000);
}
