import * as React from "react";
import { cn } from "@/lib/utils";
import { buttonVariants, type ButtonProps } from "./button";

type Props = React.AnchorHTMLAttributes<HTMLAnchorElement> &
  Pick<ButtonProps, "variant" | "size">;

export function ButtonLink({ className, variant, size, ...props }: Props) {
  return <a className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
