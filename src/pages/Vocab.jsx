export default function Vocab() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2.5 border-b border-[var(--line)] text-center">
        <p className="text-[15px] font-medium">Vokabeln</p>
        <p className="text-[12px] text-[var(--ink-faint)]">Vocab</p>
      </div>
      <div className="flex-1 flex items-center justify-center px-8 text-center">
        <p className="text-[14px] text-[var(--ink-faint)]">
          Vocab drills land here next — flashcards with spaced repetition, picked from words you've
          tapped in chat.
        </p>
      </div>
    </div>
  );
}
