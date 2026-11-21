/**
 * v9 Phase 1 — one-time clean-up applied only when text is *pasted* into the
 * Create-workout box, never while typing and never again afterwards. It
 * never touches PURE's own strict markers (#, ##, ~, !, >), so a workout
 * pasted straight from the ChatGPT project is left untouched.
 *
 * The leading-dash bullet ("- item") used in Word/notes apps is deliberately
 * NOT stripped here, even though the brief lists it as a bullet character:
 * "- " is also PURE's own strict text-line prefix (what ChatGPT writes for
 * "shown exactly as typed" lines), and stripping it would silently rewrite
 * that notation. Every other listed bullet/number marker is unambiguous and
 * is removed.
 */

const WHATSAPP_PREFIX = /^\[\d{1,2}[./]\d{1,2}[./]\d{2,4},?\s*\d{1,2}:\d{2}(?::\d{2})?\]\s*[^:]+:\s*/;
const MEDIA_OMITTED = /^<Media omitted>$|^<Medien ausgeschlossen>$/i;
const LEADING_BULLET = /^(?:[•▪✅]|\d+\.|[a-zA-Z]\))\s+/;
const LEADING_WHITESPACE = /^[\t  ]+/;

function stripInlineEmphasis(line: string): string {
  return line
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/_([^_\n]+)_/g, '$1');
}

export function cleanPastedText(text: string): string {
  if (typeof text !== 'string') return text;

  const lines = text.split(/\r?\n/).map((line) => {
    let value = line.replace(WHATSAPP_PREFIX, '');
    if (MEDIA_OMITTED.test(value.trim())) return '';
    value = stripInlineEmphasis(value);
    value = value.replace(LEADING_WHITESPACE, '');
    value = value.replace(LEADING_BULLET, '');
    return value.replace(/[ \t]+$/g, '');
  });

  // Collapse two or more consecutive blank lines into one.
  const collapsed: string[] = [];
  let blankRun = false;
  for (const line of lines) {
    if (line.trim() === '') {
      if (blankRun) continue;
      blankRun = true;
    } else {
      blankRun = false;
    }
    collapsed.push(line);
  }

  return collapsed.join('\n');
}
