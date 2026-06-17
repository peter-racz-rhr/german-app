import { motion, AnimatePresence } from "framer-motion";

export default function WordPopover({ word, info, loading, onClose, onSave }) {
  return (
    <AnimatePresence>
      {word && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-40 flex items-end justify-center bg-black/25"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="w-full bg-white rounded-t-[24px] p-5 pb-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-[var(--line)] rounded-full mx-auto mb-4" />
            <p className="text-[20px] font-semibold mb-1">{word}</p>
            {loading ? (
              <p className="text-[14px] text-[var(--ink-faint)]">Lade…</p>
            ) : (
              <>
                <p className="text-[15px] text-[var(--ink-soft)] mb-1">{info?.translation}</p>
                {info?.note && (
                  <p className="text-[13px] text-[var(--ink-faint)] mb-4">{info.note}</p>
                )}
                <button
                  onClick={onSave}
                  className="mt-3 w-full py-3 rounded-[14px] bg-[var(--accent)] text-white text-[15px] font-medium active:opacity-80"
                >
                  Szótárba mentés
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
