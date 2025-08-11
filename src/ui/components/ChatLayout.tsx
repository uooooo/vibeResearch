export default function ChatLayout({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)] gap-6">
      <div className="grid gap-4">{left}</div>
      <div className="grid gap-4">{right}</div>
    </div>
  );
}
