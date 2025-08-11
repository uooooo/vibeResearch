"use client";
import { useState } from "react";

export default function ChatInput({ onSend }: { onSend: (text: string) => void }) {
  const [text, setText] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const t = text.trim();
        if (!t) return;
        onSend(t);
        setText("");
      }}
      className="flex items-center gap-2 border border-white/15 bg-black/30 rounded-xl p-2"
    >
      <textarea
        className="flex-1 bg-transparent outline-none resize-none min-h-10 max-h-40"
        placeholder="Send a message..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button
        type="submit"
        className="rounded-md border border-white/20 px-3 py-2 text-sm hover:bg-white/10"
      >
        Send
      </button>
    </form>
  );
}

