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
    const innerVariants = {
      default: "bg-white",
      accent: "bg-primary-mist",
      muted: "bg-muted/50",
    };

    const hoverStyles = hoverEffect ? "card-float" : "shadow-card border border-black/[0.04]";

    return (
      <div
        className={`rounded-[var(--radius-card)] ${hoverStyles} ${className}`}
        ref={ref}
      >
        <div
          className={`rounded-[var(--radius-card)] p-6 lg:p-8 ${innerVariants[variant]}`}
          {...props}
        >
          {children}
        </div>
      </div>
    );
  }
);

Card.displayName = "Card";
