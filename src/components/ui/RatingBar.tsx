interface RatingBarProps {
  rating: number;
  max?: number;
  size?: "sm" | "md";
  showLabel?: boolean;
}

const colors = ["", "bg-red-400", "bg-orange-400", "bg-yellow-400", "bg-cyan-400", "bg-emerald-500"];

export function RatingBar({ rating, max = 5, size = "sm", showLabel = false }: RatingBarProps) {
  const pct = (rating / max) * 100;
  const color = colors[Math.min(rating, 5)] || "bg-cyan-500";
  const height = size === "sm" ? "h-1" : "h-1.5";

  return (
    <div className="flex items-center gap-1.5">
      <div className={`flex-1 ${height} rounded-full bg-gray-100 overflow-hidden`}>
        <div
          className={`${height} rounded-full ${color} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && <span className="text-xs text-gray-500 w-5 text-right">{rating}/{max}</span>}
    </div>
  );
}

export function StarRating({ value, onChange, max = 5, readonly = false }: {
  value: number;
  onChange?: (v: number) => void;
  max?: number;
  readonly?: boolean;
}) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <button
          key={i}
          type="button"
          disabled={readonly}
          onClick={() => !readonly && onChange?.(i + 1)}
          className={`w-4 h-4 rounded-sm transition-colors ${
            i < value ? "text-cyan-500" : "text-gray-200"
          } ${!readonly ? "hover:text-cyan-400 cursor-pointer" : "cursor-default"}`}
        >
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
    </div>
  );
}
