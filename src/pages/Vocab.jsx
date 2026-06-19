import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchVocab, deleteVocabWord, lookupWord, saveVocabWord } from "../lib/api";

// SRS intervals in ms: first review after 1 day, then 3d, 7d, 14d, 30d
const SRS_INTERVALS = [86400000, 259200000, 604800000, 1209600000, 2592000000];

function isDue(entry) {
  if (!entry.addedAt) return false;
  const lvl = entry.srsLevel || 0;
  const lastReview = entry.lastReview || entry.addedAt;
  const interval = SRS_INTERVALS[Math.min(lvl, SRS_INTERVALS.length - 1)];
  return Date.now() - lastReview >= interval;
}

function DictResult({ result, word, onSave, saved }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mt-3 bg-white rounded-[16px] border border-[var(--line)] overflow-hidden shadow-sm"
    >
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <span className="text-[22px] font-bold text-[#1c1c1e]">{word}</span>
            {result.article && result.article !== "—" && (
              <span className="ml-2 text-[15px] text-[var(--ink-faint)]">{result.article}</span>
            )}
          </div>
          <button
            onClick={onSave}
            className={`flex-shrink-0 mt-1 px-3 py-1 rounded-full text-[13px] font-medium border transition-colors ${
              saved
                ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                : "border-[var(--accent)] text-[var(--accent)]"
            }`}
          >
            {saved ? "Mentve ✓" : "Mentés"}
          </button>
        </div>
        <p className="text-[17px] text-[#1c1c1e] font-medium mb-3">{result.translation}</p>
        <div className="flex flex-col gap-2">
          {result.plural && result.plural !== "—" && (
            <div className="flex gap-2">
              <span className="text-[12px] font-semibold text-[var(--ink-faint)] w-20 flex-shrink-0 pt-0.5">Többes</span>
              <span className="text-[14px] text-[#1c1c1e]">{result.plural}</span>
            </div>
          )}
          {result.forms && result.forms !== "—" && (
            <div className="flex gap-2">
              <span className="text-[12px] font-semibold text-[var(--ink-faint)] w-20 flex-shrink-0 pt-0.5">Alakok</span>
              <span className="text-[14px] text-[#1c1c1e]">{result.forms}</span>
            </div>
          )}
        </div>
      </div>
      {result.example && (
        <div className="bg-[var(--surface)] px-4 py-3 border-t border-[var(--line)]">
          <p className="text-[14px] text-[#1c1c1e] italic mb-0.5">„{result.example}"</p>
          <p className="text-[13px] text-[var(--ink-faint)]">{result.exampleHu}</p>
        </div>
      )}
    </motion.div>
  );
}

function Flashcard({ entry, onKnow, onHard }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="flex flex-col items-center px-6 py-4 h-full">
      <div
        className="w-full flex-1 flex flex-col items-center justify-center bg-white border border-[var(--line)] rounded-[24px] cursor-pointer active:scale-[0.98] transition-transform select-none"
        onClick={() => setFlipped((f) => !f)}
        style={{ minHeight: 220 }}
      >
        <AnimatePresence mode="wait">
          {!flipped ? (
            <motion.div
              key="front"
              initial={{ opacity: 0, rotateY: -90 }}
              animate={{ opacity: 1, rotateY: 0 }}
              exit={{ opacity: 0, rotateY: 90 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center gap-3 px-6 text-center"
            >
              <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--ink-faint)]">Deutsch</span>
              <p className="text-[32px] font-bold text-[#1c1c1e]">{entry.word}</p>
              {entry.note && <p className="text-[14px] text-[var(--ink-faint)]">{entry.note}</p>}
              <p className="text-[13px] text-[var(--accent)] mt-2">Koppints a fordításhoz</p>
            </motion.div>
          ) : (
            <motion.div
              key="back"
              initial={{ opacity: 0, rotateY: -90 }}
              animate={{ opacity: 1, rotateY: 0 }}
              exit={{ opacity: 0, rotateY: 90 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center gap-3 px-6 text-center"
            >
              <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--ink-faint)]">Magyar</span>
              <p className="text-[28px] font-bold text-[#1c1c1e]">{entry.translation}</p>
              <p className="text-[15px] text-[var(--ink-soft)] mt-1">{entry.word}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {flipped && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-3 w-full mt-4"
        >
          <button
            onClick={onHard}
            className="flex-1 py-3 rounded-[14px] border border-[#ff3b30] text-[#ff3b30] text-[16px] font-semibold active:bg-red-50"
          >
            Nehéz 😅
          </button>
          <button
            onClick={onKnow}
            className="flex-1 py-3 rounded-[14px] bg-[var(--green)] text-white text-[16px] font-semibold active:opacity-80"
          >
            Tudom ✓
          </button>
        </motion.div>
      )}

      {!flipped && <div className="h-[60px] mt-4" />}
    </div>
  );
}

function PracticeMode({ words, onFinish }) {
  const due = words.filter(isDue);
  const queue = due.length > 0 ? due : words.slice(0, Math.min(words.length, 10));
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState([]);

  if (words.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
        <div className="text-[48px]">📖</div>
        <p className="text-[16px] font-medium">Még nincs elmentett szó</p>
        <p className="text-[14px] text-[var(--ink-faint)]">Ments el szavakat a chatből, majd itt gyakorolhatod.</p>
        <button onClick={onFinish} className="mt-2 text-[var(--accent)] text-[15px]">Vissza</button>
      </div>
    );
  }

  if (idx >= queue.length) {
    const knew = results.filter(Boolean).length;
    const total = results.length;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center"
      >
        <div className="text-[56px]">{knew === total ? "🎉" : "💪"}</div>
        <p className="text-[22px] font-bold text-[#1c1c1e]">Kész!</p>
        <p className="text-[16px] text-[var(--ink-soft)]">
          {knew}/{total} szót tudtál
        </p>
        <div className="w-full bg-[var(--surface)] rounded-full h-2 mt-1">
          <div
            className="bg-[var(--green)] h-2 rounded-full transition-all"
            style={{ width: `${(knew / total) * 100}%` }}
          />
        </div>
        <button
          onClick={onFinish}
          className="mt-4 w-full py-3 rounded-[14px] bg-[var(--accent)] text-white text-[16px] font-semibold"
        >
          Vissza a szótárhoz
        </button>
      </motion.div>
    );
  }

  function handleResult(knew) {
    // update srsLevel in localStorage
    const cacheRaw = localStorage.getItem("vocab_cache");
    if (cacheRaw) {
      try {
        const cache = JSON.parse(cacheRaw);
        const updated = cache.map((w) => {
          if (w.word !== queue[idx].word) return w;
          const lvl = w.srsLevel || 0;
          return { ...w, srsLevel: knew ? Math.min(lvl + 1, SRS_INTERVALS.length - 1) : Math.max(0, lvl - 1), lastReview: Date.now() };
        });
        localStorage.setItem("vocab_cache", JSON.stringify(updated));
      } catch {}
    }
    setResults((r) => [...r, knew]);
    setIdx((i) => i + 1);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Progress bar */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[12px] text-[var(--ink-faint)]">{idx + 1} / {queue.length}</span>
          <span className="text-[12px] text-[var(--ink-faint)]">
            {due.length > 0 ? `${due.length} esedékes ismétlés` : "gyors áttekintés"}
          </span>
        </div>
        <div className="w-full bg-[var(--surface)] rounded-full h-1.5">
          <motion.div
            className="bg-[var(--accent)] h-1.5 rounded-full"
            animate={{ width: `${(idx / queue.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.18 }}
          className="flex-1"
        >
          <Flashcard
            entry={queue[idx]}
            onKnow={() => handleResult(true)}
            onHard={() => handleResult(false)}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default function Vocab({ profile }) {
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [dictResult, setDictResult] = useState(null);
  const [dictLoading, setDictLoading] = useState(false);
  const [savedFromDict, setSavedFromDict] = useState(false);
  const [tab, setTab] = useState("list"); // "list" | "practice"
  const searchTimeout = useRef(null);

  useEffect(() => {
    const cached = localStorage.getItem("vocab_cache");
    if (cached) try { setWords(JSON.parse(cached)); } catch {}
    fetchVocab()
      .then((v) => {
        const list = v || [];
        setWords(list);
        localStorage.setItem("vocab_cache", JSON.stringify(list));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleQueryChange(val) {
    setQuery(val);
    setSavedFromDict(false);
    clearTimeout(searchTimeout.current);
    if (!val.trim()) { setDictResult(null); return; }
    searchTimeout.current = setTimeout(() => runLookup(val.trim()), 600);
  }

  async function runLookup(word) {
    setDictLoading(true);
    setDictResult(null);
    try {
      const result = await lookupWord({ word, level: profile?.level });
      setDictResult(result);
    } catch {
      setDictResult({ translation: "Nem található.", article: "—", plural: "—", forms: "", example: "", exampleHu: "" });
    } finally {
      setDictLoading(false);
    }
  }

  async function handleSaveFromDict() {
    if (!dictResult || !query) return;
    const note = dictResult.article !== "—" ? `${dictResult.article} · ${dictResult.plural}` : dictResult.forms;
    await saveVocabWord({ word: query, translation: dictResult.translation, note }).catch(() => {});
    const newEntry = { word: query, translation: dictResult.translation, note, addedAt: Date.now() };
    setWords((w) => [newEntry, ...w.filter(x => x.word !== query)]);
    setSavedFromDict(true);
  }

  async function handleDelete(word) {
    setWords((cur) => cur.filter((w) => w.word !== word));
    await deleteVocabWord(word).catch(() => {});
  }

  const showList = !query.trim();
  const dueCount = words.filter(isDue).length;

  if (tab === "practice") {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="flex items-center gap-3 px-4 pt-[max(14px,env(safe-area-inset-top))] pb-3 border-b border-[var(--line)]">
          <button onClick={() => setTab("list")} className="text-[var(--accent)] text-[17px]">‹ Szótár</button>
          <p className="flex-1 text-center text-[16px] font-semibold text-[#1c1c1e]">Kártyázás</p>
          <div className="w-16" />
        </div>
        <div className="flex-1 overflow-hidden">
          <PracticeMode words={words} onFinish={() => setTab("list")} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-4 pt-[max(14px,env(safe-area-inset-top))] pb-2">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[28px] font-bold tracking-tight">Szótár</p>
          {words.length > 0 && (
            <button
              onClick={() => setTab("practice")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--accent)] text-white text-[13px] font-semibold"
            >
              Gyakorlás
              {dueCount > 0 && (
                <span className="bg-white text-[var(--accent)] rounded-full text-[11px] font-bold px-1.5 py-0.5 leading-none">{dueCount}</span>
              )}
            </button>
          )}
        </div>
        {/* Search / lookup bar */}
        <div className="flex items-center gap-2 bg-[#f2f2f7] rounded-[12px] px-3 py-2.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" strokeWidth="2.2">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/>
          </svg>
          <input
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Keress egy szót (DE vagy HU)…"
            className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-[#8e8e93]"
          />
          {query && (
            <button onClick={() => { setQuery(""); setDictResult(null); }} className="text-[#8e8e93]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Dictionary mode */}
        {!showList && (
          <>
            {dictLoading && (
              <div className="flex items-center justify-center py-10">
                <p className="text-[14px] text-[var(--ink-faint)]">Keresés…</p>
              </div>
            )}
            {dictResult && (
              <DictResult
                result={dictResult}
                word={query}
                onSave={handleSaveFromDict}
                saved={savedFromDict}
              />
            )}
          </>
        )}

        {/* Saved words list */}
        {showList && (
          <>
            <div className="px-4 pt-2 pb-1 flex items-center justify-between">
              <p className="text-[12px] font-semibold text-[var(--ink-faint)] uppercase tracking-wide">
                Mentett szavak · {words.length}
              </p>
              {dueCount > 0 && (
                <p className="text-[12px] text-[#ff6b35] font-medium">{dueCount} ismétlésre vár</p>
              )}
            </div>

            {loading && (
              <div className="flex items-center justify-center py-10">
                <p className="text-[14px] text-[var(--ink-faint)]">Lade…</p>
              </div>
            )}

            {!loading && words.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3 px-8 text-center">
                <div className="text-[48px]">📖</div>
                <p className="text-[16px] font-medium">Még nincs elmentett szó</p>
                <p className="text-[14px] text-[var(--ink-faint)]">
                  Koppints egy szóra a chatben, vagy keress itt fent.
                </p>
              </div>
            )}

            <AnimatePresence initial={false}>
              {words.map((entry, i) => {
                const due = isDue(entry);
                return (
                  <motion.div
                    key={entry.word}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 60, transition: { duration: 0.15 } }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-3 px-4 py-3 border-b border-[var(--line)]"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[16px] font-semibold text-[#1c1c1e]">{entry.word}</p>
                        {due && (
                          <span className="text-[10px] font-bold text-[#ff6b35] bg-orange-50 px-1.5 py-0.5 rounded-full leading-none">ismétlés</span>
                        )}
                      </div>
                      <p className="text-[14px] text-[var(--ink-soft)]">{entry.translation}</p>
                      {entry.note && (
                        <p className="text-[12px] text-[var(--ink-faint)]">{entry.note}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(entry.word)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--ink-faint)] active:bg-[var(--surface)]"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}
