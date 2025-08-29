import React from "react";

type ProgressBarProps = {
  value: number; // 0-100
  max?: number;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "success" | "warning" | "error";
  showValue?: boolean;
  className?: string;
};

export function ProgressBar({
  value,
  max = 100,
  size = "md",
  variant = "default",
  showValue = false,
  className = "",
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  const sizes = {
    sm: "h-2",
    md: "h-3",
    lg: "h-4",
  };
  
  const variants = {
    default: "bg-white/20",
    success: "bg-green-500/40",
    warning: "bg-yellow-500/40",
    error: "bg-red-500/40",
  };
  
  const fillVariants = {
    default: "bg-white/60",
    success: "bg-green-400",
    warning: "bg-yellow-400",
    error: "bg-red-400",
  };
  
  return (
    <div className={`relative ${className}`}>
      <div className={`w-full rounded-full ${variants[variant]} ${sizes[size]}`}>
        <div
          className={`${sizes[size]} rounded-full transition-all duration-300 ease-out ${fillVariants[variant]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showValue && (
        <span className="absolute right-0 top-0 -translate-y-full text-xs text-foreground/70 pb-1">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
}

type ProgressStepProps = {
  steps: { label: string; status: "pending" | "active" | "completed" }[];
  className?: string;
};

export function ProgressSteps({ steps, className = "" }: ProgressStepProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {steps.map((step, index) => (
        <React.Fragment key={index}>
          <div className="flex items-center gap-2">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                step.status === "completed"
                  ? "bg-green-500 text-black"
                  : step.status === "active"
                  ? "bg-white/20 text-white border-2 border-white/40"
                  : "bg-white/10 text-white/50"
              }`}
            >
              {step.status === "completed" ? (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M10 3L4.5 8.5L2 6"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                index + 1
              )}
            </div>
            <span
              className={`text-sm font-medium ${
                step.status === "active" ? "text-foreground" : "text-foreground/60"
              }`}
            >
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div className={`h-px flex-1 ${step.status === "completed" ? "bg-green-500/40" : "bg-white/20"}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
