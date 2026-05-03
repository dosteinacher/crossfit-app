/**
 * Previous / next workout in **schedule order** (datetime ascending).
 * Same calendar day: jumps between sessions earlier/later today.
 * One workout per day: behaves like “yesterday’s workout” / “tomorrow’s workout”.
 */
export function getChronologicalNeighborIds(
  workouts: { id: number; date: string }[],
  currentId: number
): { previousId: number | null; nextId: number | null } {
  const sorted = [...workouts].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const idx = sorted.findIndex((w) => w.id === currentId);
  if (idx === -1) return { previousId: null, nextId: null };

  const previousId = idx > 0 ? sorted[idx - 1].id : null;
  const nextId = idx < sorted.length - 1 ? sorted[idx + 1].id : null;

  return { previousId, nextId };
}
