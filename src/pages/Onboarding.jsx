import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import MessageBubble from "../components/MessageBubble";
import TypingDots from "../components/TypingDots";
import { assessAnswer, persistProfile } from "../lib/api";

const INTRO = {
  from: "them",
  text:
    "Hallo! Ich bin dein Deutschlehrer. Bevor wir anfangen, möchte ich dein Niveau kennenlernen — beantworte einfach ein paar Fragen, auf Deutsch wenn du kannst, sonst auf Englisch.",
};

export default function Onboarding({ onComplete }) {
  const [messages, setMessages] = useState([INTRO]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const scrollRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function handleSend() {
    const text = input.trim();
    if (!text || busy) return;
    const next = [...messages, { from: "me", text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const history = next.map((m) => ({
        role: m.from === "me" ? "user" : "assistant",
        content: m.text,
      }));
      const result = await assessAnswer({ history });
      setMessages((cur) => [...cur, { from: "them", text: result.reply }]);
      if (result.done) {
        setDone(true);
        const profile = {
          targetLanguage: "German",
          level: result.level,
          createdAt: Date.now(),
        };
        await persistProfile(profile);
        onComplete(profile);
      }
    } catch (e) {
      setMessages((cur) => [
        ...cur,
        { from: "them", text: "Entschuldigung, da ist etwas schiefgelaufen. Versuch's nochmal." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-[max(10px,env(safe-area-inset-top))] pb-2.5 border-b border-[var(--line)] text-center">
        <p className="text-[15px] font-medium">Einstufungstest</p>
        <p className="text-[12px] text-[var(--ink-faint)]">Skill check</p>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-2.5">
        {messages.map((m, i) => (
          <MessageBubble key={i} from={m.from}>
            {m.text}
          </MessageBubble>
        ))}
        {busy && <TypingDots />}
      </div>

      {done ? (
        <div className="p-3 pb-[max(12px,env(safe-area-inset-bottom))] border-t border-[var(--line)]">
          <button
            onClick={() => navigate("/chat")}
            className="w-full bg-[var(--accent)] text-white rounded-full py-3 text-[15px] font-medium"
          >
            Los geht's →
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-3 pb-[max(12px,env(safe-area-inset-bottom))] border-t border-[var(--line)]">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Antwort eingeben…"
            className="flex-1 bg-[var(--surface)] rounded-full px-4 py-2.5 text-[15px] outline-none"
            disabled={busy}
          />
          <button
            onClick={handleSend}
            disabled={busy || !input.trim()}
            className="w-9 h-9 flex-shrink-0 rounded-full bg-[var(--accent)] text-white flex items-center justify-center disabled:opacity-40"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
