/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        studio: {
          950: '#0b0d11',
          900: '#11141a',
          850: '#161a22',
          800: '#1c212b',
          750: '#232936',
          700: '#2c3342',
          600: '#3d4659',
          500: '#58647e',
          400: '#8491ac',
          300: '#b2bcd0',
          200: '#d7ddeb',
          100: '#f0f3f9',
          50: '#f8fafc',
        },
        accent: {
          500: '#e14337',
          600: '#c53127',
          700: '#a3241c',
          amber: '#f59e0b',
          blue: '#3b82f6',
          emerald: '#10b981',
        },
        vintage: {
          red: '#8C342D',
          cream: '#F7F3E8',
          border: '#D3C9B4',
          sand: '#EAE1CC',
          ink: '#2B2724',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Cinzel', 'Oswald', 'Montserrat', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
