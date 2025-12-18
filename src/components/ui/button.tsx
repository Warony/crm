import React from "react";
import { cn } from "./utils";

type Variant = "default" | "outline" | "secondary";
type Size = "default" | "icon" | "sm" | "lg";

const variantStyles: Record<Variant, string> = {
  default: "bg-black text-white hover:bg-black/90",
  outline: "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50",
  secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
};

const sizeStyles: Record<Size, string> = {
  default: "h-10 px-4 py-2",
  sm: "h-9 px-3",
  lg: "h-11 px-5",
  icon: "h-10 w-10 items-center justify-center p-0",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center gap-2 rounded-lg text-sm font-medium transition focus:outline-none",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
