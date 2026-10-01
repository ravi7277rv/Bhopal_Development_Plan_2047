/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#0f2744', // Deep blue header
          primary: '#1a365d',
          light: '#f8fafc'
        }
      }
    },
  },
  plugins: [],
}