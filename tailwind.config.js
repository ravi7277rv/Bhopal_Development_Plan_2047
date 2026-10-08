/** @type {import('tailwindcss').Config} */
export default {
content: [
  "./index.html",
  "./src/**/*.{js,ts,jsx,tsx}",
  "./src/**/*.{js,jsx,ts,tsx,vue,svelte}",  // extra safety
],
  safelist: [
    // ✅ Add all chip activeBg classes
    'bg-slate-800',
    'bg-red-600',
    'bg-amber-600',
    'bg-brandBlue-600',
    'bg-green-600',

    // ✅ Also add card strips
    'bg-slate-400',
    'bg-red-500',
    'bg-amber-500',
    'bg-brandBlue-500',
    'bg-green-500',

    // ✅ Icon badge bg
    'bg-red-100', 'text-red-700',
    'bg-amber-100', 'text-amber-700',
    'bg-brandBlue-100', 'text-brandBlue-700',
    'bg-green-100', 'text-green-700',
    'bg-slate-100', 'text-slate-700',

    // ✅ Chip bg
    'bg-red-50', 'text-red-700',
    'bg-amber-50', 'text-amber-700',
    'bg-brandBlue-50', 'text-brandBlue-700',
    'bg-green-50', 'text-green-700',

   'bg-blue-50',
  'text-blue-700',
  'bg-blue-100',
  'text-blue-700',
  'bg-blue-500',
  'bg-blue-600',
  'hover:border-blue-300',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#0f2744',
          primary: '#1a365d',
          light: '#f8fafc',
        },
        navyDark: "#0B253F",
        navy: "#102F4F",
        navyLight: "#173B5E",
        brandBlue: "#315F86",
        gold: "#F5B21B",
        goldDark: "#D99A00",
        goldLight: "#FFD66B",
        offWhite: "#F4F7FA",
        borderColor: "#D9E1E8",
        ink: "#173B5E",
        inkLight: "#65788A",
      },
      fontFamily: {
        segoe: ['"Segoe UI"', "Arial", "Helvetica", "sans-serif"],
      },
    },
  },
  plugins: [],
};