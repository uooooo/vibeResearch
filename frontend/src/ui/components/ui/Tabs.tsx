import React from "react";

type TabsProps = {
  value: string;
  onValueChange: (v: string) => void;
  children: React.ReactNode;
  className?: string;
};

export function Tabs({ value, onValueChange, children, className = "" }: TabsProps) {
  return (
    <div className={className} data-tabs-value={value}>
      {children}
    </div>
  );
}

export function TabsList({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div role="tablist" className={`flex items-center gap-2 ${className}`}>
    {children}
  </div>;
}

export function TabsTrigger({ value, children, current, onSelect }: { value: string; children: React.ReactNode; current: string; onSelect: (v: string) => void }) {
  const active = current === value;
  const cls = `rounded-md border px-3 py-1.5 text-sm ${active ? "bg-white/10 border-white/40" : "border-white/20 hover:bg-white/10"}`;
  return (
    <button role="tab" aria-selected={active} className={cls} onClick={() => onSelect(value)}>
      {children}
    </button>
  );
}

export function TabsContent({ value, current, children, className = "" }: { value: string; current: string; children: React.ReactNode; className?: string }) {
  if (value !== current) return null;
  return <div role="tabpanel" className={className}>{children}</div>;
}

