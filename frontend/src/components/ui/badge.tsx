import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-none border border-stone-950 bg-[#d9ff65] px-3 py-1.5 text-xs font-black uppercase tracking-tight text-stone-950 shadow-[4px_4px_0_#1c1917]",
        className
      )}
      {...props}
    />
  );
}
