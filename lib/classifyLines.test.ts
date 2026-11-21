import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { classifyLines } from './classifyLines';
import { cleanPastedText } from './pasteCleanup';

function kinds(text: string) {
  return classifyLines(text).map((c) => c.kind);
}

const WORD_EXAMPLE = [
  'Warm-up 12 min, 2 rounds',
  '10 air squats',
  '10 good mornings (easier: shoulder circles)',
  'then 2 min easy row',
  '',
  'Fresh Rotation – 30 min, team of 4, 5 rounds',
  'A starts at station 1, B at station 2 … 1:45 work, 0:15 change',
  'Station 1: Swing & Lunge',
  '10 Russian KB swings 24/16kg',
  '10 alternating reverse lunges (easier: supported)',
  'Lunges with light extra weight',
  'Station 2: Rope & Core',
  '30 double unders (or 50 single unders)',
  '10 sit-ups',
].join('\n');

describe('classifyLines: the Word example (10-create-desktop.png)', () => {
  it('reads 2 parts, 1 info, 2 groups, 6 movements, 1 text and 1 check line, in order', () => {
    assert.deepEqual(kinds(WORD_EXAMPLE), [
      'part',
      'move',
      'move',
      'text',
      'part',
      'info',
      'group',
      'move',
      'move',
      'check',
      'group',
      'move',
      'move',
    ]);
  });

  it('extracts minutes, rounds and team from the lenient part lines', () => {
    const results = classifyLines(WORD_EXAMPLE);
    const parts = results.filter((r) => r.kind === 'part');
    assert.equal(parts[0].parsed && 'minutes' in parts[0].parsed && parts[0].parsed.minutes, 12);
    assert.equal(parts[0].parsed && 'rounds' in parts[0].parsed && parts[0].parsed.rounds, 2);
    assert.equal(parts[1].parsed && 'minutes' in parts[1].parsed && parts[1].parsed.minutes, 30);
    assert.equal(parts[1].parsed && 'rounds' in parts[1].parsed && parts[1].parsed.rounds, 5);
    assert.equal(parts[1].parsed && 'team' in parts[1].parsed && parts[1].parsed.team, 'Team of 4');
  });

  it('reads the groups with their station label and title', () => {
    const groups = classifyLines(WORD_EXAMPLE).filter((r) => r.kind === 'group');
    assert.deepEqual(
      groups.map((g) => g.parsed && 'label' in g.parsed && g.parsed.label),
      ['Station 1', 'Station 2']
    );
  });

  it('every line is lenient — the Word text has no strict PURE notation', () => {
    assert.ok(classifyLines(WORD_EXAMPLE).every((r) => r.confidence === 'lenient'));
  });
});

describe('classifyLines: individual cases from the brief', () => {
  it('reads a bracketed alternative: "30 double unders (or 50 single unders)"', () => {
    const [result] = classifyLines('30 double unders (or 50 single unders)');
    assert.equal(result.kind, 'move');
    const move = result.parsed as import('./classifyLines').MoveParse;
    assert.equal(move.reps, '30');
    assert.equal(move.name, 'double unders');
    assert.deepEqual(move.alts, ['50 single unders']);
  });

  it('reads a load with no space and no "@": "10 Russian KB swings 24/16kg"', () => {
    const [result] = classifyLines('10 Russian KB swings 24/16kg');
    assert.equal(result.kind, 'move');
    const move = result.parsed as import('./classifyLines').MoveParse;
    assert.equal(move.reps, '10');
    assert.equal(move.name, 'Russian KB swings');
    assert.equal(move.load, '24/16kg');
  });

  it('reads German part words: "Aufwärmen 10 Minuten"', () => {
    const [result] = classifyLines('Aufwärmen 10 Minuten\n10 Air Squats');
    assert.equal(result.kind, 'part');
    const part = result.parsed as import('./classifyLines').PartParse;
    assert.equal(part.minutes, 10);
  });

  it('reads German team/rounds words: "Kraft 15 min, zu zweit, 4 Runden"', () => {
    const [result] = classifyLines('Kraft 15 min, zu zweit, 4 Runden\n5x5 Back Squat');
    const part = result.parsed as import('./classifyLines').PartParse;
    assert.equal(part.minutes, 15);
    assert.equal(part.team, 'Team of 2');
    assert.equal(part.rounds, 4);
  });

  it('marks a line it cannot place as "check": "Lunges with light extra weight"', () => {
    // Needs the surrounding part so it isn't read as the leading info paragraph.
    const text = '# WOD | 20\n10 Burpees\nLunges with light extra weight';
    const results = classifyLines(text);
    assert.equal(results[2].kind, 'check');
  });
});

describe('classifyLines: strict notation is never reinterpreted', () => {
  it('still reads # / ## / ~ / ! / - / > exactly as before', () => {
    const text = '# WOD | 20 | AMRAP\n## Station 1\n~ Tabata\n! A note\n- A text line\n> A sub-heading\n10 Burpees';
    assert.deepEqual(kinds(text), ['part', 'group', 'timer', 'note', 'text', 'info', 'move']);
    assert.ok(classifyLines(text).slice(0, 6).every((r) => r.confidence === 'strict'));
  });

  it('never throws on empty or malformed input', () => {
    assert.doesNotThrow(() => classifyLines(''));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    assert.doesNotThrow(() => classifyLines(null as any));
  });
});

describe('cleanPastedText', () => {
  it('strips WhatsApp timestamps, bold/italic markers and media lines', () => {
    const pasted = [
      '[20.11.26, 17:02] Dominik: *Warm-up* 12 min',
      '[20.11.26, 17:02] Dominik: 10 air squats',
      '[20.11.26, 17:03] Dominik: <Media omitted>',
      '[20.11.26, 17:04] Dominik: _then easy row_',
    ].join('\n');
    assert.equal(
      cleanPastedText(pasted),
      'Warm-up 12 min\n10 air squats\n\nthen easy row'
    );
  });

  it('strips Word/notes bullets, tabs and non-breaking spaces, but never a PURE "- " text line', () => {
    const pasted = '•\tWarm-up 12 min\n✅ 10 air squats\n1. 10 good mornings\na) rest 1 min\n- Then: 2:00 easy row';
    assert.equal(
      cleanPastedText(pasted),
      'Warm-up 12 min\n10 air squats\n10 good mornings\nrest 1 min\n- Then: 2:00 easy row'
    );
  });

  it('collapses more than one blank line into one', () => {
    assert.equal(cleanPastedText('A\n\n\n\nB'), 'A\n\nB');
  });

  it('never throws on empty or malformed input', () => {
    assert.doesNotThrow(() => cleanPastedText(''));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    assert.doesNotThrow(() => cleanPastedText(null as any));
  });
});

describe('board parity: strict notation renders identically on both paths', () => {
  it('matches production block-for-block on the 3-part PURE example', async () => {
    const { blocksFromProduction, blocksFromClassifier, diffBlocks } = await import('./boardBlocksCompare');
    const text = `# Warm-up | 15
2 Rounds
10 Air Squats
10 Good Mornings / Seated Shoulder Circles

# «Strict Business» | 20 | AMRAP | Team of 3 · All shared
3 Rounds
12 Strict Pull-Ups
18 Strict Press @ 40/30 kg
24 Alt. DB Reverse Lunges @ 2×17.5/12.5 kg / DB Curls
> Nach den 3 Runden
60 Cal Bike / SkiErg

# «The Final Countdown» | 23 | Chipper | Team of 3 · All shared
## Buy-in
60 Cal Bike / Seated SkiErg, arms only if possible
## Then
60 Alt. DB Snatches @ 22.5/15 kg / Strict DB Snatches
45 Toes-to-Bar / Band Lat Pulldowns
## Buy-out
60 Cal Row / Seated SkiErg
! Wenn ihr den Buy-out beendet, beginnt ihr wieder beim Buy-in.`;
    const diff = diffBlocks(blocksFromProduction(text), blocksFromClassifier(text));
    assert.deepEqual(diff, []);
  });

  it('matches production on every writeTimerLine / workoutTimerNotation fixture', async () => {
    const { blocksFromProduction, blocksFromClassifier, diffBlocks } = await import('./boardBlocksCompare');
    const fixtures = [
      '# First | 10\n10 Bike\n\n# Second | 10\n10 Burpees',
      '# Part | 10\n10 Bike\n~ Tabata\n10 Burpees',
      'WOD – AMRAP 10 Min\n10 Wall Balls',
    ];
    for (const text of fixtures) {
      const diff = diffBlocks(blocksFromProduction(text), blocksFromClassifier(text));
      assert.deepEqual(diff, [], `mismatch for: ${text}`);
    }
  });
});

describe('board parity: the exact real-data regressions this found', () => {
  it('does not promote a bare "EMOM 45" scheme-style line to a new part mid-part', async () => {
    const { blocksFromProduction, blocksFromClassifier, diffBlocks } = await import('./boardBlocksCompare');
    const text = '# Wod Long - «Keep Turning» | 45 | EMOM | Team of 3 · Three stations\nEMOM 45\n> A starts at Snatches.\n## Snatches\n8 Snatches @35kg';
    assert.deepEqual(diffBlocks(blocksFromProduction(text), blocksFromClassifier(text)), []);
  });

  it('keeps a rounds-scheme line with a trailing parenthetical as text, not a movement', async () => {
    const { blocksFromProduction, blocksFromClassifier, diffBlocks } = await import('./boardBlocksCompare');
    const text = '# WOD «Power Couple» | 18 | Intervals | Team of 2\n6 Rounds (each 3)\n6 Hang Power Cleans @ 40 kg';
    assert.deepEqual(diffBlocks(blocksFromProduction(text), blocksFromClassifier(text)), []);
  });

  it('does not insert a lenient "@" into a strict-notation movement line without one', async () => {
    const { blocksFromProduction, blocksFromClassifier, diffBlocks } = await import('./boardBlocksCompare');
    const text = '# Deadlift | 15 | Strength\n5x10 Deadlift - Moderate Heavy 70-90kg';
    assert.deepEqual(diffBlocks(blocksFromProduction(text), blocksFromClassifier(text)), []);
  });

  it('does not insert a lenient "@" into "8 Power Cleans 43kg" inside strict notation', async () => {
    const { blocksFromProduction, blocksFromClassifier, diffBlocks } = await import('./boardBlocksCompare');
    const text = '# WOD | 20 | AMRAP\n8 Power Cleans 43kg';
    assert.deepEqual(diffBlocks(blocksFromProduction(text), blocksFromClassifier(text)), []);
  });
});
