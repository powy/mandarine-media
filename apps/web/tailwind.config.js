/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'kyool-blue': '#28ceee',
        'kyool-green': '#2ad46d',
      }
    },
  },
  plugins: [],
}