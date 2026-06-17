import { useState } from "react";

export default function Avatar({ contact, size = 50 }) {
  const [imgError, setImgError] = useState(false);
  const [g1, g2] = contact.gradient || [contact.color, contact.color];

  if (contact.photo && !imgError) {
    return (
      <img
        src={contact.photo}
        alt={contact.name}
        onError={() => setImgError(true)}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 select-none"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${g1}, ${g2})`,
      }}
    >
      <span className="text-white font-bold" style={{ fontSize: size * 0.34 }}>
        {contact.initials}
      </span>
    </div>
  );
}
