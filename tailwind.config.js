/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // "Signal on black": one high-energy accent (lime, matches the logo), everything
        // else desaturated to neutral grays. See PROJECT.md for the design rationale.
        'pure-green': '#c1ff00',        // Primary signal color — CTAs, active/positive states
        'pure-logo': '#c1ff00',
        'pure-accent-light': '#d9ff66', // Lighter lime — hover state of the primary signal
        'pure-dark': '#1c2126',         // Gunmetal — navbar/input surfaces
        'pure-gray': '#17191c',         // Near-black with a whisper of steel-blue — card surfaces
        'pure-white': '#f5f5f5',
        // Former "coastal" palette, now a cool steel/slate gray ramp (blue undertone instead
        // of neutral zinc) for a "black steel" feel — same relative lightness as before so
        // hierarchy is unchanged; only the lime accent carries actual color/energy.
        'coastal-sky': '#94a3b8',       // slate-400 — secondary text, badges, borders
        'coastal-search': '#64748b',    // slate-500 — hover backgrounds, secondary borders
        'coastal-day': '#cbd5e1',       // slate-300 — light labels/text
        'coastal-kombucha': '#475569',  // slate-600 — decorative gradient layering only
        // Kept as a distinct semantic color (not neutralized): mid-tier stat/rating indicator,
        // sits between pure-green (good) and red (bad) — e.g. attendance rate tiers, ratings.
        'coastal-honey': '#D4BB7A',
        // Semantic aliases
        'pure-text-light': '#9CA3AF',   // gray-400 — secondary text throughout app
      },
    },
  },
  plugins: [],
}
