import { cn } from "../../utils/cn";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
  onClick?: () => void;
}

export function Card({ children, className, padding = true, onClick }: CardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-gray-100 shadow-sm",
        padding && "p-5",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between mb-4", className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={cn("text-sm font-semibold text-gray-700", className)}>
      {children}
    </h3>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: { value: string; positive?: boolean };
  className?: string;
}

export function StatCard({ title, value, icon, trend, className }: StatCardProps) {
  return (
    <Card className={cn("", className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
          {trend && (
            <p className={`text-xs mt-1 ${trend.positive ? "text-emerald-600" : "text-gray-500"}`}>
              {trend.value}
            </p>
          )}
        </div>
        {icon && (
          <div className="w-9 h-9 rounded-lg bg-cyan-50 flex items-center justify-center text-cyan-600">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
