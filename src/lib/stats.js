const TODAY = () => new Date().toISOString().split("T")[0];

function getDays() {
  try { return JSON.parse(localStorage.getItem("activeDays") || "[]"); }
  catch { return []; }
}

export function recordActivity() {
  const today = TODAY();
  const days = getDays();
  if (!days.includes(today)) {
    days.push(today);
    // keep last 365 days only
    const trimmed = days.slice(-365);
    localStorage.setItem("activeDays", JSON.stringify(trimmed));
  }
}

export function getStreak() {
  const days = getDays().sort();
  if (!days.length) return 0;
  const today = TODAY();
  // streak must include today or yesterday (grace: if user opens app today counts)
  const last = days[days.length - 1];
  const diffFromToday = dayDiff(today, last);
  if (diffFromToday > 1) return 0; // streak broken
  let streak = 1;
  for (let i = days.length - 2; i >= 0; i--) {
    if (dayDiff(days[i + 1], days[i]) === 1) streak++;
    else break;
  }
  return streak;
}

export function getMsgCount() {
  try { return parseInt(localStorage.getItem("totalMsgSent") || "0", 10); }
  catch { return 0; }
}

export function recordMsg() {
  const n = getMsgCount() + 1;
  localStorage.setItem("totalMsgSent", String(n));
}

export function getVocabCount() {
  try {
    const saved = JSON.parse(localStorage.getItem("vocab_cache") || "[]");
    return saved.length;
  } catch { return 0; }
}

function dayDiff(laterStr, earlierStr) {
  const a = new Date(laterStr);
  const b = new Date(earlierStr);
  return Math.round((a - b) / 86400000);
}
