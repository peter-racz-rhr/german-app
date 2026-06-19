import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchVocab, deleteVocabWord, lookupWord, saveVocabWord } from "../lib/api";

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

export default function Vocab({ profile }) {
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [dictResult, setDictResult] = useState(null);
  const [dictLoading, setDictLoading] = useState(false);
  const [savedFromDict, setSavedFromDict] = useState(false);
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
    await saveVocabWord({ word: query, translation: dictResult.translation, note: dictResult.article !== "—" ? `${dictResult.article} · ${dictResult.plural}` : dictResult.forms }).catch(() => {});
    setWords((w) => [{ word: query, translation: dictResult.translation, note: dictResult.article !== "—" ? `${dictResult.article} · ${dictResult.plural}` : dictResult.forms, addedAt: Date.now() }, ...w.filter(x => x.word !== query)]);
    setSavedFromDict(true);
  }

  async function handleDelete(word) {
    setWords((cur) => cur.filter((w) => w.word !== word));
    await deleteVocabWord(word).catch(() => {});
  }

  const showList = !query.trim();

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-4 pt-[max(14px,env(safe-area-inset-top))] pb-2">
        <p className="text-[28px] font-bold tracking-tight mb-3">Szótár</p>
        {/* Search / lookup bar */}
        <div className="flex items-center gap-2 bg-[#f2f2f7] rounded-[12px] px-3 py-2.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" strokeWidth="2.2">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/>
          </svg>
          <input
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Keress egy német szót…"
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
            <div className="px-4 pt-2 pb-1">
              <p className="text-[12px] font-semibold text-[var(--ink-faint)] uppercase tracking-wide">
                Mentett szavak · {words.length}
              </p>
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
              {words.map((entry, i) => (
                <motion.div
                  key={entry.word}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 60, transition: { duration: 0.15 } }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3 px-4 py-3 border-b border-[var(--line)]"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[16px] font-semibold text-[#1c1c1e]">{entry.word}</p>
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
              ))}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}
