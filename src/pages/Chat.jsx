import { useEffect, useRef, useState } from "react";
import MessageBubble from "../components/MessageBubble";
import TypingDots from "../components/TypingDots";
import WordPopover from "../components/WordPopover";
import { defineWord, fetchMessages, persistMessages, sendChatMessage } from "../lib/api";

const GREETING = {
  from: "them",
  text: "Hey! Wie geht's dir heute? Was hast du heute gemacht?",
};

export default function Chat({ profile }) {
  const [messages, setMessages] = useState([GREETING]);
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [popover, setPopover] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    fetchMessages()
      .then((saved) => {
        if (saved?.length) setMessages(saved);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    persistMessages(messages).catch(() => {});
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loaded]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [busy]);

  async function handleSend() {
    const text = input.trim();
    if (!text || busy) return;
    const next = [...messages, { from: "me", text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const apiMessages = next.map((m) => ({
        role: m.from === "me" ? "user" : "assistant",
        content: m.text,
      }));
      const result = await sendChatMessage({ messages: apiMessages, level: profile?.level });
      setMessages((cur) => [
        ...cur,
        { from: "them", text: result.reply, correction: result.correction },
      ]);
    } catch (e) {
      setMessages((cur) => [
        ...cur,
        { from: "them", text: "Hmm, da ist ein Fehler passiert. Nochmal?" },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function handleWordClick(word) {
    setPopover({ word, loading: true, info: null });
    try {
      const info = await defineWord({ word, level: profile?.level });
      setPopover({ word, loading: false, info });
    } catch {
      setPopover({ word, loading: false, info: { translation: "—" } });
    }
  }

  return (
    <div className="relative flex flex-col h-full">
      <div className="flex items-center gap-2.5 px-4 pt-[max(10px,env(safe-area-inset-top))] pb-2.5 border-b border-[var(--line)]">
        <div className="w-9 h-9 rounded-full bg-[var(--accent-soft)] flex items-center justify-center text-[var(--accent)] font-medium text-[14px]">
          DE
        </div>
        <div>
          <p className="text-[15px] font-medium leading-tight">Anna</p>
          <p className="text-[11px] text-[var(--ink-faint)]">German tutor · {profile?.level || "—"}</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-2.5">
        {messages.map((m, i) => (
          <div key={i} className="flex flex-col gap-1">
            <MessageBubble from={m.from} onWordClick={m.from === "them" ? handleWordClick : undefined}>
              {m.text}
            </MessageBubble>
            {m.correction && (
              <div className="self-start max-w-[78%] text-[12.5px] text-[var(--green)] bg-[#eaf6ef] rounded-[12px] px-3 py-1.5">
                {m.correction}
              </div>
            )}
          </div>
        ))}
        {busy && <TypingDots />}
      </div>

      <div className="flex items-center gap-2 p-3 pb-[max(12px,env(safe-area-inset-bottom))] border-t border-[var(--line)]">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="iMessage"
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

      <WordPopover
        word={popover?.word}
        info={popover?.info}
        loading={popover?.loading}
        onClose={() => setPopover(null)}
      />
    </div>
  );
}
