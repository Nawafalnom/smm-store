/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          "social-waves": "#00d4ff",
          "boost-syria": "#00ff88",
          "rumor-media": "#c840ff",
          "fivestars": "#ffd700",
          "social-spark": "#ff4d00",
        },
        dark: {
          900: "#0a0a0f",
          800: "#12121a",
          700: "#1a1a28",
          600: "#222236",
          500: "#2a2a40",
        },
      },
      fontFamily: {
        arabic: ["Tajawal", "sans-serif"],
        display: ["Cairo", "sans-serif"],
      },
    },
  },
  plugins: [],
};
