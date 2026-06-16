export default function Grammar() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2.5 border-b border-[var(--line)] text-center">
        <p className="text-[15px] font-medium">Grammatik</p>
        <p className="text-[12px] text-[var(--ink-faint)]">Grammar</p>
      </div>
      <div className="flex-1 flex items-center justify-center px-8 text-center">
        <p className="text-[14px] text-[var(--ink-faint)]">
          Grammar lessons land here next — short explanations plus targeted drills on the patterns you
          keep getting wrong in chat.
        </p>
      </div>
    </div>
  );
}
