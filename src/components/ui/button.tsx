import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-brand/60 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "brand-gradient text-white shadow-lg shadow-indigo-brand/25 hover:shadow-xl hover:shadow-indigo-brand/30 hover:-translate-y-0.5",
        outline:
          "border border-indigo-brand/25 text-indigo-brand bg-white/60 hover:bg-white hover:border-indigo-brand/40",
        ghost: "text-indigo-brand hover:bg-lavender",
        white: "bg-white text-indigo-brand hover:bg-lavender shadow-lg",
      },
      size: {
        sm: "h-9 px-4",
        md: "h-11 px-6",
        lg: "h-13 px-8 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
