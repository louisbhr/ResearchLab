import { cn } from "../../utils/cn";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
}

const variants = {
  primary: "bg-cyan-500 text-white hover:bg-cyan-600 active:bg-cyan-700 shadow-sm",
  secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300",
  ghost: "text-gray-600 hover:bg-gray-100 hover:text-gray-800",
  destructive: "bg-red-500 text-white hover:bg-red-600 active:bg-red-700",
  outline: "border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300",
};

const sizes = {
  sm: "px-2.5 py-1.5 text-xs",
  md: "px-3.5 py-2 text-sm",
  lg: "px-5 py-2.5 text-sm",
};

export function Button({
  children, variant = "primary", size = "md", loading, icon, className, disabled, ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 font-medium rounded-lg transition-colors",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : icon}
      {children}
    </button>
  );
}
