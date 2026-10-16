import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-indigo-brand/10 bg-white p-6 card-shadow",
        className
      )}
      {...props}
    />
  );
}
