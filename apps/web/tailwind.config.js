/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary:   "#2E7D32",
        "primary-light": "#4CAF50",
        "primary-pale": "#E8F5E9",
        "primary-dark": "#1B5E20",
        accent:    "#00C853",
        "green-dark": "#388E3C",
        "alert-red": "#E53935",
        orange:    "#FB8C00",
        bg:        "#F4F7F4",
        card:      "#FFFFFF",
        "text-primary": "#1B1B1B",
        "text-secondary": "#6B6B6B",
      },
    },
  },
  plugins: [],
};
