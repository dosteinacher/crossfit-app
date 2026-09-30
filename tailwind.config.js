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
        // "Signal on paper": the app runs light so long text stays comfortable to read.
        // The lime logo colour is kept as a fill-only signal (buttons, dots, highlights)
        // because lime *text* on white is unreadable — use `pure-accent-ink` for that.
        // The gym TV display at /wod stays dark on purpose and uses literal classes.
        'pure-green': '#c1ff00',        // Signal fill — CTAs, active/positive states (always with dark text)
        'pure-logo': '#c1ff00',
        'pure-accent-light': '#aee600', // Hover state of the signal fill (darker, so it reads on white)
        'pure-accent-ink': '#415600',   // Lime-family ink for accent *text* and icons on light surfaces
        'pure-bg': '#f4f5f7',           // Page + navbar background — off-white, softer than pure white
        'pure-surface': '#ffffff',      // Cards, panels, raised surfaces
        'pure-ink': '#14171a',          // Primary text
        'pure-white': '#ffffff',        // Literal white — badges and the dark /wod screen
        // Cool slate ramp, re-pitched for light backgrounds. Same roles as before,
        // lightness flipped so contrast against paper matches what black gave us.
        'coastal-sky': '#475569',       // slate-600 — secondary text, filled secondary buttons
        'coastal-search': '#cbd5e1',    // slate-300 — borders, hover surfaces
        'coastal-day': '#334155',       // slate-700 — strong labels
        'coastal-kombucha': '#e2e8f0',  // slate-200 — decorative gradient layering only
        // Mid-tier semantic stat/rating colour, darkened so it stays legible on white.
        'coastal-honey': '#8A6D1F',
        // Semantic aliases
        'pure-text-light': '#5B6470',   // Secondary text throughout the app
      },
    },
  },
  plugins: [],
}
