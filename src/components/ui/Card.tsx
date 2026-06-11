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
      "rounded-[var(--radius-shell)] p-1.5 ring-1 ring-black/[0.04]";

    const innerVariants = {
      default: "bg-white",
      accent: "bg-primary text-white",
      muted: "bg-muted",
    };

    const hoverStyles = hoverEffect
      ? "transition-all duration-500 ease-premium hover:-translate-y-1 hover:shadow-brand-hover"
      : "";

    return (
      <div className={`${shellStyles} shadow-brand ${hoverStyles} ${className}`} ref={ref}>
        <div
          className={`rounded-[var(--radius-inner)] p-6 lg:p-8 ${innerVariants[variant]}`}
          {...props}
        >
          {children}
        </div>
      </div>
    );
  }
);

Card.displayName = "Card";
