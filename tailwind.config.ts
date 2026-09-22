import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: "#0b1f3a",
          800: "#102a4c",
          700: "#173a63",
        },
        gold: {
          500: "#b8944f",
          600: "#a17f3f",
        },
      },
    },
  },
  plugins: [],
};

export default config;
