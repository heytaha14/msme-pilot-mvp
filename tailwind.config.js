/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Geist',
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
      },
      boxShadow: {
        glass: '0 18px 60px rgba(15, 23, 42, 0.08)',
        soft: '0 12px 32px rgba(15, 23, 42, 0.07)',
      },
      colors: {
        ink: '#0f172a',
      },
    },
  },
  plugins: [],
};
