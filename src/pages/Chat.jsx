import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import MessageBubble from "../components/MessageBubble";
import TypingDots from "../components/TypingDots";
import WordPopover from "../components/WordPopover";
import Avatar from "../components/Avatar";
import { defineWord, fetchMessages, persistMessages, saveVocabWord, sendChatMessage } from "../lib/api";
import { CONTACTS } from "../lib/contacts";

export default function Chat({ profile }) {
  const { contactId } = useParams();
  const location = useLocation();
  const contact = CONTACTS.find((c) => c.id === contactId) || CONTACTS[0];
  const navigate = useNavigate();

  const greeting = { from: "them", text: contact.greeting };
  const [messages, setMessages] = useState([greeting]);
  const [loaded, setLoaded] = useState(false);
  const [visible, setVisible] = useState(false);
  const [input, setInput] = useState(location.state?.prefill || "");
  const [busy, setBusy] = useState(false);
  const [popover, setPopover] = useState(null);
  const [savedWord, setSavedWord] = useState(null);
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);
  const msgCountRef = useRef(0);

  useEffect(() => {
    msgCountRef.current = 0;
    setVisible(false);
    const cacheKey = `msgs:${contact.id}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed?.length) {
          setMessages(parsed);
          msgCountRef.current = parsed.length;
        }
      } catch {}
    }
    // fetch fresh silently
    setLoaded(false);
    fetchMessages(contact.id)
      .then((saved) => {
        if (saved?.length) {
          setMessages(saved);
          msgCountRef.current = saved.length;
          localStorage.setItem(cacheKey, JSON.stringify(saved));
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [contact.id]);

  // after messages render: snap to bottom instantly, then reveal
  useEffect(() => {
    if (visible) return;
    if (messages.length === 0) return;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
      setVisible(true);
    });
  }, [messages]);

  // new message added while chatting: smooth scroll
  useEffect(() => {
    if (!loaded || !visible) return;
    const cacheKey = `msgs:${contact.id}`;
    localStorage.setItem(cacheKey, JSON.stringify(messages));
    persistMessages(contact.id, messages).catch(() => {});
    if (messages.length > msgCountRef.current) {
      msgCountRef.current = messages.length;
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, loaded]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [busy]);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    };
    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, []);

  // auto-size textarea on prefill
  useEffect(() => {
    if (textareaRef.current && input) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }, [input]);

  async function handleSend() {
    const text = input.trim();
    if (!text || busy) return;
    const next = [...messages, { from: "me", text }];
    setMessages(next);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "40px";
    setBusy(true);
    try {
      const apiMessages = next.map((m) => ({
        role: m.from === "me" ? "user" : "assistant",
        content: m.text,
      }));
      const result = await sendChatMessage({ messages: apiMessages, level: profile?.level, contactId: contact.id });
      setMessages((cur) => [...cur, { from: "them", text: result.reply, correction: result.correction }]);
    } catch {
      setMessages((cur) => [...cur, { from: "them", text: "Hmm, da ist ein Fehler passiert. Nochmal?" }]);
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
    await saveVocabWord({ word: popover.word, translation: popover.info.translation, note: popover.info.note }).catch(() => {});
    setSavedWord(popover.word);
    setTimeout(() => setSavedWord(null), 2000);
    setPopover(null);
  }

  const hasText = input.trim().length > 0;

  return (
    <div className="relative flex flex-col h-full bg-white">

      {/* iMessage-style header */}
      <div className="pt-[max(10px,env(safe-area-inset-top))] border-b border-[var(--line)] bg-white">
        <div className="flex items-center px-2 pb-2">
          {/* Back */}
          <button
            onClick={() => navigate("/contacts")}
            className="flex items-center gap-0.5 text-[var(--accent)] px-2 py-1 min-w-[70px]"
          >
            <svg width="10" height="17" viewBox="0 0 10 17" fill="none">
              <path d="M9 1L1 8.5 9 16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-[17px] ml-0.5">Üzenetek</span>
          </button>

          {/* Center: avatar + name */}
          <button className="flex-1 flex flex-col items-center gap-0.5">
            <Avatar contact={contact} size={36} />
            <div className="flex items-center gap-0.5">
              <span className="text-[12px] font-semibold text-[#1c1c1e]">{contact.name}</span>
              <svg width="5" height="9" viewBox="0 0 5 9" fill="none">
                <path d="M1 1l3 3.5L1 8" stroke="#8e8e93" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </button>

          {/* Video icon */}
          <div className="min-w-[70px] flex justify-end pr-2">
            <button className="text-[var(--accent)] p-1">
              <svg width="26" height="18" viewBox="0 0 26 18" fill="none">
                <rect x="1" y="1" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.8"/>
                <path d="M17 6l8-4v14l-8-4V6z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-1 bg-white transition-opacity duration-150" style={{ opacity: visible ? 1 : 0 }}>
        {/* Contact info at top of thread */}
        <div className="flex flex-col items-center py-4 gap-2">
          <Avatar contact={contact} size={70} />
          <div className="text-center">
            <p className="text-[18px] font-semibold text-[#1c1c1e]">{contact.name}</p>
            <p className="text-[13px] text-[#8e8e93]">{contact.subtitle}</p>
          </div>
        </div>

        {messages.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.18 }}
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
                className="self-start max-w-[80%] text-[12px] text-[var(--green)] bg-[#eaf6ef] rounded-[12px] px-3 py-1.5 ml-1"
              >
                ✎ {m.correction}
              </motion.div>
            )}
          </motion.div>
        ))}

        {busy && (
          <div className="flex items-end gap-2 mt-1">
            <Avatar contact={contact} size={28} />
            <TypingDots />
          </div>
        )}
      </div>

      {/* iMessage input bar */}
      <div className="border-t border-[var(--line)] bg-white px-3 py-2 pb-[max(12px,env(safe-area-inset-bottom))]">
        <div className="flex items-end gap-2">
          {/* Left icons */}
          <div className="flex gap-1 pb-1 flex-shrink-0">
            <button className="text-[var(--accent)]">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <circle cx="14" cy="14" r="13" stroke="currentColor" strokeWidth="1.6"/>
                <path d="M9 14a5 5 0 0 0 10 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                <circle cx="11" cy="11" r="1" fill="currentColor"/>
                <circle cx="17" cy="11" r="1" fill="currentColor"/>
              </svg>
            </button>
          </div>

          {/* Text input */}
          <div className="flex-1 bg-white border border-[#c7c7cc] rounded-[20px] flex items-end px-3 py-1.5">
            <textarea
              ref={textareaRef}
              value={input}
              rows={1}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
              placeholder="iMessage"
              className="flex-1 text-[17px] outline-none resize-none overflow-hidden leading-[1.4] bg-transparent placeholder:text-[#8e8e93]"
              style={{ minHeight: "26px", maxHeight: "120px" }}
              disabled={busy}
            />
          </div>

          {/* Send / mic button */}
          <div className="pb-1 flex-shrink-0">
            <AnimatePresence mode="wait">
              {hasText ? (
                <motion.button
                  key="send"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  onClick={handleSend}
                  disabled={busy}
                  className="w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                    <path d="M12 4l8 8-8 8M4 12h16" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  </svg>
                </motion.button>
              ) : (
                <motion.button
                  key="mic"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="text-[var(--accent)]"
                >
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                    <circle cx="14" cy="14" r="13" stroke="currentColor" strokeWidth="1.6"/>
                    <rect x="11" y="7" width="6" height="10" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M8 15a6 6 0 0 0 12 0M14 21v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Saved word toast */}
      <AnimatePresence>
        {savedWord && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-28 left-1/2 -translate-x-1/2 bg-[#1c1c1e] text-white text-[13px] px-4 py-2 rounded-full shadow-lg whitespace-nowrap"
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
