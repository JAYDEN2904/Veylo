/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#1A1C1E",
        secondary: "#F3E5AB",
        accent: "#4338CA",
        success: "#10B981",
        warning: "#F59E0B",
        error: "#EF4444",
        background: "#F8F9FA",
        surface: "#FFFFFF",
        card: "#FFFFFF",
      },
      fontFamily: {
        sans: ["System"],
        bold: ["System"],
        heading: ["System"],
        body: ["System"],
      },
    },
  },
  plugins: [],
}















