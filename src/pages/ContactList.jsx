import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { CONTACTS } from "../lib/contacts";

export default function ContactList() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-[max(14px,env(safe-area-inset-top))] pb-3 border-b border-[var(--line)]">
        <p className="text-[28px] font-bold tracking-tight">Üzenetek</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {CONTACTS.map((c, i) => (
          <motion.button
            key={c.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.25 }}
            onClick={() => navigate(`/chat/${c.id}`)}
            className="w-full flex items-center gap-3.5 px-4 py-3 active:bg-[var(--surface)] text-left border-b border-[var(--line)]"
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-[15px] flex-shrink-0"
              style={{ backgroundColor: c.color }}
            >
              {c.initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[16px] font-semibold truncate">{c.name}</p>
              </div>
              <p className="text-[13px] text-[var(--ink-faint)] truncate">{c.subtitle}</p>
            </div>
            <svg width="8" height="14" viewBox="0 0 8 14" fill="none" className="text-[var(--ink-faint)] flex-shrink-0">
              <path d="M1 1l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
