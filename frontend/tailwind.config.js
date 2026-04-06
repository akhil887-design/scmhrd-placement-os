/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      colors: {
        surface: {
          DEFAULT: '#f5f5f7',
          card: '#ffffff',
        },
        ink: {
          DEFAULT: '#1d1d1f',
          muted: '#6e6e73',
        },
        accent: {
          DEFAULT: '#0071e3',
          soft: '#e8f1ff',
        },
      },
      boxShadow: {
        soft: '0 2px 16px rgba(0,0,0,0.06)',
        card: '0 1px 3px rgba(0,0,0,0.04)',
      },
    },
  },
  plugins: [],
};
