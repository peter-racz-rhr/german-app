export default function WordPopover({ word, info, loading, onClose }) {
  if (!word) return null;
  return (
    <div
      className="absolute inset-0 z-40 flex items-end justify-center bg-black/20"
      onClick={onClose}
    >
      <div
        className="w-full bg-white rounded-t-[20px] p-5 pb-7 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1.5 bg-[var(--line)] rounded-full mx-auto mb-4" />
        <p className="text-[17px] font-medium mb-1">{word}</p>
        {loading ? (
          <p className="text-[14px] text-[var(--ink-faint)]">Lade…</p>
        ) : (
          <>
            <p className="text-[14px] text-[var(--ink-soft)] mb-2">{info?.translation}</p>
            {info?.note && (
              <p className="text-[13px] text-[var(--ink-faint)]">{info.note}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
