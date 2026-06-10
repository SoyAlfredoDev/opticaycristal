import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean;
  variant?: "default" | "accent" | "muted";
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className = "",
      hoverEffect = false,
      variant = "default",
      children,
      ...props
    },
    ref
  ) => {
    const shellStyles =
      "rounded-[var(--radius-shell)] p-1.5 ring-1 ring-black/[0.04] dark:ring-white/[0.06]";

    const innerVariants = {
      default: "bg-surface",
      accent: "bg-primary text-surface",
      muted: "bg-muted",
    };

    const hoverStyles = hoverEffect
      ? "transition-transform duration-500 ease-premium hover:-translate-y-1"
      : "";

    return (
      <div className={`${shellStyles} ${hoverStyles} ${className}`} ref={ref}>
        <div
          className={`rounded-[var(--radius-inner)] p-6 lg:p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] shadow-brand ${innerVariants[variant]}`}
          {...props}
        >
          {children}
        </div>
      </div>
    );
  }
);

Card.displayName = "Card";
