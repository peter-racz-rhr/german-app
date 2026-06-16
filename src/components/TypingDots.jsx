export default function TypingDots() {
  return (
    <div className="flex justify-start">
      <div className="bg-[var(--bubble-them)] rounded-[18px] rounded-bl-[5px] px-4 py-3 flex gap-1 items-center">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-[var(--ink-faint)] animate-bounce"
            style={{ animationDelay: `${i * 0.12}s` }}
          />
        ))}
      </div>
    </div>
  );
}
