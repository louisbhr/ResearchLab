import { cn } from "../../utils/cn";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "unread" | "in-progress" | "read" | "type" | "tag" | "project" | "source";
  className?: string;
}

const variantStyles: Record<string, string> = {
  default: "bg-gray-100 text-gray-600",
  unread: "bg-gray-100 text-gray-600",
  "in-progress": "bg-blue-50 text-blue-700",
  read: "bg-emerald-50 text-emerald-700",
  type: "bg-violet-50 text-violet-700",
  tag: "bg-cyan-50 text-cyan-700",
  project: "bg-amber-50 text-amber-700",
  source: "bg-sky-50 text-sky-700",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium",
      variantStyles[variant] || variantStyles.default,
      className
    )}>
      {children}
    </span>
  );
}

export function ReadingStatusBadge({ status }: { status: string }) {
  const variant = status === "Read" ? "read"
    : status === "In Progress" ? "in-progress"
    : "unread";
  return <Badge variant={variant}>{status}</Badge>;
}

export function PaperTypeBadge({ type }: { type?: string }) {
  if (!type) return null;
  return <Badge variant="type">{type}</Badge>;
}
