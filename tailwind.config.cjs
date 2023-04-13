/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{html,js,svelte,ts}"],
  // darkMode: "class",
  theme: {
    extend: {
      colors: {
        dark: {
          100: "#040303"
        }
      }
    },
  },
  plugins: [],
}

