import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildTimeline } from './intervalTimer';
import {
  getWorkoutBlockText,
  parseWorkout,
  serializeTimer,
  type IntervalTimer,
} from './workoutNotation';

const TEST_INTERVAL_WORKOUT = `# Short Intervals | 10 | Intervals
~ 3 x 5/5 | prep 0:05
## Stations
5 Bike
5 Burpees

# Tabata Finisher | 4 | Tabata
~ Tabata

# Engine Room | 12 | EMOM
~ EMOM 12

# Double Trouble | 17 | Intervals
~ 8 x 45/15 | 2 sets | set rest 1:00

# Cool-down | 5
5 Easy walk`;

const expectedTimer: IntervalTimer = {
  rounds: 8,
  work: 45,
  rest: 15,
  sets: 2,
  setRest: 60,
  prep: 10,
};

describe('interval timer workout notation', () => {
  it('parses the requested multi-part test workout without rendering timer lines as content', () => {
    const { parts, warnings } = parseWorkout(TEST_INTERVAL_WORKOUT);
    assert.deepEqual(parts.map((part) => part.timer), [
      { rounds: 3, work: 5, rest: 5, sets: 1, setRest: 60, prep: 5 },
      { rounds: 8, work: 20, rest: 10, sets: 1, setRest: 60, prep: 10 },
      { rounds: 12, work: 60, rest: 0, sets: 1, setRest: 60, prep: 10 },
      expectedTimer,
      undefined,
    ]);
    assert.equal(parts[0].blocks.some((block) => getWorkoutBlockText(block).startsWith('~')), false);
    assert.equal(getWorkoutBlockText(parts[4].blocks[0]), 'Easy walk');
    assert.deepEqual(warnings, []);
  });

  it('parses explicit intervals, Tabata, HIIT, and EMOM forms', () => {
    const { parts } = parseWorkout(`# A | 10 | Intervals
~ 10 x 40/20
# B | 10 | Intervals
~ HIIT 30/30
# C | 10 | Tabata
~ Tabata
# D | 12 | EMOM
~ EMOM 12`);
    assert.deepEqual(parts.map((part) => part.timer && [part.timer.rounds, part.timer.work, part.timer.rest]), [
      [10, 40, 20],
      [10, 30, 30],
      [8, 20, 10],
      [12, 60, 0],
    ]);
  });

  it('accepts equivalent second and minute-second values, spaces, and the multiplication sign', () => {
    const { parts } = parseWorkout(`# A | 10 | Intervals
~ 8   ×   0:45 / 0:15
# B | 10 | Intervals
~ 8 x 45/15`);
    assert.deepEqual(parts[0].timer, parts[1].timer);
  });

  it('clamps out-of-range values and emits warnings', () => {
    const { parts, warnings } = parseWorkout(`# Clamp | 10 | Intervals
~ 0 x 1/999 | 99 sets | set rest 20:00 | prep 1:00`);
    assert.deepEqual(parts[0].timer, {
      rounds: 1,
      work: 5,
      rest: 300,
      sets: 10,
      setRest: 600,
      prep: 30,
    });
    assert.equal(warnings.length, 6);
    assert.ok(warnings.every((warning) => warning.line === 2 && warning.message.includes('clamped')));
  });

  it('uses the Tabata preset when its format has no timer line and warns for missing Intervals timers', () => {
    const { parts, warnings } = parseWorkout(`# No timer | 10 | Intervals
5 Bike
# Tabata | 4 | Tabata
8 Burpees`);
    assert.equal(parts[0].timer, undefined);
    assert.deepEqual(parts[1].timer, { rounds: 8, work: 20, rest: 10, sets: 1, setRest: 60, prep: 10 });
    assert.ok(warnings.some((warning) =>
      warning.message === "Part 1 is 'Intervals' but has no timer line (~). The timer will count up."
    ));
  });

  it('serializes to a preset or the shortest equivalent line and round-trips', () => {
    const { parts } = parseWorkout(`# Double Trouble | 17 | Intervals
~ 8 x 0:45/0:15 | 2 sets | set rest 1:00 | prep 0:10`);
    assert.deepEqual(parts[0].timer, expectedTimer);
    const serialized = serializeTimer(parts[0].timer!);
    assert.equal(serialized, '~ 8 x 45/15 | 2 sets');
    const reparsed = parseWorkout(`# Double Trouble | 17 | Intervals
${serialized}`).parts[0].timer;
    assert.deepEqual(reparsed, expectedTimer);
    assert.equal(serializeTimer({ rounds: 8, work: 20, rest: 10, sets: 1, setRest: 60, prep: 10 }), '~ Tabata');
  });

  it('calculates the four requested work totals', () => {
    const totals = [
      { rounds: 10, work: 40, rest: 20, sets: 1, setRest: 60, prep: 10 },
      { rounds: 10, work: 5, rest: 5, sets: 1, setRest: 60, prep: 10 },
      { rounds: 8, work: 20, rest: 10, sets: 1, setRest: 60, prep: 10 },
      { rounds: 8, work: 45, rest: 15, sets: 2, setRest: 60, prep: 10 },
    ].map((config) => {
      const { end } = buildTimeline(config);
      const seconds = end - config.prep;
      return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    });
    assert.deepEqual(totals, ['9:40', '1:35', '3:50', '16:30']);
  });
});
