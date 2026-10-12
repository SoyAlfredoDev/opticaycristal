import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ComponentProps } from "react";
import styles from "./Site.module.css";

type Props = ComponentProps<typeof Link> & {
  variant?: "primary" | "outline" | "text";
  arrow?: boolean;
};

export function LinkButton({
  children,
  variant = "primary",
  arrow = false,
  className = "",
  ...props
}: Props) {
  return (
    <Link className={`${styles.button} ${styles[variant]} ${className}`} {...props}>
      <span>{children}</span>
      {arrow ? <ArrowUpRight aria-hidden="true" size={18} strokeWidth={1.6} /> : null}
    </Link>
  );
}
