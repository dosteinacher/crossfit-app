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
        // Primary UI accent (coastal teal); use pure-logo for navbar wordmark only
        'pure-green': '#5EB3B3',
        'pure-logo': '#c1ff00',
        'pure-accent-light': '#7EC9C9',
        'pure-dark': '#293133',
        'pure-gray': '#1a1a1a',
        'pure-white': '#f5f5f5',
        // Coastal Palette from Behr
        'coastal-sky': '#5B8DB8',      // Wide Sky - medium blue
        'coastal-search': '#5F8C9E',    // Soul Search - teal/blue-gray
        'coastal-day': '#A8C5C5',       // Casual Day - light blue-gray
        'coastal-kombucha': '#C9B59A',  // Kombucha - warm beige
        'coastal-honey': '#D4BB7A',     // Honey Tea - golden honey
      },
    },
  },
  plugins: [],
}
