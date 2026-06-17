export default function Avatar({ contact, size = 50, showEmoji = true }) {
  const [g1, g2] = contact.gradient || [contact.color, contact.color];
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 select-none"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${g1}, ${g2})`,
        fontSize: size * 0.42,
      }}
    >
      {showEmoji ? contact.emoji : (
        <span className="text-white font-bold" style={{ fontSize: size * 0.34 }}>
          {contact.initials}
        </span>
      )}
    </div>
  );
}
