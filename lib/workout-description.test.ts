import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseWorkoutDescription } from './workout-description';

// These imported workout examples are from public/workouts-template.csv; no live database is configured here.
describe('parseWorkoutDescription', () => {
  it('parses the imported For Time workout description', () => {
    const [part] = parseWorkoutDescription('For Time:\n21-15-9\nThrusters (95/65)\nPull-ups\nBox Jumps');

    assert.equal(part.sectionTitle, 'For Time');
    assert.equal(part.title, 'For Time');
    assert.deepEqual(part.lines, ['21-15-9', 'Thrusters (95/65)', 'Pull-ups', 'Box Jumps']);
    assert.equal(part.movements[1].movement, 'Thrusters (95/65)');
  });

  it('extracts repetitions from the imported strength workout', () => {
    const [part] = parseWorkoutDescription('5 Rounds:\n5 Back Squats (Heavy)\n10 Strict Pull-ups\nRest 2 minutes');

    assert.deepEqual(part.movements.slice(0, 2), [
      { reps: '5', movement: 'Back Squats (Heavy)' },
      { reps: '10', movement: 'Strict Pull-ups' },
    ]);
  });

  it('finds duration and movements in the imported AMRAP workout', () => {
    const [part] = parseWorkoutDescription(
      'AMRAP 20 minutes:\n10 Wall Balls\n15 Kettlebell Swings\n20 Double Unders\nSwitch every round'
    );

    assert.equal(part.durationMinutes, 20);
    assert.deepEqual(part.movements.slice(0, 3), [
      { reps: '10', movement: 'Wall Balls' },
      { reps: '15', movement: 'Kettlebell Swings' },
      { reps: '20', movement: 'Double Unders' },
    ]);
  });

  it('parses numbered parts and German section keywords', () => {
    const parts = parseWorkoutDescription(
      '1. Aufwärmen – 15 Min 2 Rounds - 10 Air Squats - 8 Push-Ups\n2. Strength – 20 Min - 5 Back Squats\n3. WOD – 30 Min AMRAP - 12 Wall Balls'
    );

    assert.equal(parts.length, 3);
    assert.equal(parts[0].title, 'Aufwärmen');
    assert.equal(parts[0].durationMinutes, 15);
    assert.deepEqual(parts[0].movements, [
      { reps: '10', movement: 'Air Squats' },
      { reps: '8', movement: 'Push-Ups' },
    ]);
    assert.equal(parts[2].durationMinutes, 30);
  });

  it('keeps a section movement as its title and the remaining lines as details', () => {
    const [part] = parseWorkoutDescription(
      'Strength:\nBack Squat\n10 – 5 – 5 – 3 – 3\nBuild to a heavy, clean 3'
    );

    assert.equal(part.sectionTitle, 'Strength');
    assert.equal(part.title, 'Back Squat');
    assert.deepEqual(part.lines, ['10 – 5 – 5 – 3 – 3', 'Build to a heavy, clean 3']);
  });

  it('never throws for a non-string input', () => {
    assert.doesNotThrow(() => parseWorkoutDescription(null as unknown as string));
  });
});
