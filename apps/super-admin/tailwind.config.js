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
          50: '#EBF5FC',
          100: '#D1EAF9',
          200: '#A3D5F3',
          300: '#6BC0ED',
          400: '#4DC4F0',
          500: '#2380D6',
          600: '#1A73C7',
          700: '#155FA8',
          800: '#0D3D75',
          900: '#082F5C',
        },
        brand: {
          light: '#4DC4F0',
          DEFAULT: '#2380D6',
          dark: '#0D3D75',
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


