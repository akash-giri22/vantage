/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./pages/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: "#0A0E15",
        surface: "#121826",
        surface2: "#1A2233",
        ink: "#E8EDF5",
        inksoft: "#8A94A6",
        line: "#212B3C",
        teal: "#2DD4BF",
        indigo: "#8B93F8",
        amber: "#FBBF24"
      },
      fontFamily: {
        display: ["Sora", "sans-serif"],
        body: ["IBM Plex Sans", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"]
      }
    }
  },
  plugins: []
};
