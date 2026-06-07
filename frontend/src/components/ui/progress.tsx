import { cn } from "@/lib/utils";

type ProgressProps = {
  value: number;
  className?: string;
};

export function Progress({ value, className }: ProgressProps) {
  return (
    <div className={cn("h-7 rounded-full border border-stone-950 bg-[#f4e4cf] p-1", className)}>
      <div
        className="h-full rounded-full bg-[#d9ff65] transition-[width] duration-300"
        style={{ width: `${Math.max(0, Math.min(value, 100))}%` }}
      />
    </div>
  );
}
