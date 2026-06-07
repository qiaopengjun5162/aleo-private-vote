import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md border border-stone-950 font-black transition disabled:pointer-events-none disabled:opacity-45",
  {
    variants: {
      variant: {
        default: "bg-stone-950 text-white shadow-[4px_4px_0_#1c1917] hover:-translate-y-0.5",
        primary: "bg-[#c8492d] text-white shadow-[4px_4px_0_#1c1917] hover:-translate-y-0.5",
        outline: "bg-white text-stone-950 hover:bg-[#d9ff65]",
        ghost: "border-transparent bg-transparent text-stone-700 hover:bg-stone-100"
      },
      size: {
        default: "h-11 px-4",
        lg: "h-14 px-6 text-base",
        sm: "h-9 px-3 text-sm"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
