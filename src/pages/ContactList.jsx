import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Avatar from "../components/Avatar";
import { CONTACTS } from "../lib/contacts";
import { fetchStory } from "../lib/api";
import { getStreak, getMsgCount, getVocabCount, recordActivity, getLevelInfo } from "../lib/stats";

function StatChip({ icon, value, label, accent }) {
  return (
    <div className="flex-1 flex flex-col items-center bg-[#f2f2f7] rounded-[12px] py-2 px-1 gap-0.5">
      <span className="text-[18px] leading-none">{icon}</span>
      <span className="text-[16px] font-semibold leading-tight" style={{ color: accent }}>{value}</span>
      <span className="text-[10px] text-[#8e8e93] leading-tight text-center">{label}</span>
    </div>
  );
}

export default function ContactList() {
  const navigate = useNavigate();
  const [stories, setStories] = useState({});
  const [activeStory, setActiveStory] = useState(null);
  const [loadingStory, setLoadingStory] = useState(null);
  const [stats, setStats] = useState({ streak: 0, msgs: 0, vocab: 0 });
  const [lvl, setLvl] = useState({ label: "A1", pct: 0, xp: 0, nextMin: 100 });

  useEffect(() => {
    recordActivity();
    setStats({ streak: getStreak(), msgs: getMsgCount(), vocab: getVocabCount() });
    setLvl(getLevelInfo());
  }, []);

  useEffect(() => {
    // check which contacts have a cached story today
    const today = new Date().toISOString().split("T")[0];
    const cached = {};
    CONTACTS.forEach((c) => {
      const key = `story:${c.id}:${today}`;
      const s = localStorage.getItem(key);
      if (s) cached[c.id] = JSON.parse(s);
    });
    setStories(cached);
  }, []);

  async function openStory(contact, e) {
    e.stopPropagation();
    if (stories[contact.id]) {
      setActiveStory({ contact, data: stories[contact.id] });
      return;
    }
    setLoadingStory(contact.id);
    try {
      const data = await fetchStory(contact.id);
      const today = new Date().toISOString().split("T")[0];
      localStorage.setItem(`story:${contact.id}:${today}`, JSON.stringify(data));
      setStories((s) => ({ ...s, [contact.id]: data }));
      setActiveStory({ contact, data });
    } finally {
      setLoadingStory(null);
    }
  }

  function replyToStory() {
    if (!activeStory) return;
    navigate(`/chat/${activeStory.contact.id}`, { state: { prefill: activeStory.data.text } });
    setActiveStory(null);
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-4 pt-[max(14px,env(safe-area-inset-top))] pb-1">
        <div className="flex items-center justify-between mb-3">
          <button className="text-[var(--accent)] text-[17px]">Szerkesztés</button>
          <p className="text-[17px] font-semibold">Üzenetek</p>
          <button className="text-[var(--accent)]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        {/* Search bar */}
        <div className="flex items-center gap-2 bg-[#f2f2f7] rounded-[12px] px-3 py-2 mb-3">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" strokeWidth="2.2">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/>
          </svg>
          <span className="text-[15px] text-[#8e8e93]">Keresés</span>
        </div>

        {/* Stats strip */}
        <div className="flex gap-2 mb-3">
          <StatChip
            icon="🔥"
            value={stats.streak}
            label="napos streak"
            accent={stats.streak > 0 ? "#ff6b35" : "#8e8e93"}
          />
          <StatChip icon="💬" value={stats.msgs} label="üzenet" accent="#0a84ff" />
          <StatChip icon="📖" value={stats.vocab} label="szó mentve" accent="#5856d6" />
        </div>

        {/* XP level bar */}
        <div className="mb-3 bg-[#f2f2f7] rounded-[12px] px-3 py-2">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] font-bold text-[var(--accent)]">{lvl.label}</span>
              <span className="text-[11px] text-[#8e8e93]">szint</span>
            </div>
            <span className="text-[11px] text-[#8e8e93]">{lvl.xp} XP{lvl.nextMin ? ` · ${lvl.nextMin - lvl.xp} a következőig` : " · Max!"}</span>
          </div>
          <div className="h-1.5 bg-[#e5e5ea] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${lvl.pct}%`, background: "linear-gradient(90deg, #0a84ff, #5856d6)" }}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Pinned contacts with story rings */}
        <div className="flex gap-4 px-4 pb-4 overflow-x-auto scrollbar-none">
          {CONTACTS.map((c) => {
            const hasStory = !!stories[c.id];
            const isLoading = loadingStory === c.id;
            return (
              <motion.button
                key={c.id}
                whileTap={{ scale: 0.93 }}
                onClick={() => navigate(`/chat/${c.id}`)}
                className="flex flex-col items-center gap-1.5 flex-shrink-0"
              >
                <div className="relative">
                  {/* Story ring */}
                  <div
                    className="rounded-full p-[2.5px]"
                    style={{
                      background: hasStory
                        ? "linear-gradient(135deg, #f093fb, #f5576c, #4facfe)"
                        : "#e5e5ea",
                      padding: hasStory ? "2.5px" : "2px",
                    }}
                    onClick={(e) => openStory(c, e)}
                  >
                    <div className="bg-white rounded-full p-[2px]">
                      <Avatar contact={c} size={60} />
                    </div>
                  </div>
                  {isLoading && (
                    <div className="absolute inset-0 rounded-full bg-black/20 flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <span className="text-[12px] text-[#1c1c1e] font-medium max-w-[70px] truncate text-center">
                  {c.name.split(" ")[0]}
                </span>
              </motion.button>
            );
          })}
        </div>

        <div className="border-t border-[var(--line)]" />

        {/* Message list */}
        {CONTACTS.map((c, i) => (
          <motion.button
            key={c.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => navigate(`/chat/${c.id}`)}
            className="w-full flex items-center gap-3 px-4 py-3 active:bg-[#f2f2f7] border-b border-[var(--line)] text-left"
          >
            <div className="relative flex-shrink-0">
              <Avatar contact={c} size={52} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between">
                <p className="text-[17px] font-semibold text-[#1c1c1e] truncate">{c.name}</p>
                <p className="text-[12px] text-[#8e8e93] ml-2 flex-shrink-0">Most</p>
              </div>
              <p className="text-[15px] text-[#8e8e93] truncate leading-snug">{c.greeting}</p>
            </div>
            <svg width="8" height="13" viewBox="0 0 8 13" fill="none" className="flex-shrink-0 text-[#c7c7cc]">
              <path d="M1 1l6 5.5L1 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </motion.button>
        ))}
      </div>

      {/* Story modal */}
      <AnimatePresence>
        {activeStory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-end bg-black/40"
            onClick={() => setActiveStory(null)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 320 }}
              className="w-full bg-white rounded-t-[24px] px-5 pt-4 pb-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-[var(--line)] rounded-full mx-auto mb-5" />
              <div className="flex items-center gap-3 mb-4">
                <Avatar contact={activeStory.contact} size={44} />
                <div>
                  <p className="font-semibold text-[16px]">{activeStory.contact.name}</p>
                  <p className="text-[12px] text-[var(--ink-faint)]">Mai üzenet</p>
                </div>
              </div>
              <div className="bg-[#f2f2f7] rounded-[16px] px-4 py-3 mb-3">
                <p className="text-[16px] leading-relaxed">{activeStory.data.text}</p>
              </div>
              {activeStory.data.hint && (
                <p className="text-[13px] text-[var(--ink-faint)] mb-4 px-1">{activeStory.data.hint}</p>
              )}
              <button
                onClick={replyToStory}
                className="w-full py-3 rounded-[14px] bg-[var(--accent)] text-white text-[16px] font-semibold"
              >
                Válaszolj
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
