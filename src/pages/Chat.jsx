import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import MessageBubble from "../components/MessageBubble";
import TypingDots from "../components/TypingDots";
import WordPopover from "../components/WordPopover";
import { defineWord, fetchMessages, persistMessages, saveVocabWord, sendChatMessage } from "../lib/api";
import { CONTACTS } from "../lib/contacts";

export default function Chat({ profile }) {
  const { contactId } = useParams();
  const contact = CONTACTS.find((c) => c.id === contactId) || CONTACTS[0];
  const navigate = useNavigate();

  const greeting = { from: "them", text: contact.greeting };
  const [messages, setMessages] = useState([greeting]);
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [popover, setPopover] = useState(null);
  const [savedWord, setSavedWord] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    setMessages([greeting]);
    setLoaded(false);
    fetchMessages(contact.id)
      .then((saved) => {
        if (saved?.length) setMessages(saved);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [contact.id]);

  useEffect(() => {
    if (!loaded) return;
    persistMessages(contact.id, messages).catch(() => {});
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
      const result = await sendChatMessage({
        messages: apiMessages,
        level: profile?.level,
        contactId: contact.id,
      });
      setMessages((cur) => [
        ...cur,
        { from: "them", text: result.reply, correction: result.correction },
      ]);
    } catch {
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

  async function handleSaveWord() {
    if (!popover?.info) return;
    await saveVocabWord({
      word: popover.word,
      translation: popover.info.translation,
      note: popover.info.note,
    }).catch(() => {});
    setSavedWord(popover.word);
    setTimeout(() => setSavedWord(null), 2000);
    setPopover(null);
  }

  return (
    <div className="relative flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-[max(10px,env(safe-area-inset-top))] pb-2.5 border-b border-[var(--line)]">
        <button
          onClick={() => navigate("/contacts")}
          className="text-[var(--accent)] flex items-center gap-0.5 -ml-1 pr-1"
        >
          <svg width="10" height="17" viewBox="0 0 10 17" fill="none">
            <path d="M9 1L1 8.5 9 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-[13px] flex-shrink-0"
          style={{ backgroundColor: contact.color }}
        >
          {contact.initials}
        </div>
        <div>
          <p className="text-[15px] font-semibold leading-tight">{contact.name}</p>
          <p className="text-[11px] text-[var(--ink-faint)]">{contact.subtitle}</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-2">
        {messages.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-1"
          >
            <MessageBubble
              from={m.from}
              color={m.from === "them" ? contact.color : undefined}
              onWordClick={m.from === "them" ? handleWordClick : undefined}
            >
              {m.text}
            </MessageBubble>
            {m.correction && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="self-start max-w-[78%] text-[12px] text-[var(--green)] bg-[#eaf6ef] rounded-[12px] px-3 py-1.5"
              >
                ✎ {m.correction}
              </motion.div>
            )}
          </motion.div>
        ))}
        {busy && <TypingDots color={contact.color} />}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-3 py-2.5 pb-[max(12px,env(safe-area-inset-bottom))] border-t border-[var(--line)]">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 320)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="iMessage"
          className="flex-1 bg-[var(--surface)] rounded-full px-4 py-2.5 text-[15px] outline-none"
          disabled={busy}
        />
        <motion.button
          onClick={handleSend}
          disabled={busy || !input.trim()}
          whileTap={{ scale: 0.88 }}
          className="w-9 h-9 flex-shrink-0 rounded-full text-white flex items-center justify-center disabled:opacity-40"
          style={{ backgroundColor: contact.color }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
          </svg>
        </motion.button>
      </div>

      {/* Saved word toast */}
      <AnimatePresence>
        {savedWord && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-[#1c1c1e] text-white text-[13px] px-4 py-2 rounded-full shadow-lg whitespace-nowrap"
          >
            „{savedWord}" szótárba mentve ✓
          </motion.div>
        )}
      </AnimatePresence>

      <WordPopover
        word={popover?.word}
        info={popover?.info}
        loading={popover?.loading}
        onClose={() => setPopover(null)}
        onSave={handleSaveWord}
      />
    </div>
  );
}
