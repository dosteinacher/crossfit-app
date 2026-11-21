/**
 * v9 Phase 1 safety check: for every workout in the database, compares what
 * today's production board renderer (lib/workoutNotation.ts's parseWorkout,
 * used unchanged by /workouts/[id]/board) shows against what the new lenient
 * line classifier (lib/classifyLines.ts) would show, if a later phase wired
 * it into rendering.
 *
 * Nothing here is wired into production yet — this is strictly a diagnostic.
 * Strict PURE notation (#, ##, ~, !, -, >) is read identically by both
 * paths by construction, so a workout that already uses it should show no
 * difference at all; any difference there is a real regression, and the
 * script reports it as one. Free-text workouts are expected to change —
 * that's the whole point of being more lenient — so those differences are
 * listed for review, not treated as failures.
 *
 * Read-only: it never writes anything back to the database.
 *
 * Usage:
 *   npx tsx scripts/board-diff.ts
 *
 * Needs the same database connection the app itself uses (POSTGRES_URL or
 * DATABASE_URL in the environment) — same as scripts/roundtrip-check.ts.
 */

import { db } from '../lib/db';
import { blocksFromProduction, blocksFromClassifier, hasStrictHeader, diffBlocks } from '../lib/boardBlocksCompare';

async function main() {
  if (!process.env.POSTGRES_URL && !process.env.DATABASE_URL) {
    console.error(
      'POSTGRES_URL / DATABASE_URL is not set, so lib/db would use the in-memory mock ' +
        'database instead of the real one. Set the connection string your app uses in ' +
        'production (e.g. pull it from Vercel) and run this again.'
    );
    process.exitCode = 1;
    return;
  }

  console.log('Loading workouts…');
  const workouts = await db.getWorkouts(false);
  console.log(`Loaded ${workouts.length} workout(s). Comparing board rendering…\n`);

  let notationRegressions = 0;
  let freeTextChanges = 0;
  let unchanged = 0;

  for (const workout of workouts) {
    const description = workout.description || '';
    const strict = hasStrictHeader(description);

    let before;
    let after;
    try {
      before = blocksFromProduction(description);
      after = blocksFromClassifier(description);
    } catch (error) {
      console.log(`✗ #${workout.id} "${workout.title}" — comparison threw: ${error instanceof Error ? error.message : String(error)}\n`);
      continue;
    }

    const diff = diffBlocks(before, after);
    if (diff.length === 0) {
      unchanged += 1;
      continue;
    }

    if (strict) {
      notationRegressions += 1;
      console.log(`✗ #${workout.id} "${workout.title}" (${workout.date}) — NOTATION WORKOUT CHANGED (this must not happen):`);
    } else {
      freeTextChanges += 1;
      console.log(`• #${workout.id} "${workout.title}" (${workout.date}) — free text reads differently now:`);
    }
    for (const line of diff) console.log(line);
    console.log('');
  }

  console.log('—'.repeat(40));
  console.log(
    `${unchanged} unchanged, ${freeTextChanges} free-text workouts changed (expected, for review), ` +
      `${notationRegressions} notation workouts changed (must be 0), ${workouts.length} total.`
  );
  if (notationRegressions > 0) {
    console.log('A notation workout changed — that is a real regression and needs a fix before continuing.');
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error('Board diff failed:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    setTimeout(() => process.exit(process.exitCode ?? 0), 100);
  });
