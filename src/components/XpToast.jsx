import { AnimatePresence, motion } from "framer-motion";

export default function XpToast({ amount, visible }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 0, scale: 0.8 }}
          animate={{ opacity: 1, y: -28, scale: 1 }}
          exit={{ opacity: 0, y: -52, scale: 0.9 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="pointer-events-none absolute right-4 bottom-28 z-50 flex items-center gap-1 bg-[#1c1c1e] text-white text-[13px] font-semibold px-3 py-1.5 rounded-full shadow-lg"
        >
          <span className="text-[var(--accent)]">+{amount}</span> XP
        </motion.div>
      )}
    </AnimatePresence>
  );
}
