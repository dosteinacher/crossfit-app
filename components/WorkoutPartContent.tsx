import type { WorkoutBlock } from '@/lib/workoutNotation';

export default function WorkoutPartContent({
  title,
  minutes,
  blocks,
  activePart,
  totalParts,
  dark = false,
  compact = false,
  displayScale = 1,
}: {
  title: string;
  minutes?: number;
  blocks: WorkoutBlock[];
  activePart?: number;
  totalParts?: number;
  dark?: boolean;
  compact?: boolean;
  displayScale?: number;
}) {
  const primaryText = dark ? 'text-white' : 'text-ink';
  const secondaryText = dark ? 'text-white/75' : 'text-ink-2';
  const divider = dark ? 'divide-white/20' : 'divide-line-2';
  const Title = compact ? 'h2' : 'h1';

  return (
    <div className="min-w-0">
      {activePart !== undefined && totalParts !== undefined && (
        <p className={`mb-3 font-bold uppercase tracking-[.14em] ${dark ? 'text-white' : 'text-ink-2'}`}>
          Part {String(activePart + 1).padStart(2, '0')} of {String(totalParts).padStart(2, '0')}
        </p>
      )}
      <Title
        className={`mb-5 font-display font-extrabold uppercase leading-[.9] ${primaryText}`}
        style={{
          fontSize: compact ? '84px' : `clamp(${44 * displayScale}px, ${7 * displayScale}vw, ${84 * displayScale}px)`,
        }}
      >
        {minutes ? `${title} — ${minutes}′` : title}
      </Title>
      <div className={`divide-y-2 ${divider}`}>
        {blocks.length ? blocks.map((block, index) => {
          if (block.type === 'movement') {
            return (
              <div key={`${block.name}-${index}`} className={`grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 ${compact ? 'py-4' : 'py-4 md:gap-5 md:py-5'}`}>
                <span className={`min-w-[1.7em] font-display text-[4em] font-extrabold leading-none tabular-nums ${primaryText}`}>
                  {block.reps || '—'}
                </span>
                <div className="min-w-0">
                  <p
                    className={`font-sans font-bold leading-tight ${primaryText}`}
                    style={{ fontSize: compact ? '40px' : `clamp(${24 * displayScale}px, ${3.2 * displayScale}vw, ${40 * displayScale}px)` }}
                  >
                    {block.name}
                    {block.load && <span className={`ml-2 text-[.62em] ${secondaryText}`}>{block.load}</span>}
                  </p>
                  {block.alt && (
                    <p className={`mt-1 text-[.85em] ${secondaryText}`}>↳ {block.alt}</p>
                  )}
                </div>
              </div>
            );
          }
          if (block.type === 'section' || block.type === 'sub') {
            return <p key={`${block.name}-${index}`} className={`border-b border-current/20 py-3 font-bold uppercase tracking-[.14em] ${secondaryText}`}>{block.name}</p>;
          }
          if (block.type === 'note') {
            return <p key={`${block.name}-${index}`} className="border-l-4 border-lime bg-lime/15 px-4 py-3 font-semibold">{block.name}</p>;
          }
          return <p key={`${block.name}-${index}`} className={`py-3 font-semibold ${block.type === 'scheme' ? primaryText : secondaryText}`}>{block.name}</p>;
        }) : (
          <p className={`py-4 font-semibold ${secondaryText}`}>No movements listed</p>
        )}
      </div>
    </div>
  );
}
