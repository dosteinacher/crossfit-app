import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { GUIDED_TEMPLATES } from './workoutGuidedTemplates';
import { toModel, toText } from './workoutModel';

describe('GUIDED_TEMPLATES', () => {
  it('has five named templates, each with at least one part', () => {
    assert.equal(GUIDED_TEMPLATES.length, 5);
    for (const template of GUIDED_TEMPLATES) {
      assert.ok(template.name);
      assert.ok(template.parts.length >= 1);
    }
  });

  it('every template serializes to valid notation that round-trips cleanly', () => {
    for (const template of GUIDED_TEMPLATES) {
      const text = toText({ parts: template.parts, preamble: [] });
      assert.ok(text.startsWith('# '), `${template.name} should start with a part header`);
      // Re-parsing the serialized text and serializing again must be stable.
      const again = toText(toModel(text));
      assert.equal(again, text, `${template.name} should round-trip once serialized`);
    }
  });
});
