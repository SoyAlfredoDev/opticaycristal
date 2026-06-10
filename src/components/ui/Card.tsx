import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = "", hoverEffect = false, children, ...props }, ref) => {
    
    const baseStyles = "bg-surface border border-border rounded-3xl p-6 lg:p-8 shadow-sm";
    const hoverStyles = hoverEffect ? "hover:border-primary-soft hover:shadow-lg transition-all" : "";

    return (
      <div 
        ref={ref} 
        className={`${baseStyles} ${hoverStyles} ${className}`} 
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";
