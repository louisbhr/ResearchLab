import { cn } from "../../utils/cn";
import { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label className="text-xs font-medium text-gray-600">{label}</label>
        )}
        <input
          ref={ref}
          className={cn(
            "w-full px-3 py-2 text-sm rounded-lg border transition-colors",
            "border-gray-200 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100",
            "placeholder:text-gray-400 outline-none",
            error && "border-red-300 focus:border-red-400 focus:ring-red-100",
            className
          )}
          {...props}
        />
        {hint && !error && <p className="text-xs text-gray-400">{hint}</p>}
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label className="text-xs font-medium text-gray-600">{label}</label>
        )}
        <textarea
          ref={ref}
          className={cn(
            "w-full px-3 py-2 text-sm rounded-lg border transition-colors resize-y min-h-[80px]",
            "border-gray-200 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100",
            "placeholder:text-gray-400 outline-none",
            error && "border-red-300 focus:border-red-400 focus:ring-red-100",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, error, options, className, ...props }: SelectProps) {
  return (
    <div className="space-y-1">
      {label && <label className="text-xs font-medium text-gray-600">{label}</label>}
      <select
        className={cn(
          "w-full px-3 py-2 text-sm rounded-lg border transition-colors",
          "border-gray-200 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 outline-none",
          "bg-white",
          error && "border-red-300",
          className
        )}
        {...props}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
