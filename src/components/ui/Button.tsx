import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  href?: string;
  as?: React.ElementType;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "md", href, as, children, ...props }, ref) => {
    
    // Base styles
    const baseStyles = "inline-flex items-center justify-center font-semibold rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
    
    // Size variants
    const sizeStyles = {
      sm: "px-4 py-2 text-sm",
      md: "px-6 py-3 text-base",
      lg: "px-8 py-4 text-lg",
    };

    // Color variants using new design tokens
    const variantStyles = {
      primary: "bg-primary hover:bg-primary-hover text-surface shadow-md hover:shadow-lg",
      secondary: "bg-primary-soft text-primary hover:bg-primary-soft/80",
      outline: "border-2 border-primary text-primary hover:bg-primary-soft",
      ghost: "text-text-secondary hover:text-primary hover:bg-primary-soft",
    };

    const combinedClassName = `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`;

    // Render as anchor or other element if specified (or if href is present)
    const Component = as || (href ? "a" : "button");

    return (
      <Component
        ref={ref as any}
        href={href}
        className={combinedClassName}
        {...props as any}
      >
        {children}
      </Component>
    );
  }
);

Button.displayName = "Button";
