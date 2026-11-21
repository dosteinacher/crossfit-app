/** Shared "More options" section used by both Create and Edit workout — always visible, not collapsed. */
export default function MoreOptionsSection({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-t border-line-2 pt-3">
      <p className="mb-3 text-sm font-bold text-ink">More options</p>
      <div className="space-y-5">{children}</div>
    </div>
  );
}
