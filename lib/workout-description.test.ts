import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getWorkoutFormat,
  getWorkoutFormatStamps,
  getWorkoutScoreboard,
} from './workout-description';
import {
  convertLegacyWorkoutToNotation,
  getWorkoutBlockText,
  getMainWorkoutFormat,
  parseWorkout,
  type WorkoutBlock,
  type WorkoutMovementBlock,
} from './workoutNotation';

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

function getMovementBlocks(blocks: WorkoutBlock[]): WorkoutMovementBlock[] {
  return blocks.filter((block): block is WorkoutMovementBlock => block.type === 'movement');
}

describe('parseWorkout', () => {
  it('parses all three PURE parts and the v3 Buy-in / Then / Buy-out workout without warnings', () => {
    const { parts, warnings } = parseWorkout(PURE_EXAMPLE);
    assert.equal(parts.length, 3);
    assert.deepEqual(parts.map(({ title, minutes, format }) => ({ title, minutes, format })), [
      { title: 'Warm-up', minutes: 15, format: undefined },
      { title: 'Strict Business', minutes: 20, format: 'AMRAP' },
      { title: 'The Final Countdown', minutes: 23, format: 'CHIPPER' },
    ]);
    assert.equal(parts[1].team, 'Team of 3 · All shared');
    assert.deepEqual(parts[0].blocks[0], { type: 'scheme', name: '2 Rounds', line: 2 });
    assert.deepEqual(parts[0].blocks[1], {
      type: 'movement',
      reps: '10',
      name: 'Air Squats',
      alt: 'Seated Band Pull-Aparts',
      line: 3,
    });
    assert.deepEqual(parts[1].blocks[3], {
      type: 'movement',
      reps: '24',
      name: 'Alt. DB Reverse Lunges',
      load: '2×17.5/12.5 kg',
      alt: 'DB Curls',
      line: 10,
    });
    assert.deepEqual(parts[2].blocks.filter((block) => block.type === 'section').map(getWorkoutBlockText), [
      'Buy-in',
      'Then',
      'Buy-out',
    ]);
    assert.equal(parts[2].blocks.at(-1)?.type, 'note');
    assert.deepEqual(warnings, []);
  });

  it('splits all spaced movement alternatives while preserving ratio slashes', () => {
    const { parts } = parseWorkout(`# WOD | 20 | For Time
5 Strict Press @ 40/30 kg
5 DB Thrusters @ 2×17.5/12.5 kg
5 Thrusters (24/16 kg)
30 Double Unders  /   50 Single Unders / 20 Air Squats
5 Sit-Ups (left / right) / V-Ups / Toes-to-Bar
21-15-9 Thrusters / Pull-ups`);
    const movements = parts[0].blocks.filter((block) => block.type === 'movement');
    assert.equal(movements[0].load, '40/30 kg');
    assert.equal(movements[1].load, '2×17.5/12.5 kg');
    assert.equal(movements[2].load, '24/16 kg');
    assert.deepEqual(movements[3], {
      type: 'movement',
      reps: '30',
      name: 'Double Unders',
      alt: '50 Single Unders · 20 Air Squats',
      line: 5,
    });
    assert.deepEqual(movements[4], {
      type: 'movement',
      reps: '5',
      name: 'Sit-Ups (left / right)',
      alt: 'V-Ups · Toes-to-Bar',
      line: 6,
    });
    assert.deepEqual(movements[5], {
      type: 'movement',
      reps: '21-15-9',
      name: 'Thrusters',
      alt: 'Pull-ups',
      line: 7,
    });
  });

  it('parses section labels, titles, formats, and metadata across all supported separators', () => {
    const { parts, warnings } = parseWorkout(`# WOD | 20
## Station 1 · Swing & Lunge · AMRAP
## Part A | Strength
## 3 – Rope & Core
## Engine · AMRAP · Cap 8′
## Buy-in`);
    assert.deepEqual(parts[0].blocks, [
      {
        type: 'section',
        label: 'Station 1',
        title: 'Swing & Lunge',
        format: 'AMRAP',
        meta: [],
        line: 2,
      },
      {
        type: 'section',
        title: 'Part A',
        format: 'STRENGTH',
        meta: [],
        line: 3,
      },
      {
        type: 'section',
        label: '3',
        title: 'Rope & Core',
        meta: [],
        line: 4,
      },
      {
        type: 'section',
        title: 'Engine',
        format: 'AMRAP',
        meta: ['Cap 8′'],
        line: 5,
      },
      {
        type: 'section',
        title: 'Buy-in',
        meta: [],
        line: 6,
      },
    ]);
    assert.deepEqual(warnings, []);
  });

  it('accepts header metadata segments in any order', () => {
    const [part] = parseWorkout('# WOD | Partner relay | Team of 4 · Shared | 16 | Intervals').parts;
    assert.equal(part.title, 'WOD');
    assert.equal(part.minutes, 16);
    assert.equal(part.format, 'INTERVALS');
    assert.equal(part.team, 'Team of 4 · Shared');
    assert.deepEqual(part.meta, ['Partner relay']);
  });

  it('recognizes the supported rep and time-prefix forms', () => {
    const movements = getMovementBlocks(parseWorkout('# Strength\n5x3 Back Squat\n400m Run\n1:00 Row').parts[0].blocks);
    assert.deepEqual(movements.map(({ reps, name }) => ({ reps, name })), [
      { reps: '5x3', name: 'Back Squat' },
      { reps: '400m', name: 'Run' },
      { reps: '1:00', name: 'Row' },
    ]);
  });

  it('parses legacy bullet-prefixed movement lines', () => {
    const result = parseWorkout('# WOD | 20\n* 12 Strict Pull-Ups / Seated Band Lat Pulldowns\n- 18 DB Push Press\n• 24 Box Jumps');
    assert.deepEqual(result.parts[0].blocks.map((block) => ({
      type: block.type,
      reps: block.type === 'movement' ? block.reps : undefined,
      name: getWorkoutBlockText(block),
      alt: block.type === 'movement' ? block.alt : undefined,
    })), [
      { type: 'movement', reps: '12', name: 'Strict Pull-Ups', alt: 'Seated Band Lat Pulldowns' },
      { type: 'movement', reps: '18', name: 'DB Push Press', alt: undefined },
      { type: 'movement', reps: '24', name: 'Box Jumps', alt: undefined },
    ]);
    assert.deepEqual(result.warnings, []);
  });

  it('cleans accidental toolbar markers from part titles and detail lines', () => {
    const result = parseWorkout(
      '# WARM U# NAME | | 15\n3 Rounds of ##\n10 Air Squats\n# STRENGTH# NAME | | 20\n5 Back Squats'
    );
    assert.deepEqual(result.parts.map(({ title }) => title), ['Warm-up', 'STRENGTH']);
    assert.equal(getWorkoutBlockText(result.parts[0].blocks[0]), '3 Rounds');
    assert.equal(result.parts[0].blocks.some((block) => /#|\|/.test(getWorkoutBlockText(block))), false);
  });

  // These legacy samples come from the import template because this worktree has no live database connection.
  it('parses legacy imported workout descriptions without PURE markers', () => {
    const legacyDescriptions = [
      'For Time:\n21-15-9\nThrusters (95/65)\nPull-ups\nBox Jumps',
      '5 Rounds:\n5 Back Squats (Heavy)\n10 Strict Pull-ups\nRest 2 minutes',
      'AMRAP 20 minutes:\n10 Wall Balls\n15 Kettlebell Swings\n20 Double Unders\nSwitch every round',
    ];
    const first = parseWorkout(legacyDescriptions[0]).parts[0];
    assert.equal(first.format, 'FOR TIME');
    assert.equal(first.blocks[0].type, 'scheme');
    assert.deepEqual(first.blocks[1], {
      type: 'movement',
      name: 'Thrusters',
      load: '95/65',
      line: 3,
    });

    const second = parseWorkout(legacyDescriptions[1]).parts[0];
    assert.deepEqual(second.blocks[0], { type: 'scheme', name: '5 Rounds:', line: 1 });
    assert.deepEqual(getMovementBlocks(second.blocks.slice(1, 3)).map(({ reps, name, load }) => ({ reps, name, load })), [
      { reps: '5', name: 'Back Squats (Heavy)', load: undefined },
      { reps: '10', name: 'Strict Pull-ups', load: undefined },
    ]);

    const third = parseWorkout(legacyDescriptions[2]).parts[0];
    assert.equal(third.format, 'AMRAP');
    assert.equal(third.minutes, 20);
    assert.deepEqual(getWorkoutFormat({ title: 'Workout', description: legacyDescriptions[2] }), {
      format: 'AMRAP',
      minutes: 20,
    });
  });

  it('splits legacy parts and sections while keeping team details out of movement rows', () => {
    const { parts } = parseWorkout(
      '1. Aufwärmen – 15 Min - 2 Rounds - 10 Air Squats - 8 Push-Ups\n' +
      '2. Strength – 20 Min - 5 Back Squats\n' +
      '3. WOD – 30 Min AMRAP - 12 Wall Balls\n' +
      'Team of 3 – All Shared'
    );
    assert.equal(parts.length, 3);
    assert.deepEqual(parts.map((part) => part.minutes), [15, 20, 30]);
    assert.equal(parts[0].blocks[0].type, 'scheme');
    assert.deepEqual(getMovementBlocks(parts[0].blocks.slice(1)).map(({ reps, name }) => ({ reps, name })), [
      { reps: '10', name: 'Air Squats' },
      { reps: '8', name: 'Push-Ups' },
    ]);
    assert.deepEqual(parts[2].meta, ['Team of 3 – All Shared']);
    assert.equal(parts[2].blocks.some((block) => block.type === 'text' && block.name.includes('Team of')), false);
  });

  it('splits legacy parts by workout keywords and extracts their durations and formats', () => {
    const { parts } = parseWorkout(
      'Warm-up – 10 Min\n2 Rounds\n10 Air Squats\nWOD – AMRAP 30 Min\n10 Wall Balls'
    );
    assert.deepEqual(parts.map(({ title, minutes, format }) => ({ title, minutes, format })), [
      { title: 'Warm-up', minutes: 10, format: undefined },
      { title: 'WOD', minutes: 30, format: 'AMRAP' },
    ]);
    assert.equal(parts[0].blocks[0].type, 'scheme');
    assert.equal(getMovementBlocks(parts[1].blocks)[0].reps, '10');
  });

  it('derives format, duration, team, and scoreboard from the shared parse', () => {
    assert.deepEqual(getWorkoutFormat({
      title: 'Fran',
      description: '# WOD | 8 | For Time | Team of 3\n21-15-9\nThrusters (95/65)\nPull-ups',
    }), {
      format: 'FOR TIME',
      minutes: 8,
      team: 'TEAM OF 3',
      benchmark: 'FRAN',
    });
    assert.deepEqual(getWorkoutFormatStamps({
      title: 'Fran',
      description: '# WOD | 8 | For Time | Team of 3\n21-15-9\nThrusters\nPull-ups',
    }), [
      { label: 'FOR TIME · CAP 8′', variant: 'format' },
      { label: 'TEAM OF 3', variant: 'meta' },
      { label: 'FRAN', variant: 'benchmark' },
    ]);
    assert.deepEqual(getWorkoutScoreboard({
      title: 'Fran',
      description: 'For Time:\n21-15-9\nThrusters\nPull-ups',
    }), { scheme: '21-15-9', movements: ['Thrusters', 'Pull-ups'] });
    assert.deepEqual(getWorkoutFormatStamps({
      title: 'Partner WOD',
      description: 'WOD – AMRAP 12 Min\nTeam of 3 – All Shared\n10 Wall Balls',
    }), [
      { label: 'AMRAP 12′', variant: 'format' },
      { label: 'TEAM OF 3 – ALL SHARED', variant: 'meta' },
    ]);
    assert.deepEqual(getWorkoutFormat({
      title: 'Open 26.1',
      description: 'Kraft – 15 Min\nWOD – Auf Zeit 20 Min\nTeam von 4\n21-15-9',
    }), {
      format: 'FOR TIME',
      minutes: 20,
      team: 'TEAM OF 4',
      benchmark: 'OPEN 26.1',
    });
    assert.deepEqual(getWorkoutFormat({
      title: 'Workout',
      description: 'WOD – „Four Corners“\nAMRAP 12 Min',
    }), { format: 'AMRAP', minutes: 12, benchmark: 'FOUR CORNERS' });
  });

  it('uses the last non-warm-up part format for the workout type field', () => {
    assert.equal(
      getMainWorkoutFormat('# Warm-up | 10 | Skill\n10 Air Squats\n# Metcon | 20 | AMRAP\n12 Wall Balls'),
      'AMRAP'
    );
    assert.equal(getMainWorkoutFormat('# Warm-up | 10\n10 Air Squats'), undefined);
  });

  it('converts legacy descriptions to PURE notation and preserves their source for undo', () => {
    const legacy = 'AMRAP 20 minutes:\n10 Wall Balls\n15 Kettlebell Swings';
    const converted = convertLegacyWorkoutToNotation(legacy);
    assert.match(converted, /^# AMRAP 20 minutes \| 20 \| AMRAP/m);
    assert.deepEqual(getMovementBlocks(parseWorkout(converted).parts[0].blocks).map(({ reps, name }) => ({ reps, name })), [
      { reps: '10', name: 'Wall Balls' },
      { reps: '15', name: 'Kettlebell Swings' },
    ]);
    assert.equal(legacy, 'AMRAP 20 minutes:\n10 Wall Balls\n15 Kettlebell Swings');
  });

  it('returns no parts for empty text and never throws for non-string input', () => {
    assert.deepEqual(parseWorkout(''), { parts: [], warnings: [] });
    assert.deepEqual(parseWorkout('   '), { parts: [], warnings: [] });
    assert.deepEqual(parseWorkout(null as unknown as string), { parts: [], warnings: [] });
  });

  it('warns when a line without reps is shown as plain text', () => {
    const result = parseWorkout('# WOD | 15\nSwitch every round\n# Part 2\n5 Burpees');
    assert.deepEqual(result.warnings, [
      { line: 2, message: 'No reps found. Shown as a text line.' },
      { line: 3, message: 'Part 2 has no minutes. The timer will count up.' },
    ]);
  });
});
