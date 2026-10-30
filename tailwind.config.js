/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './client/**/*.{js,jsx}'],
  theme: { extend: { colors: { learnhub: { ink: '#292832', purple: '#7557dc', cream: '#fcfbf9' } } } },
  plugins: []
};