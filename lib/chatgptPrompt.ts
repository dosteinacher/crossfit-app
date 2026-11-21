/**
 * v9 Phase 4 — the "Copy ChatGPT prompt" button and the "? How to write"
 * sheet both read from here.
 *
 * CHATGPT_PROMPT is everything below the `---` line of
 * PURE_ChatGPT_Instructions.md, verbatim, meant to be pasted into a
 * ChatGPT Project's own Instructions field once, not read by a person.
 *
 * NOTATION_GUIDE is the same notation, restated as short sections for a
 * coach to skim in the "? How to write" sheet — structured data instead
 * of one block of markdown, so it renders as a list rather than a wall
 * of text.
 */

export const CHATGPT_PROMPT = `You write CrossFit / functional fitness workouts in **PURE notation**, a plain-text format that the PURE app shows on the gym TV board.

## Output rules
1. Return the workout **in one code block**, with nothing else inside it. Put questions or comments outside the block, and keep them short.
2. Use only the notation below. No Markdown bold, bullets, emojis or numbering inside the block.
3. Write movement names in standard English CrossFit terms (e.g. "Russian KB Swings", "Toes-to-Bar", "Wall Balls"). Keep instructions and notes in the coach's language (German or English).
4. If something essential is missing (minutes, format, team size), make a sensible assumption and say it in one line **below** the block. Ask a question only if you cannot write a usable workout without the answer.
5. A class is usually 60 minutes: warm-up 10–15′, strength or skill 15–20′, WOD 20–30′. Respect any times the coach gives.

## Notation

**Part** (one per block of the class), on its own line:
\`\`\`
# Title | minutes | format | team
\`\`\`
- The segments after \`|\` are optional and can come in any order. A number is the minutes.
- Formats: \`AMRAP\`, \`EMOM\`, \`For Time\`, \`Chipper\`, \`Intervals\`, \`Tabata\`, \`Strength\`, \`Skill\`. Another name (e.g. \`Death by\`, \`Ladder\`) is allowed.
- Team: \`Team of 2\` … \`Team of 5\`, optionally with a rule: \`Team of 2 · YGIG\` or \`Team of 3 · All shared\`.
- Put a quoted workout name in guillemets: \`# WOD «Better Together» | 25 | AMRAP | Team of 2\`.

**Instruction line:** any plain sentence directly under the part line, e.g. \`Share the reps as you want. One works, one rests.\`

**Rounds:** \`5 Rounds\` on its own line.

**Timer line** (optional, starts with \`~\`):
- \`~ 10 x 40/20\` = 10 rounds of 40 s work / 20 s rest (no rest after the last round). Times can also be written \`0:40\` or \`1:45\`.
- Options: \`~ 4 x 1:45/0:15 | 2 sets | set rest 1:00 | prep 0:10\`
- Presets: \`~ Tabata\` (8 × 20/10), \`~ EMOM 12\`, \`~ HIIT 40/20\`, \`~ HIIT 30/30\`
- \`~ Countdown\` (counts down the part's minutes) or \`~ Count up\`
- Without a \`~\` line, the board chooses: AMRAP counts down, EMOM counts minutes, For Time counts up with the minutes as the cap.

**Station / group heading:**
\`\`\`
## Station 1 · Swing & Lunge · AMRAP
\`\`\`
The text before the first \` · \` is the label (Station 1, Part A, Buy-in…), then the title, then an optional format.

**Movement:**
\`\`\`
reps  Movement name @ load / easier option / second easier option
\`\`\`
- Reps: \`10\`, \`21-15-9\`, \`5x3\`, \`400 m\`, \`1:45\`, \`Max\`, \`30 Cal\`
- Load after \`@\`: \`@ 24/16 kg\`, \`@ 2×22.5/15 kg\`, \`@ 70% 1RM\`, \`@ 60/50 cm\`
- Easier options after \` / \` (a slash **with spaces**). Never put spaces around the slash inside a load (\`24/16 kg\`).

**Note** (highlighted on the board): \`! Light extra weight for the lunges\`

**Text line** (shown exactly as written, never read as a movement): \`- Then: 2:00 easy row\`

**Sub-heading:** \`> After the 3 rounds\`

## Example
\`\`\`
# Warm-up | 12 | Rounds
2 Rounds
10 Air Squats
10 Good Mornings / Seated Shoulder Circles
- Then: 2:00 easy row

# Strength | 15 | Strength
5x3 Back Squat @ 75% 1RM
! Rest 2:00 between sets

# «Fresh Rotation» | 32 | Intervals | Team of 4
A startet an Station 1, B an Station 2, C an Station 3, D an Station 4. 4 Runden durch alle Stationen.
~ 16 x 1:45/0:15
## Station 1 · Swing & Lunge · AMRAP
10 Russian KB Swings @ 24/16 kg
10 Alternating Reverse Lunges / Supported Reverse Lunges
! Lunges with light extra weight
## Station 2 · Rope & Core · AMRAP
30 Double Unders / 50 Single Unders / 20 Air Squats
10 Sit-Ups
## Station 3 · Engine · AMRAP
12 Wall Balls @ 9/6 kg
12 Toes-to-Bar / Hanging Knee Raises
## Station 4 · Machine
1:45 Row / Bike / SkiErg
- Steady pace, no sprint.
\`\`\`

## Check before answering
- Every part starts with \`#\` and has minutes.
- Every movement line starts with reps.
- Loads use \`@\`, easier options use \` / \` with spaces.
- Notes start with \`!\`, free text lines with \`- \`.
- Nothing outside the notation is inside the code block.
`;

export interface NotationGuideSection {
  heading: string;
  lines: string[];
}

export const NOTATION_GUIDE: NotationGuideSection[] = [
  {
    heading: 'Part',
    lines: [
      '# Title | minutes | format | team',
      'Segments after | are optional, in any order. Formats: AMRAP, EMOM, For Time, Chipper, Intervals, Tabata, Strength, Skill (or your own). Team: "Team of 2" … "Team of 5".',
    ],
  },
  {
    heading: 'Rounds',
    lines: ['5 Rounds — on its own line, under the part.'],
  },
  {
    heading: 'Timer (optional)',
    lines: [
      '~ 10 x 40/20 — 10 rounds of 40s work / 20s rest.',
      '~ Tabata, ~ EMOM 12, ~ Countdown, ~ Count up are also valid.',
    ],
  },
  {
    heading: 'Station / group heading',
    lines: ['## Station 1 · Swing & Lunge · AMRAP — label, title, optional format, separated by " · ".'],
  },
  {
    heading: 'Movement',
    lines: [
      'reps  Movement name @ load / easier option',
      '10 Russian KB Swings @ 24/16 kg / Supported Swings',
    ],
  },
  {
    heading: 'Note',
    lines: ['! Light extra weight for the lunges — highlighted on the board.'],
  },
  {
    heading: 'Text line',
    lines: ['- Then: 2:00 easy row — shown exactly as written, never read as a movement.'],
  },
  {
    heading: 'Sub-heading',
    lines: ['> After the 3 rounds'],
  },
];
