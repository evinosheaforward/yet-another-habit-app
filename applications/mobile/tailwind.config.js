/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // enables `dark:` variants driven by a "dark" class
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './index.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {},
  },
  plugins: [],
};
