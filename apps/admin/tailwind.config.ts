import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: { 50: '#faf5ff', 100: '#f3e8ff', 200: '#e9d5ff', 300: '#d8b4fe', 400: '#c084fc', 500: '#a855f7', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6', 900: '#4c1d95' },
        pink: { 50: '#fdf2f8', 100: '#fce7f3', 500: '#ec4899', 600: '#db2777' },
        success: '#10b981',
        danger: '#ef4444',
      },
      fontFamily: { sans: ['Cairo', 'system-ui', 'sans-serif'] },
      borderRadius: { '2xl': '1rem', '3xl': '1.5rem', '4xl': '2rem' },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
        'gradient-soft': 'linear-gradient(135deg, #faf5ff 0%, #fdf2f8 100%)',
      },
    },
  },
  plugins: [],
}
export default config
