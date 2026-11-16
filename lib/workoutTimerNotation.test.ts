import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { hasTimerLine, removeTimerLine, writeTimerLine } from './workoutTimerNotation';

describe('workout timer notation editing', () => {
  it('inserts a timer immediately under the selected part header', () => {
    const description = '# First | 10\n10 Bike\n\n# Second | 10\n10 Burpees';
    const result = writeTimerLine(description, 1, '~ Tabata');
    assert.equal(result.description, '# First | 10\n10 Bike\n\n# Second | 10\n~ Tabata\n10 Burpees');
    assert.equal(result.partLine, 4);
    assert.equal(hasTimerLine(result.description, 1), true);
    assert.equal(hasTimerLine(result.description, 0), false);
  });

  it('replaces an existing timer wherever it appears and removes duplicate timer lines', () => {
    const description = '# Part | 10\n10 Bike\n~ 10 x 40/20\n~ Tabata\n10 Burpees';
    const result = writeTimerLine(description, 0, '~ HIIT 30/30');
    assert.equal(result.description, '# Part | 10\n10 Bike\n~ HIIT 30/30\n10 Burpees');
    assert.equal(hasTimerLine(result.description, 0), true);
  });

  it('removes only the selected part timer line', () => {
    const description = '# First | 10\n~ Tabata\n\n# Second | 10\n~ EMOM 12';
    const result = removeTimerLine(description, 0);
    assert.equal(result.removed, true);
    assert.equal(result.description, '# First | 10\n\n# Second | 10\n~ EMOM 12');
    assert.equal(hasTimerLine(result.description, 0), false);
    assert.equal(hasTimerLine(result.description, 1), true);
  });

  it('converts a legacy description to PURE notation before adding a timer', () => {
    const result = writeTimerLine('WOD – AMRAP 10 Min\n10 Wall Balls', 0, '~ 5 x 0:30/0:15');
    assert.match(result.description, /^# WOD \| 10 \| AMRAP\n~ 5 x 0:30\/0:15/m);
    assert.equal(hasTimerLine(result.description, 0), true);
  });
});
