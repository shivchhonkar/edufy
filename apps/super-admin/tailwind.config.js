/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/shared/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: 'var(--theme-primary-50)',
          100: 'var(--theme-primary-100)',
          200: 'var(--theme-primary-200)',
          300: 'var(--theme-primary-300)',
          400: 'var(--theme-primary-400)',
          500: 'var(--theme-primary-500)',
          600: 'var(--theme-primary-600)',
          700: 'var(--theme-primary-700)',
          800: 'var(--theme-primary-800)',
          900: 'var(--theme-primary-900)',
        },
        brand: {
          light: 'var(--theme-secondary)',
          DEFAULT: 'var(--theme-accent)',
          dark: 'var(--theme-brand-dark)',
        },
        secondary: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce',
          800: '#6b21a8',
          900: '#581c87',
        },
      },
    },
  },
  plugins: [],
}


