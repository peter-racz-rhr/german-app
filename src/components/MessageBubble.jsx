export default function MessageBubble({ from, children, onWordClick }) {
  const isMe = from === "me";
  const text = typeof children === "string" ? children : null;

  return (
    <div className={`flex w-full ${isMe ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[78%] px-3.5 py-2 text-[15px] leading-snug rounded-[18px] ${
          isMe
            ? "bg-[var(--bubble-me)] text-white rounded-br-[5px]"
            : "bg-[var(--bubble-them)] text-[var(--ink)] rounded-bl-[5px]"
        }`}
      >
        {text && onWordClick
          ? text.split(/(\s+)/).map((part, i) =>
              part.trim() ? (
                <span
                  key={i}
                  onClick={() => onWordClick(part.replace(/[.,!?;:„“"']/g, ""))}
                  className="cursor-pointer hover:underline decoration-dotted"
                >
                  {part}
                </span>
              ) : (
                <span key={i}>{part}</span>
              )
            )
          : children}
      </div>
    </div>
  );
}
