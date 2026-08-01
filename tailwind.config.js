/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#EBF5FB',
          100: '#D6EAF8',
          200: '#AED6F1',
          300: '#85C1E9',
          400: '#5DADE2',
          500: '#1B4F72',
          600: '#1A4A6B',
          700: '#154360',
          800: '#11354D',
          900: '#0D2840',
        },
        success: {
          50: '#E8F8F5',
          100: '#D1F2EB',
          200: '#A3E4D7',
          300: '#76D7C4',
          400: '#48C9B0',
          500: '#1E8449',
          600: '#1B7A43',
          700: '#186A3B',
          800: '#145A32',
          900: '#0E4028',
        },
        medical: {
          blue: '#1B4F72',
          green: '#1E8449',
          orange: '#E67E22',
          red: '#E74C3C',
          light: '#F8F9FA',
          dark: '#2C3E50',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
