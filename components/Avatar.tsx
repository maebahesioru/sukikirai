const GRADIENTS = [
  ["#f91880", "#8b5cf6"],
  ["#1d9bf0", "#8b5cf6"],
  ["#00ba7c", "#1d9bf0"],
  ["#f59e0b", "#f91880"],
  ["#8b5cf6", "#f91880"],
];

function pickGradient(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}

export default function Avatar({
  name,
  avatarUrl,
  size = 48,
  className = "",
}: {
  name: string;
  avatarUrl?: string | null;
  size?: number;
  className?: string;
}) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        referrerPolicy="no-referrer"
        className={`rounded-full object-cover border border-line bg-panel2 shrink-0 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  const ch = name?.trim()?.charAt(0) ?? "?";
  const [a, b] = pickGradient(name ?? "");
  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold text-white shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(12, size * 0.42),
        background: `linear-gradient(135deg, ${a}, ${b})`,
      }}
    >
      {ch}
    </div>
  );
}
