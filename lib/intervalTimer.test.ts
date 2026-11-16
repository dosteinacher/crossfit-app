import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildTimeline, cueAt, stateAt } from './intervalTimer';
import type { IntervalTimer } from './workoutNotation';

const timer = (overrides: Partial<IntervalTimer> = {}): IntervalTimer => ({
  rounds: 10,
  work: 40,
  rest: 20,
  sets: 1,
  setRest: 60,
  prep: 10,
  ...overrides,
});

describe('interval timer timeline', () => {
  it('excludes prep and the final round rest from the work total', () => {
    const tenByFortyTwenty = buildTimeline(timer());
    const tenByFiveFive = buildTimeline(timer({ rounds: 10, work: 5, rest: 5 }));
    assert.equal(tenByFortyTwenty.end - timer().prep, 580);
    assert.equal(tenByFiveFive.end - timer().prep, 95);
  });

  it('places set breaks after the rounds and omits the final round rest', () => {
    const config = timer({ rounds: 2, work: 5, rest: 3, sets: 2, setRest: 7, prep: 0 });
    const { segs } = buildTimeline(config);
    assert.deepEqual(segs.map(({ phase, round, set, start }) => ({ phase, round, set, start })), [
      { phase: 'work', round: 1, set: 1, start: 0 },
      { phase: 'rest', round: 1, set: 1, start: 5 },
      { phase: 'work', round: 2, set: 1, start: 8 },
      { phase: 'setrest', round: 2, set: 1, start: 13 },
      { phase: 'work', round: 1, set: 2, start: 20 },
      { phase: 'rest', round: 1, set: 2, start: 25 },
      { phase: 'work', round: 2, set: 2, start: 28 },
    ]);
  });

  it('omits zero-duration EMOM rest segments', () => {
    const { segs, end } = buildTimeline(timer({ rounds: 12, work: 60, rest: 0, prep: 0 }));
    assert.equal(segs.length, 12);
    assert.ok(segs.every((seg) => seg.phase === 'work'));
    assert.equal(end, 720);
  });

  it('reports the active segment at every boundary', () => {
    const config = timer({ rounds: 2, work: 5, rest: 3, sets: 2, setRest: 4, prep: 2 });
    const { segs, end } = buildTimeline(config);
    for (const [index, seg] of segs.entries()) {
      const state = stateAt(config, seg.start);
      assert.equal(state.index, index);
      assert.equal(state.seg?.phase, seg.phase);
      assert.equal(state.segLeft, seg.dur);
      if (index > 0) {
        assert.equal(stateAt(config, seg.start - 1).seg?.phase, segs[index - 1].phase);
      }
    }
    assert.equal(stateAt(config, end).done, true);
    assert.equal(stateAt(config, end).index, -1);
  });

  it('computes total time remaining and progress for the current set', () => {
    const config = timer({ rounds: 2, work: 10, rest: 10, prep: 5 });
    assert.equal(stateAt(config, 0).totalLeft, 30);
    assert.equal(stateAt(config, 5).totalLeft, 30);
    assert.deepEqual(stateAt(config, 15).roundProgress, [0.5, 0]);
    assert.deepEqual(stateAt(config, 25).roundProgress, [1, 0]);
    assert.deepEqual(stateAt(config, 30).roundProgress, [1, 0.5]);
    assert.equal(stateAt(config, 35).totalLeft, 0);
  });

  it('emits phase starts, 3-2-1 ticks, and one finish cue for 3 x 5/5', () => {
    const config = timer({ rounds: 3, work: 5, rest: 5, prep: 5 });
    const cues = Array.from({ length: 31 }, (_, elapsed) => cueAt(config, elapsed))
      .filter((cue) => cue !== null);
    assert.deepEqual(cues, [
      'phaseStart-rest', 'tick', 'tick', 'tick',
      'phaseStart-work', 'tick', 'tick', 'tick',
      'phaseStart-rest', 'tick', 'tick', 'tick',
      'phaseStart-work', 'tick', 'tick', 'tick',
      'phaseStart-rest', 'tick', 'tick', 'tick',
      'phaseStart-work', 'tick', 'tick', 'tick',
      'finish',
    ]);
    assert.equal(cueAt(config, 29), 'tick');
    assert.equal(cueAt(config, 30), 'finish');
  });
});
