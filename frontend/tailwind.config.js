/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        netflix: {
          red: '#E50914',
          darkRed: '#B20710',
          dark: '#141414',
          black: '#000000',
          card: '#181818',
          cardHover: '#222222',
          elevated: '#2a2a2a',
          border: '#333333',
          muted: '#808080',
          light: '#E5E5E5',
        },
        stage: {
          950: '#0c0a09',
          900: '#141414',
          800: '#1f1f1f',
          700: '#2d2d2d',
          600: '#3f3f3f',
          100: '#f5f5f4',
        },
        gold: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        }
      },
      fontFamily: {
        screenplay: ['Courier Prime', 'Courier New', 'monospace'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'netflix-glow': '0 0 25px rgba(229, 9, 20, 0.45)',
        'netflix-card': '0 8px 24px rgba(0, 0, 0, 0.75)',
        'netflix-hover': '0 14px 36px rgba(0, 0, 0, 0.9)',
      }
    },
  },
  plugins: [],
}
