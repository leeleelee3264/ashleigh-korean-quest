/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        pixel: ['"Press Start 2P"', "monospace"],
        body: ['"Quicksand"', "sans-serif"],
      },
      colors: {
        quest: {
          bg: "#FFF8F0",
          ink: "#3D2C5C",
          accent: "#FF8FAB",
          gold: "#FFD166",
          mint: "#9BE3C6",
          sky: "#A0C8FF",
          shadow: "#2A1F3D",
        },
      },
      boxShadow: {
        pixel: "4px 4px 0 0 #2A1F3D",
        "pixel-sm": "2px 2px 0 0 #2A1F3D",
      },
    },
  },
  plugins: [],
};
