import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/presentation/**/*.{ts,tsx}',
    './src/app/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#d9e6ff',
          200: '#b6cdff',
          300: '#85acff',
          400: '#4d83ff',
          500: '#2563ff',
          600: '#1a4ae6',
          700: '#1638b8',
          800: '#162f8f',
          900: '#162a73',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;