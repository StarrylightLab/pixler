/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    // Override border radius to be 0 for the pixel-art look
    borderRadius: {
      'none': '0',
      'sm': '0',
      DEFAULT: '0',
      'md': '0',
      'lg': '0',
      'xl': '0',
      '2xl': '0',
      '3xl': '0',
      'full': '0',
    },
    extend: {
      fontFamily: {
        sans: ['PixelMain', 'Inter', 'system-ui', 'sans-serif'],
        // Updated to use PixelIBM (JetB) for monospace
        mono: ['PixelIBM', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        // Specific families mapped to general
        zh: ['PixelMain', 'sans-serif'],
        ja: ['PixelMain', 'sans-serif'],
        en: ['PixelMain', 'sans-serif'],
        ibm: ['PixelIBM', 'monospace'],
      },
      colors: {
        primary: {
          DEFAULT: '#D9367F',
          50: '#FDF2F8',
          100: '#FCE7F3',
          200: '#FBCFE8',
          300: '#F9A8D4',
          400: '#F472B6',
          500: '#D9367F',
          600: '#DB2777',
          700: '#BE185D',
          800: '#9D174D',
          900: '#831843'
        },
        gray: {
          750: '#2d3748',
          850: '#1a202c',
          950: '#0d1117',
        }
      }
    }
  },
  plugins: [],
}