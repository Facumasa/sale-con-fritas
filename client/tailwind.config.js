/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#E8FFF3',
          100: '#7FE5A8',
          500: '#2DD881',
          600: '#1BA861',
          700: '#158A4D',
          DEFAULT: '#2DD881',
        },
      },
    },
  },
  plugins: [],
}
