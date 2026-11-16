import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getIntervalTimerStorageKey,
  pausePersistedIntervalTimer,
  restoreIntervalTimerState,
} from './intervalTimerPersistence';

describe('interval timer persistence', () => {
  it('uses a distinct local key per workout and part', () => {
    assert.equal(getIntervalTimerStorageKey(42, 2), 'pure-interval-timer:42:2');
    assert.notEqual(getIntervalTimerStorageKey(42, 1), getIntervalTimerStorageKey(42, 2));
    assert.notEqual(getIntervalTimerStorageKey(42, 2), getIntervalTimerStorageKey(43, 2));
  });

  it('restores a running timer from its wall-clock start without exceeding the timeline', () => {
    assert.deepEqual(
      restoreIntervalTimerState({ accumulated: 12, startedAt: 10_000, running: true }, 17_900, 60),
      { accumulated: 12, startedAt: 10_000, running: true }
    );
    assert.deepEqual(
      restoreIntervalTimerState({ accumulated: 12, startedAt: 10_000, running: true }, 60_000, 60),
      { accumulated: 60, startedAt: null, running: false }
    );
  });

  it('pauses at the calculated elapsed time', () => {
    assert.deepEqual(
      pausePersistedIntervalTimer({ accumulated: 12, startedAt: 10_000, running: true }, 17_900),
      { accumulated: 19, startedAt: null, running: false }
    );
  });

  it('rejects malformed or internally inconsistent saved states', () => {
    assert.equal(restoreIntervalTimerState(null, 0, 60), undefined);
    assert.equal(restoreIntervalTimerState({ accumulated: -1, startedAt: null, running: false }, 0, 60), undefined);
    assert.equal(restoreIntervalTimerState({ accumulated: 1, startedAt: null, running: true }, 0, 60), undefined);
  });
});
