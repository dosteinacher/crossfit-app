import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CHATGPT_PROMPT, NOTATION_GUIDE } from './chatgptPrompt';

describe('chatgptPrompt', () => {
  it('is the ChatGPT instructions text, not empty and not the surrounding how-to-use prose', () => {
    assert.ok(CHATGPT_PROMPT.length > 500);
    assert.ok(CHATGPT_PROMPT.startsWith('You write CrossFit'));
    assert.ok(!CHATGPT_PROMPT.includes('**How to use:**'));
  });

  it('documents the notation it asks ChatGPT to use', () => {
    assert.ok(CHATGPT_PROMPT.includes('# Title | minutes | format | team'));
    assert.ok(CHATGPT_PROMPT.includes('## Station 1'));
    assert.ok(CHATGPT_PROMPT.includes('! Rest 2:00 between sets'));
  });

  it('exposes a guide with at least the notation forms the editor renders in its gutter', () => {
    const headings = NOTATION_GUIDE.map((s) => s.heading);
    assert.ok(headings.includes('Part'));
    assert.ok(headings.includes('Movement'));
    assert.ok(headings.includes('Note'));
    assert.ok(headings.includes('Text line'));
    for (const section of NOTATION_GUIDE) {
      assert.ok(section.lines.length > 0, `${section.heading} has no lines`);
    }
  });
});
