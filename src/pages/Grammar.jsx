import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchGrammarLesson } from "../lib/api";

const TOPICS = [
  { level: "A1", color: "#34c759", items: ["Begrüßungen", "Zahlen 1–100", "Artikel (der/die/das)", "Ja/Nein Fragen"] },
  { level: "A2", color: "#0a84ff", items: ["Präsens Konjugation", "Modalverben (können, müssen)", "Akkusativ", "Zeitausdrücke"] },
  { level: "B1", color: "#ff9500", items: ["Perfekt", "Dativ", "Weil & Dass Sätze", "Trennbare Verben"] },
  { level: "B2", color: "#ff3b30", items: ["Konjunktiv II", "Passiv", "Genitiv", "Idiomatische Ausdrücke"] },
];

export default function Grammar({ profile }) {
  const [lesson, setLesson] = useState(null);
  const [activeTopic, setActiveTopic] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);

  async function openLesson(topic) {
    setActiveTopic(topic);
    setLesson(null);
    setShowAnswer(false);
    setLoading(true);
    try {
      const data = await fetchGrammarLesson({ topic, level: profile?.level });
      setLesson(data);
    } catch {
      setLesson({ explanation: "Fehler beim Laden. Bitte nochmal versuchen.", examples: [], tip: "", exercise: "", answer: "" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-[max(14px,env(safe-area-inset-top))] pb-3 border-b border-[var(--line)]">
        <p className="text-[28px] font-bold tracking-tight">Grammatik</p>
        <p className="text-[13px] text-[var(--ink-faint)]">Wähle ein Thema</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-5">
        {TOPICS.map((group) => (
          <div key={group.level}>
            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: group.color }}
              >
                {group.level}
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              {group.items.map((topic) => (
                <motion.button
                  key={topic}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => openLesson(topic)}
                  className="text-left px-4 py-3 bg-[var(--surface)] rounded-[14px] text-[15px] flex items-center justify-between"
                >
                  <span>{topic}</span>
                  <svg width="7" height="12" viewBox="0 0 7 12" fill="none" className="text-[var(--ink-faint)]">
                    <path d="M1 1l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </motion.button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Lesson bottom sheet */}
      <AnimatePresence>
        {activeTopic && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex items-end bg-black/30"
            onClick={() => setActiveTopic(null)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="w-full bg-white rounded-t-[24px] max-h-[85vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-[var(--line)] rounded-full mx-auto mt-3 mb-1 flex-shrink-0" />
              <div className="flex items-center justify-between px-5 py-3 flex-shrink-0">
                <p className="text-[18px] font-semibold">{activeTopic}</p>
                <button onClick={() => setActiveTopic(null)} className="text-[var(--ink-faint)]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 pb-8">
                {loading && (
                  <div className="flex items-center justify-center py-12">
                    <p className="text-[14px] text-[var(--ink-faint)]">KI generiert Lektion…</p>
                  </div>
                )}

                {lesson && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4">
                    <div className="bg-[var(--accent-soft)] rounded-[14px] p-4">
                      <p className="text-[13px] font-semibold text-[var(--accent)] mb-1">Erklärung</p>
                      <p className="text-[14px] leading-relaxed">{lesson.explanation}</p>
                    </div>

                    {lesson.examples?.length > 0 && (
                      <div>
                        <p className="text-[13px] font-semibold text-[var(--ink-soft)] mb-2">Beispiele</p>
                        <div className="flex flex-col gap-2">
                          {lesson.examples.map((ex, i) => (
                            <div key={i} className="bg-[var(--surface)] rounded-[12px] px-4 py-2.5">
                              <p className="text-[14px]">{ex}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {lesson.tip && (
                      <div className="border border-[#ffcc00] bg-[#fffbe6] rounded-[14px] p-4">
                        <p className="text-[13px] font-semibold text-[#7a6000] mb-1">💡 Tipp</p>
                        <p className="text-[13px]">{lesson.tip}</p>
                      </div>
                    )}

                    {lesson.exercise && (
                      <div className="border border-[var(--line)] rounded-[14px] p-4">
                        <p className="text-[13px] font-semibold text-[var(--ink-soft)] mb-2">Übung</p>
                        <p className="text-[14px] mb-3">{lesson.exercise}</p>
                        {!showAnswer ? (
                          <button
                            onClick={() => setShowAnswer(true)}
                            className="text-[var(--accent)] text-[14px] font-medium"
                          >
                            Antwort zeigen
                          </button>
                        ) : (
                          <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-[#eaf6ef] rounded-[10px] px-3 py-2"
                          >
                            <p className="text-[13px] text-[var(--green)] font-medium">{lesson.answer}</p>
                          </motion.div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
