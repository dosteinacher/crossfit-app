import type { WorkoutSectionBlock } from '@/lib/workoutNotation';

export default function SectionHeader({
  section,
  variant = 'board',
  compact = false,
  dark = false,
  displayScale = 1,
}: {
  section: WorkoutSectionBlock;
  variant?: 'board' | 'stage';
  compact?: boolean;
  dark?: boolean;
  displayScale?: number;
}) {
  const primaryText = dark ? 'text-white' : 'text-ink';
  const secondaryText = dark ? 'text-white/75' : 'text-ink-2';
  const rule = dark ? 'border-white/60' : 'border-ink';
  const badgeSize = variant === 'stage' ? '.82em' : '.72em';

  return (
    <div
      className={`min-w-0 border-b-[4px] pb-[.35em] ${rule}`}
      style={{ fontSize: variant === 'stage' ? '1em' : `${(compact ? 18 : 22) * displayScale}px` }}
    >
      {(section.label || section.format || section.meta.length > 0) && (
        <div className="mb-[.42em] flex flex-wrap items-center gap-[.4em]">
          {section.label && (
            <span
              className="rounded-sm bg-lime px-[.55em] py-[.2em] font-display font-extrabold uppercase leading-none text-ink"
              style={{ fontSize: badgeSize }}
            >
              {section.label}
            </span>
          )}
          {section.format && (
            <span
              className="rounded-sm border border-lime bg-lime/15 px-[.55em] py-[.18em] font-display font-extrabold uppercase leading-none text-ink"
              style={{ fontSize: badgeSize }}
            >
              {section.format}
            </span>
          )}
          {section.meta.map((meta, index) => (
            <span
              key={`${meta}-${index}`}
              className={`rounded-sm border px-[.5em] py-[.18em] font-bold uppercase leading-none ${dark ? 'border-white/30' : 'border-ink/20'} ${secondaryText}`}
              style={{ fontSize: variant === 'stage' ? '.72em' : '.66em' }}
            >
              {meta}
            </span>
          ))}
        </div>
      )}
      <h2
        className={`break-words font-display font-black uppercase leading-[.92] ${primaryText}`}
        style={{ fontSize: variant === 'stage' ? '2.2em' : '1.5em' }}
      >
        {section.title}
      </h2>
    </div>
  );
}
