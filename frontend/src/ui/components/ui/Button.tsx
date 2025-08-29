import React from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
type Size = "xs" | "sm" | "md" | "lg";

export function Button(
  {
    variant = "secondary",
    size = "sm",
    loading = false,
    className = "",
    children,
    disabled,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
    size?: Size;
    loading?: boolean;
  }
) {
  const base = "inline-flex items-center justify-center rounded-md border transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 disabled:opacity-60 disabled:cursor-not-allowed font-medium";
  const variants: Record<Variant, string> = {
    primary: "bg-white/15 hover:bg-white/20 border-white/25 text-white shadow-sm hover:shadow-md",
    secondary: "bg-transparent hover:bg-white/10 border-white/20 text-foreground/90 hover:text-foreground",
    ghost: "bg-transparent hover:bg-white/5 border-transparent text-foreground/70 hover:text-foreground",
    danger: "bg-red-500/20 hover:bg-red-500/30 border-red-500/40 text-red-200",
    success: "bg-green-500/20 hover:bg-green-500/30 border-green-500/40 text-green-200",
  };
  const sizes: Record<Size, string> = {
    xs: "px-2 py-1 text-xs h-7",
    sm: "px-3 py-2 text-sm h-9",
    md: "px-4 py-2.5 text-sm h-10",
    lg: "px-6 py-3 text-base h-12",
  };
  const cls = `${base} ${variants[variant]} ${sizes[size]} ${className}`.trim();
  
  return (
    <button className={cls} disabled={disabled || loading} {...props}>
      {loading && (
        <svg
          className="w-4 h-4 mr-2 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}

type ActionButtonProps = {
  action: "primary" | "secondary" | "danger";
  size?: "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type">;

export function ActionButton({ action, icon, children, ...props }: ActionButtonProps) {
  const variantMap = {
    primary: "primary" as const,
    secondary: "secondary" as const,
    danger: "danger" as const,
  };
  
  return (
    <Button variant={variantMap[action]} {...props}>
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </Button>
  );
}

