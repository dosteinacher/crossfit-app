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
        'pure-green': '#c1ff00',
        'pure-dark': '#293133',
        'pure-gray': '#1a1a1a',
        'pure-white': '#f5f5f5',
      },
    },
  },
  plugins: [],
}
