import { NavLink } from "react-router-dom";

const TABS = [
  { to: "/chat", label: "Chat", icon: ChatIcon },
  { to: "/vocab", label: "Vocab", icon: VocabIcon },
  { to: "/grammar", label: "Grammar", icon: GrammarIcon },
];

export default function BottomNav() {
  return (
    <nav className="flex items-stretch border-t border-[var(--line)] bg-white/95 backdrop-blur pb-[max(8px,env(safe-area-inset-bottom))]">
      {TABS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center gap-1 pt-2 pb-1 text-[11px] ${
              isActive ? "text-[var(--accent)]" : "text-[var(--ink-faint)]"
            }`
          }
        >
          <Icon />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

function ChatIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M21 12c0 4.418-4.03 8-9 8a9.7 9.7 0 0 1-3.16-.52L3 21l1.6-3.84A8.06 8.06 0 0 1 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8Z" strokeLinejoin="round" />
    </svg>
  );
}

function VocabIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M4 19.5V5a2 2 0 0 1 2-2h12.5v15H6a2 2 0 0 0 0 4h13" strokeLinejoin="round" />
      <path d="M8 6.5h7" strokeLinecap="round" />
    </svg>
  );
}

function GrammarIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M4 6h16M4 12h10M4 18h13" strokeLinecap="round" />
      <circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}
