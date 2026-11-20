import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { toModel, toText, type Item } from './workoutModel';

function roundTrip(text: string) {
  return toText(toModel(text));
}

const PURE_EXAMPLE = `# Warm-up | 15
2 Rounds
10 Air Squats / Seated Band Pull-Aparts
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

describe('toModel / toText round trip', () => {
  it('reproduces the three-part PURE example exactly', () => {
    assert.equal(roundTrip(PURE_EXAMPLE), PURE_EXAMPLE);
  });

  it('reproduces two simple parts with no timer or rounds lines', () => {
    const text = '# First | 10\n10 Bike\n\n# Second | 10\n10 Burpees';
    assert.equal(roundTrip(text), text);
  });

  it('reproduces a timer line placed mid-part', () => {
    const text = '# Part | 10\n10 Bike\n~ Tabata\n10 Burpees';
    assert.equal(roundTrip(text), text);
  });

  it('reproduces two adjacent timer lines in their original order', () => {
    const text = '# Part | 10\n10 Bike\n~ 10 x 40/20\n~ Tabata\n10 Burpees';
    assert.equal(roundTrip(text), text);
  });

  it('reproduces a replaced timer line (HIIT) after a rounds line', () => {
    const text = '# First | 10\n~ Tabata\n\n# Second | 10\n~ EMOM 12';
    assert.equal(roundTrip(text), text);
  });

  it('reproduces a legacy description converted ahead of time to notation', () => {
    const text = '# WOD | 10 | AMRAP\n~ 5 x 0:30/0:15\n10 Wall Balls';
    assert.equal(roundTrip(text), text);
  });

  it('leaves free text with no # header completely untouched', () => {
    const text = 'WOD – AMRAP 10 Min\n10 Wall Balls\n\nCool-down: 5 min easy row';
    assert.equal(roundTrip(text), text);
  });

  it('leaves a blank workout untouched, and never throws on whitespace-only text', () => {
    assert.equal(roundTrip(''), '');
    assert.doesNotThrow(() => toModel('   \n  '));
    assert.deepEqual(toModel('   \n  '), { parts: [], preamble: [] });
  });

  it('reproduces a Rounds-format part', () => {
    const text = '# Partner Chipper | 20 | Rounds | Team of 2\n5 Rounds\n10 Burpees\n10 Box Jumps';
    assert.equal(roundTrip(text), text);
  });

  it('reproduces an Other format with a countdown timer', () => {
    const text = '# Finisher | 20 | Chipper\n~ Countdown\n21-15-9\nThrusters\nPull-ups';
    assert.equal(roundTrip(text), text);
  });

  it('reproduces an Other format with a count-up timer', () => {
    const text = '# Finisher | 20 | Death by\n~ Count up\nMax Double Unders';
    assert.equal(roundTrip(text), text);
  });

  it('reproduces a text line (dash-prefixed) without parsing it as a movement', () => {
    const text = '# WOD | 20 | For Time\n21-15-9\nThrusters\n- Then: 2:00 easy row';
    assert.equal(roundTrip(text), text);
  });

  it('reproduces instructions directly under the title', () => {
    const text = '# Skill | 15 | Skill\nBuild to a heavy single, then hold for 3 sets of 5.\n5 Strict Pull-Ups';
    assert.equal(roundTrip(text), text);
  });

  it('reproduces a part with a pre-header preamble', () => {
    const text = 'Notes for the coach before class\n\n# WOD | 20 | AMRAP\n10 Burpees';
    assert.equal(roundTrip(text), text);
  });

  it('reproduces multi-line instructions and a note line', () => {
    const text = [
      '# Strength | 20 | Strength',
      'Work up to a heavy set of 3.',
      'Rest as needed between sets.',
      '5 Back Squats @ 70% 1RM',
      '! Light extra weight for the lunges',
    ].join('\n');
    assert.equal(roundTrip(text), text);
  });
});

describe('toModel field extraction', () => {
  it('parses a movement row with reps, name, load and a single alternative', () => {
    const { parts } = toModel('# WOD | 10\n10 Russian KB Swings @ 24/16 kg / Russian swings');
    const item = parts[0].items[0] as Extract<Item, { kind: 'movement' }>;
    assert.equal(item.kind, 'movement');
    assert.equal(item.reps, '10');
    assert.equal(item.name, 'Russian KB Swings');
    assert.equal(item.load, '24/16 kg');
    assert.deepEqual(item.alts, ['Russian swings']);
  });

  it('parses several alternatives separated by middle dots', () => {
    const { parts } = toModel('# WOD | 10\n10 Pull-Ups / Band Rows · Ring Rows');
    const item = parts[0].items[0] as Extract<Item, { kind: 'movement' }>;
    assert.deepEqual(item.alts, ['Band Rows', 'Ring Rows']);
  });

  it('treats a movement without a leading number as a movement with reps "Max"', () => {
    const { parts } = toModel('# WOD | 10\nMax Double Unders');
    const item = parts[0].items[0] as Extract<Item, { kind: 'movement' }>;
    assert.equal(item.kind, 'movement');
    assert.equal(item.reps, 'Max');
    assert.equal(item.name, 'Double Unders');
  });

  it('extracts minutes, a known format and a team from the header', () => {
    const { parts } = toModel('# Title | 15 | AMRAP | Team of 2\n10 Burpees');
    assert.equal(parts[0].minutes, '15');
    assert.equal(parts[0].format, 'AMRAP');
    assert.equal(parts[0].team, 'Team of 2');
  });

  it('treats an unrecognized format word as Other, keeping it as typed', () => {
    const { parts } = toModel('# Title | 20 | Chipper\n10 Burpees');
    assert.equal(parts[0].format, 'Other');
    assert.equal(parts[0].otherName, 'Chipper');
  });

  it('extracts the rounds count for a Rounds-format part', () => {
    const { parts } = toModel('# Title | 20 | Rounds\n5 Rounds\n10 Burpees');
    assert.equal(parts[0].rounds, '5');
  });

  it('sets timerMode countdown / countup for the new ~ Countdown / ~ Count up lines', () => {
    assert.equal(toModel('# A | 10\n~ Countdown\n10 Burpees').parts[0].timerMode, 'countdown');
    assert.equal(toModel('# A | 10\n~ Count up\n10 Burpees').parts[0].timerMode, 'countup');
  });

  it('parses an interval timer line into a Timer object', () => {
    const { parts } = toModel('# A | 10\n~ 10 x 40/20\n10 Burpees');
    assert.equal(parts[0].timerMode, 'intervals');
    assert.deepEqual(parts[0].timer, { rounds: 10, work: 40, rest: 20, sets: 1, setRest: 60, prep: 10 });
  });

  it('collects instruction lines before the first item, and stops at the first item', () => {
    const { parts } = toModel('# A | 10\nFirst line\nSecond line\n10 Burpees\nSome other text');
    assert.deepEqual(parts[0].instructions, ['First line', 'Second line']);
    assert.equal(parts[0].items.length, 2);
    assert.equal(parts[0].items[0].kind, 'movement');
    assert.equal(parts[0].items[1].kind, 'text');
  });

  it('never throws on malformed input', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    assert.doesNotThrow(() => toModel(null as any));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    assert.doesNotThrow(() => toModel(undefined as any));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    assert.doesNotThrow(() => toText(null as any));
  });
});

describe('setting timer fields directly (not via a raw line)', () => {
  it('emits a "~ ..." line once a Timer object is set on a part with no prior timer line', () => {
    const model = toModel('# Warm-up | 15 | Intervals\n10 Burpees');
    model.parts[0].timer = { rounds: 8, work: 20, rest: 10, sets: 1, setRest: 60, prep: 10 };
    model.parts[0].extras = [{ kind: 'timer', index: 0 }];
    const text = toText(model);
    assert.match(text, /^# Warm-up \| 15 \| Intervals\n~ Tabata\n10 Burpees$/);
  });
});

describe('blank lines within a part body (found via the production round-trip check)', () => {
  it('preserves a blank line between two movements', () => {
    const text = '# WOD | 20 | AMRAP\n10 Burpees\n\n10 Box Jumps';
    assert.equal(roundTrip(text), text);
  });

  it('preserves a blank line between two station groups', () => {
    const text = '# WOD | 20 | Intervals\n## Station 1\n10 Burpees\n\n## Station 2\n10 Box Jumps';
    assert.equal(roundTrip(text), text);
  });

  it('preserves a blank line between instructions and the first rounds-scheme line', () => {
    const text = '# WOD | 20 | Rounds\n> Explain the setup here.\n\n5 Rounds\n10 Burpees';
    assert.equal(roundTrip(text), text);
  });

  it('preserves a blank line right before a timer line', () => {
    const text = '# WOD | 10\n10 Burpees\n\n~ Tabata\n10 Box Jumps';
    assert.equal(roundTrip(text), text);
  });

  it('preserves a blank line between a note and the next movement', () => {
    const text = '# WOD | 20\n! Score = total reps\n\n10 Burpees';
    assert.equal(roundTrip(text), text);
  });
});

describe('instructions never jump ahead of an earlier rounds/timer line', () => {
  it('keeps a rounds-scheme line before a later instruction line (found via production round trip)', () => {
    const text = '# WOD | 18 | Intervals | Team of 2\n6 Rounds (each 3)\n> First athlete full round, then second, then wait.\n6 Hang Power Cleans';
    assert.equal(roundTrip(text), text);
  });

  it('keeps a timer line before a later instruction line', () => {
    const text = '# WOD | 10\n~ Tabata\n> Explain the rotation here.\n10 Burpees';
    assert.equal(roundTrip(text), text);
  });

  it('still treats a leading instruction line before any rounds/timer line as an instruction', () => {
    const { parts } = toModel('# WOD | 20 | Rounds\n> Explain the setup first.\n5 Rounds\n10 Burpees');
    assert.deepEqual(parts[0].instructions, ['> Explain the setup first.']);
    assert.equal(parts[0].rounds, '5');
  });
});

describe('blank lines between parts (found via production round trip)', () => {
  it('preserves two blank lines between parts, not just the canonical one', () => {
    const text = '# First | 10\n10 Burpees\n\n\n# Second | 10\n10 Box Jumps';
    assert.equal(roundTrip(text), text);
  });

  it('still defaults to one blank line between a newly added part and its neighbor', () => {
    const model = toModel('# First | 10\n10 Burpees');
    model.parts.push({ title: 'Second', minutes: '10', format: 'Other', team: '', instructions: [], items: [{ kind: 'movement', reps: '10', name: 'Box Jumps', load: '', alts: [] }] });
    assert.equal(toText(model), '# First | 10\n10 Burpees\n\n# Second | 10\n10 Box Jumps');
  });
});
