/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#1890FF",
        sidebar: "#001529",
        "sidebar-hover": "#0d2137",
        surface: "#F0F2F5",
      },
    },
  },
  plugins: [],
};
