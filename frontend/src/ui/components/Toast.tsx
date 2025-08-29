"use client";
import React, { createContext, useContext, useMemo, useState } from "react";

type Toast = { id: number; title?: string; message: string };

const ToastCtx = createContext<{ push: (t: Omit<Toast, "id">) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = (t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    const item: Toast = { id, ...t } as Toast;
    setItems((arr) => [...arr, item]);
    setTimeout(() => setItems((arr) => arr.filter((x) => x.id !== id)), 3000);
  };
  const ctx = useMemo(() => ({ push }), []);
  return (
    <ToastCtx.Provider value={ctx}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 grid gap-2">
        {items.map((t) => (
          <div key={t.id} className="rounded-md border border-white/20 bg-black/80 text-sm px-3 py-2 shadow-md">
            {t.title && <div className="font-medium">{t.title}</div>}
            <div className="text-foreground/80">{t.message}</div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

