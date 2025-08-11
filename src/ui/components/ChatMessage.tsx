type Props = {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
};

export default function ChatMessage({ role, content }: Props) {
  const isUser = role === "user";
  const isAssistant = role === "assistant";
  const bubble = (
    <div
      className={
        (isUser
          ? "bg-white/10 border-white/20"
          : "bg-black/40 border-white/15") +
        " border rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap"
      }
    >
      {content}
    </div>
  );
  return (
    <div className={"flex gap-2 items-start " + (isUser ? "justify-end" : "justify-start")}> 
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-white/10 border border-white/15 grid place-items-center select-none">🤖</div>
      )}
      {bubble}
      {isUser && (
        <div className="w-7 h-7 rounded-full bg-white/10 border border-white/15 grid place-items-center select-none">🙂</div>
      )}
    </div>
  );
}

