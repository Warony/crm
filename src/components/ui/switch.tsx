import React from "react";
import { cn } from "./utils";

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export function Switch({ className, checked = false, onCheckedChange, disabled, ...props }: SwitchProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onCheckedChange?.(e.target.checked);
  };

  return (
    <label className={cn("inline-flex cursor-pointer items-center", disabled && "cursor-not-allowed opacity-60", className)}>
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
        {...props}
      />
      <span
        className={cn(
          "relative inline-block h-5 w-9 rounded-full bg-slate-300 transition",
          checked && "bg-black"
        )}
      >
        <span
          className={cn(
            "absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition",
            checked && "translate-x-4"
          )}
        />
      </span>
    </label>
  );
}
