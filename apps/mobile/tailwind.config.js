/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // You can extend with custom colors from your theme
      },
      fontFamily: {
        sans: ['System', 'Roboto', 'sans-serif'],
        rounded: ['System', 'Roboto', 'sans-serif'],
        mono: ['Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};




