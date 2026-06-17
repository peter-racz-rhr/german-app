import { NavLink, useLocation } from "react-router-dom";

const TABS = [
  { to: "/contacts", label: "Chat", icon: ChatIcon, match: ["/contacts", "/chat"] },
  { to: "/vocab", label: "Vocab", icon: VocabIcon, match: ["/vocab"] },
  { to: "/grammar", label: "Grammatik", icon: GrammarIcon, match: ["/grammar"] },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="flex items-stretch border-t border-[var(--line)] bg-white/95 backdrop-blur pb-[max(8px,env(safe-area-inset-bottom))]">
      {TABS.map(({ to, label, icon: Icon, match }) => {
        const isActive = match.some((m) => location.pathname.startsWith(m));
        return (
          <NavLink
            key={to}
            to={to}
            className={`flex-1 flex flex-col items-center gap-1 pt-2 pb-1 text-[11px] ${
              isActive ? "text-[var(--accent)]" : "text-[var(--ink-faint)]"
            }`}
          >
            <Icon active={isActive} />
            {label}
          </NavLink>
        );
      })}
    </nav>
  );
}

function ChatIcon({ active }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7">
      <path d="M21 12c0 4.418-4.03 8-9 8a9.7 9.7 0 0 1-3.16-.52L3 21l1.6-3.84A8.06 8.06 0 0 1 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8Z" strokeLinejoin="round" />
    </svg>
  );
}

function VocabIcon({ active }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M4 19.5V5a2 2 0 0 1 2-2h12.5v15H6a2 2 0 0 0 0 4h13" strokeLinejoin="round" />
      {active && <path d="M8 6.5h7M8 10h5" strokeLinecap="round" />}
      {!active && <path d="M8 6.5h7" strokeLinecap="round" />}
    </svg>
  );
}

function GrammarIcon({ active }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M4 6h16M4 12h10M4 18h13" strokeLinecap="round" />
      <circle cx="19" cy="12" r="1.4" fill={active ? "currentColor" : "none"} stroke={active ? "none" : "currentColor"} strokeWidth="1.4" />
    </svg>
  );
}
