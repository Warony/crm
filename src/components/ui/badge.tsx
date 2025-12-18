import React from "react";
import { cn } from "./utils";

type Variant = "default" | "secondary" | "outline" | "destructive";

const variantStyles: Record<Variant, string> = {
  default: "bg-black text-white",
  secondary: "bg-slate-100 text-slate-900",
  outline: "border border-slate-200 text-slate-900",
  destructive: "bg-red-600 text-white",
};

export function Badge({ className, variant = "default", ...props }: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}
