import React from "react";
import { cn } from "./utils";

export function Separator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("h-px w-full bg-slate-200", className)} {...props} />;
}
