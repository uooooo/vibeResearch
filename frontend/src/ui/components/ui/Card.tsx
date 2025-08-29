import React from "react";

type CardVariant = "default" | "elevated" | "outline";
type CardSize = "sm" | "md" | "lg";

export function Card({
  variant = "default",
  size = "md",
  className = "",
  children,
  ...props
}: {
  variant?: CardVariant;
  size?: CardSize;
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  const base = "rounded-lg transition-colors";
  const variants: Record<CardVariant, string> = {
    default: "bg-black/20 border border-white/15",
    elevated: "bg-black/30 border border-white/20 shadow-lg",
    outline: "bg-transparent border border-white/30",
  };
  const sizes: Record<CardSize, string> = {
    sm: "p-3",
    md: "p-4",
    lg: "p-6",
  };
  const cls = `${base} ${variants[variant]} ${sizes[size]} ${className}`.trim();
  return <div className={cls} {...props}>{children}</div>;
}

export function CardHeader({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`mb-4 ${className}`}>{children}</div>;
}

export function CardTitle({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <h3 className={`text-lg font-semibold ${className}`}>{children}</h3>;
}

export function CardContent({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`${className}`}>{children}</div>;
}

export function CardFooter({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`mt-4 pt-4 border-t border-white/10 ${className}`}>{children}</div>;
}
