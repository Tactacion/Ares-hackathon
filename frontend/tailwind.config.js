/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'ares-primary': '#1e3a8a',
        'ares-secondary': '#3b82f6',
        'ares-danger': '#dc2626',
        'ares-warning': '#f59e0b',
        'ares-success': '#10b981',
      }
    },
  },
  plugins: [],
}
