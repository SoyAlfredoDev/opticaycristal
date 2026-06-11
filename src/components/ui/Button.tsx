import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  href?: string;
  as?: React.ElementType;
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = "",
      variant = "primary",
      size = "md",
      href,
      as,
      icon,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "group inline-flex items-center justify-center font-semibold rounded-full transition-all duration-300 ease-premium focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none";

    const sizeStyles = {
      sm: "px-5 py-2.5 text-sm gap-2",
      md: "px-6 py-3 text-base gap-2.5",
      lg: "px-8 py-4 text-base gap-3",
    };

    const variantStyles = {
      primary:
        "bg-primary hover:bg-primary-hover text-white shadow-brand hover:shadow-brand-hover hover:-translate-y-[1px]",
      secondary:
        "bg-brand-dark text-white hover:bg-brand-dark-elevated hover:-translate-y-[1px]",
      outline:
        "border-2 border-primary bg-white text-primary hover:bg-primary-mist hover:border-primary-hover hover:-translate-y-[1px]",
      ghost: "text-text-secondary hover:text-primary hover:bg-primary-mist/60",
    };

    const combinedClassName = `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`;

    const Component = as || (href ? "a" : "button");

    return (
      <Component
        ref={ref as React.Ref<HTMLButtonElement>}
        href={href}
        className={combinedClassName}
        {...(props as React.ComponentPropsWithoutRef<typeof Component>)}
      >
        <span className="whitespace-nowrap">{children}</span>
        {icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-px">
            {icon}
          </span>
        )}
      </Component>
    );
  }
);

Button.displayName = "Button";
