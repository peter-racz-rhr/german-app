import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchVocab, deleteVocabWord } from "../lib/api";

export default function Vocab() {
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVocab()
      .then((v) => setWords(v || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(word) {
    setWords((cur) => cur.filter((w) => w.word !== word));
    await deleteVocabWord(word).catch(() => {});
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-[max(14px,env(safe-area-inset-top))] pb-3 border-b border-[var(--line)]">
        <p className="text-[28px] font-bold tracking-tight">Szótár</p>
        <p className="text-[13px] text-[var(--ink-faint)]">
          {words.length} {words.length === 1 ? "szó" : "szó"} elmentve
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <p className="text-[14px] text-[var(--ink-faint)]">Lade…</p>
          </div>
        )}

        {!loading && words.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-8 text-center">
            <div className="text-[48px]">📖</div>
            <p className="text-[16px] font-medium">Még nincs elmentett szó</p>
            <p className="text-[14px] text-[var(--ink-faint)]">
              A chat oldalon koppints egy szóra, majd mentsd el ide.
            </p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {words.map((entry, i) => (
            <motion.div
              key={entry.word}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 60, transition: { duration: 0.18 } }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--line)]"
            >
              <div className="flex-1 min-w-0">
                <p className="text-[16px] font-medium">{entry.word}</p>
                <p className="text-[13px] text-[var(--ink-soft)]">{entry.translation}</p>
                {entry.note && (
                  <p className="text-[12px] text-[var(--ink-faint)]">{entry.note}</p>
                )}
              </div>
              <button
                onClick={() => handleDelete(entry.word)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--ink-faint)] active:bg-[var(--surface)]"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                </svg>
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
