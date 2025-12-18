import React from "react";
import { cn } from "./utils";

interface SelectContextValue {
  value?: string;
  setValue: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SelectContext = React.createContext<SelectContextValue | null>(null);

interface SelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

export function Select({ value, defaultValue, onValueChange, children }: SelectProps) {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const [open, setOpen] = React.useState(false);

  const setValue = (next: string) => {
    if (isControlled) {
      onValueChange?.(next);
    } else {
      setInternalValue(next);
      onValueChange?.(next);
    }
    setOpen(false);
  };

  return (
    <SelectContext.Provider value={{ value: isControlled ? value : internalValue, setValue, open, setOpen }}>
      {children}
    </SelectContext.Provider>
  );
}

export function SelectTrigger({ className, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const ctx = React.useContext(SelectContext);
  if (!ctx) return null;
  return (
    <button
      type="button"
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 text-sm",
        className
      )}
      onClick={() => ctx.setOpen(!ctx.open)}
      {...props}
    >
      <div className="flex flex-1 items-center gap-2 text-left">{children}</div>
      <span className="text-xs text-slate-500">▾</span>
    </button>
  );
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const ctx = React.useContext(SelectContext);
  if (!ctx) return null;
  return <span className="truncate text-sm">{ctx.value || placeholder}</span>;
}

export function SelectContent({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  const ctx = React.useContext(SelectContext);
  if (!ctx || !ctx.open) return null;
  return (
    <div className={cn("relative mt-1 w-full", className)}>
      <div className="absolute z-50 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
        {children}
      </div>
    </div>
  );
}

export function SelectItem({ className, value, children }: { value: string; className?: string; children: React.ReactNode }) {
  const ctx = React.useContext(SelectContext);
  if (!ctx) return null;
  const active = ctx.value === value;
  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-100",
        active && "bg-slate-100 font-semibold",
        className
      )}
      onClick={() => ctx.setValue(value)}
    >
      <span className="truncate">{children}</span>
      {active ? <span className="text-xs text-slate-500">✓</span> : null}
    </button>
  );
}
