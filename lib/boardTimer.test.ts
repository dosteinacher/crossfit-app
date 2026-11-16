import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getBoardTimerDuration, getDefaultBoardTimerMode } from './boardTimer';
import type { WorkoutPart } from './workoutNotation';

function part(overrides: Partial<WorkoutPart> = {}): WorkoutPart {
  return { title: 'Test', meta: [], blocks: [], ...overrides };
}

describe('board timer defaults', () => {
  it('prefers an explicit interval timer over the parsed format', () => {
    assert.equal(getDefaultBoardTimerMode(part({
      format: 'AMRAP',
      timer: { rounds: 8, work: 20, rest: 10, sets: 1, setRest: 60, prep: 10 },
    })), 'intervals');
  });

  it('maps AMRAP, EMOM, and other parts to their default modes', () => {
    assert.equal(getDefaultBoardTimerMode(part({ format: 'AMRAP' })), 'countdown');
    assert.equal(getDefaultBoardTimerMode(part({ format: 'EMOM' })), 'emom');
    assert.equal(getDefaultBoardTimerMode(part({ format: 'FOR TIME' })), 'countup');
    assert.equal(getDefaultBoardTimerMode(part({ format: 'SKILL' })), 'countup');
    assert.equal(getDefaultBoardTimerMode(part()), 'countup');
  });

  it('applies a cap only to For Time and Chipper count-up parts', () => {
    assert.equal(getBoardTimerDuration(part({ format: 'FOR TIME', minutes: 20 }), 'countup'), 1200);
    assert.equal(getBoardTimerDuration(part({ format: 'CHIPPER', minutes: 15 }), 'countup'), 900);
    assert.equal(getBoardTimerDuration(part({ format: 'SKILL', minutes: 10 }), 'countup'), undefined);
  });

  it('uses the part duration for countdown and EMOM modes', () => {
    assert.equal(getBoardTimerDuration(part({ minutes: 12 }), 'countdown'), 720);
    assert.equal(getBoardTimerDuration(part({ minutes: 12 }), 'emom'), 720);
  });
});
