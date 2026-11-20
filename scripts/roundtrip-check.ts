/**
 * Round-trip check for the v8 guided-editor data model.
 *
 * Loads every workout from the database and runs
 * `toText(toModel(description))` on it. Prints any workout whose text
 * comes back different (ignoring trailing whitespace on each line), with
 * a line-by-line diff, plus a summary count at the end.
 *
 * Read-only: it never writes anything back to the database.
 *
 * Usage:
 *   npx tsx scripts/roundtrip-check.ts
 *
 * Needs the same database connection the app itself uses
 * (POSTGRES_URL or DATABASE_URL in the environment). Without either set,
 * `lib/db` falls back to the in-memory mock database, which is not what
 * you want here — the script warns and exits in that case.
 */

import { db } from '../lib/db';
import { toModel, toText } from '../lib/workoutModel';

function stripTrailing(line: string) {
  return line.replace(/[ \t]+$/g, '');
}

function normalize(text: string) {
  return text.split(/\r?\n/).map(stripTrailing).join('\n').replace(/\n+$/, '');
}

/** Minimal line-based diff (LCS), good enough for a developer-facing report. */
function diffLines(before: string[], after: string[]): string[] {
  const n = before.length;
  const m = after.length;
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      lcs[i][j] = before[i] === after[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const out: string[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (before[i] === after[j]) {
      out.push(`    ${before[i]}`);
      i += 1;
      j += 1;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      out.push(`  - ${before[i]}`);
      i += 1;
    } else {
      out.push(`  + ${after[j]}`);
      j += 1;
    }
  }
  while (i < n) {
    out.push(`  - ${before[i]}`);
    i += 1;
  }
  while (j < m) {
    out.push(`  + ${after[j]}`);
    j += 1;
  }
  return out;
}

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
  console.log(`Loaded ${workouts.length} workout(s). Checking the round trip…\n`);

  let changed = 0;
  let unchanged = 0;

  for (const workout of workouts) {
    const before = workout.description || '';
    let after: string;
    try {
      after = toText(toModel(before));
    } catch (error) {
      changed += 1;
      console.log(`✗ #${workout.id} "${workout.title}" (${workout.date}) — toModel/toText threw:`);
      console.log(`    ${error instanceof Error ? error.message : String(error)}\n`);
      continue;
    }

    if (normalize(before) === normalize(after)) {
      unchanged += 1;
      continue;
    }

    changed += 1;
    console.log(`✗ #${workout.id} "${workout.title}" (${workout.date}) — round trip changed the text:`);
    for (const line of diffLines(before.split(/\r?\n/), after.split(/\r?\n/))) {
      console.log(line);
    }
    console.log('');
  }

  console.log('—'.repeat(40));
  console.log(`${unchanged} unchanged, ${changed} changed, ${workouts.length} total.`);
  if (changed > 0) {
    console.log('Any workout listed above needs a fix in lib/workoutModel.ts before Phase 2.');
  } else {
    console.log('Every workout round-trips exactly. Safe to continue to Phase 2.');
  }
}

main()
  .catch((error) => {
    console.error('Round-trip check failed:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    // Most DB drivers keep the process alive on an open pool; force exit once done.
    setTimeout(() => process.exit(process.exitCode ?? 0), 100);
  });
