import React from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "xs" | "sm" | "md";

export function Button(
  {
    variant = "secondary",
    size = "sm",
    className = "",
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }
) {
  const base = "inline-flex items-center justify-center rounded-md border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 disabled:opacity-60 disabled:cursor-not-allowed";
  const variants: Record<Variant, string> = {
    primary: "bg-white/10 hover:bg-white/15 border-white/20",
    secondary: "bg-transparent hover:bg-white/10 border-white/20",
    ghost: "bg-transparent hover:bg-white/5 border-transparent",
  };
  const sizes: Record<Size, string> = {
    xs: "px-2 py-1 text-xs",
    sm: "px-3 py-2 text-sm",
    md: "px-4 py-2 text-sm",
  };
  const cls = `${base} ${variants[variant]} ${sizes[size]} ${className}`.trim();
  return <button className={cls} {...props} />;
}

