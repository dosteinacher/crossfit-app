import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  boardTimerConfigurationsEqual,
  getBoardTimerConfigurationDuration,
  getBoardTimerDuration,
  getDefaultBoardTimerConfiguration,
  getDefaultBoardTimerMode,
  isBoardTimerConfiguration,
} from './boardTimer';
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

  it('creates usable board defaults and computes each configured mode duration', () => {
    const interval = { rounds: 8, work: 20, rest: 10, sets: 1, setRest: 60, prep: 10 };
    assert.deepEqual(getDefaultBoardTimerConfiguration(part({
      format: 'INTERVALS',
      timer: interval,
    })), { mode: 'intervals', timer: interval });
    assert.deepEqual(getDefaultBoardTimerConfiguration(part({ format: 'AMRAP', minutes: 12 })), {
      mode: 'countdown',
      minutes: 12,
    });
    assert.deepEqual(getDefaultBoardTimerConfiguration(part({ format: 'EMOM', minutes: 12 })), {
      mode: 'emom',
      minutes: 12,
      everyMinutes: 1,
    });
    assert.deepEqual(getDefaultBoardTimerConfiguration(part({ format: 'FOR TIME', minutes: 20 })), {
      mode: 'countup',
      minutes: 20,
    });
    assert.deepEqual(getDefaultBoardTimerConfiguration(part({ format: 'SKILL', minutes: 10 })), {
      mode: 'countup',
      minutes: undefined,
    });
    assert.equal(getBoardTimerConfigurationDuration({ mode: 'countup', minutes: 20 }), 1200);
    assert.equal(getBoardTimerConfigurationDuration({ mode: 'countup', minutes: 0 }), undefined);
    assert.equal(getBoardTimerConfigurationDuration({ mode: 'countdown', minutes: 12 }), 720);
    assert.equal(getBoardTimerConfigurationDuration({ mode: 'emom', minutes: 12, everyMinutes: 2 }), 1440);
    assert.equal(getBoardTimerConfigurationDuration({ mode: 'intervals', timer: interval }), 240);
  });

  it('validates persisted overrides and compares complete timer configurations', () => {
    const valid = { mode: 'emom' as const, minutes: 12, everyMinutes: 2 };
    assert.equal(isBoardTimerConfiguration(valid), true);
    assert.equal(isBoardTimerConfiguration({ mode: 'emom', minutes: 12, everyMinutes: 0 }), false);
    assert.equal(isBoardTimerConfiguration({
      mode: 'intervals',
      timer: { rounds: 8, work: 20, rest: 10, sets: 1, setRest: 60, prep: 10 },
    }), true);
    assert.equal(isBoardTimerConfiguration({
      mode: 'intervals',
      timer: { rounds: 0, work: 20, rest: 10, sets: 1, setRest: 60, prep: 10 },
    }), false);
    assert.equal(boardTimerConfigurationsEqual(valid, { ...valid }), true);
    assert.equal(boardTimerConfigurationsEqual(valid, { ...valid, everyMinutes: 1 }), false);
    assert.equal(
      boardTimerConfigurationsEqual({ mode: 'countup', minutes: 0 }, { mode: 'countup' }),
      true,
    );
  });
});
