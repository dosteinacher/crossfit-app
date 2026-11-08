import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { WorkoutBlock } from './workoutNotation';
import {
  getFitScaleCandidates,
  getTotalMovementCount,
  getUniqueWorkoutStamps,
} from './workout-tv-layout';

function movement(line: number): WorkoutBlock {
  return { type: 'movement', reps: '10', name: `Movement ${line}`, line };
}

describe('TV board layout helpers', () => {
  it('counts movements across all sections when selecting the dense layout', () => {
    const groups = [
      { blocks: Array.from({ length: 6 }, (_, index) => movement(index + 1)) },
      { blocks: Array.from({ length: 6 }, (_, index) => movement(index + 7)) },
    ];

    assert.equal(getTotalMovementCount(groups), 12);
  });

  it('keeps preferred scale and falls back through smaller sizes until 0.1', () => {
    assert.deepEqual(getFitScaleCandidates(1.1), [1.1, 1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1]);
  });

  it('deduplicates stamps without changing the first display value', () => {
    assert.deepEqual(
      getUniqueWorkoutStamps(['2 Rounds', '2  ROUNDS', undefined, 'Team of 3']),
      ['2 Rounds', 'Team of 3']
    );
  });
});
