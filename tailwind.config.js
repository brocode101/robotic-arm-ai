/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#020617', // Deep space black
          panel: '#0f172a', // Dark blue-grey
          primary: '#0ea5e9', // Neon Cyan
          accent: '#f97316', // Neon Orange
          text: '#e2e8f0',
          muted: '#64748b',
          border: '#1e293b'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'], // Tech font
      },
      boxShadow: {
        'neon-blue': '0 0 10px rgba(14, 165, 233, 0.5)',
        'neon-orange': '0 0 10px rgba(249, 115, 22, 0.5)',
      }
    },
  },
  plugins: [],
}
