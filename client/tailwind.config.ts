import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#0a0a0f",
        surface: "rgba(255, 255, 255, 0.05)",
        "surface-hover": "rgba(255, 255, 255, 0.08)",
        "surface-active": "rgba(255, 255, 255, 0.12)",
        border: "rgba(255, 255, 255, 0.1)",
        costco: {
          DEFAULT: "#F5A623",
          glow: "rgba(245, 166, 35, 0.3)",
        },
        fredmeyer: {
          DEFAULT: "#00A3E0",
          glow: "rgba(0, 163, 224, 0.3)",
        },
        indianstores: {
          DEFAULT: "#FF6B35",
          glow: "rgba(255, 107, 53, 0.3)",
        },
      },
      backdropBlur: {
        glass: "20px",
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
        "glass-sm": "0 4px 16px 0 rgba(0, 0, 0, 0.25)",
        glow: "0 0 20px var(--glow-color, rgba(255, 255, 255, 0.1))",
      },
      keyframes: {
        "slide-in": {
          "0%": { transform: "translateY(-10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "slide-out": {
          "0%": { transform: "translateX(0)", opacity: "1" },
          "100%": { transform: "translateX(100%)", opacity: "0" },
        },
        "fade-up": {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "check-bounce": {
          "0%": { transform: "scale(0)" },
          "50%": { transform: "scale(1.2)" },
          "100%": { transform: "scale(1)" },
        },
        float: {
          "0%, 100%": { transform: "translate(0, 0)" },
          "33%": { transform: "translate(10px, -10px)" },
          "66%": { transform: "translate(-5px, 5px)" },
        },
      },
      animation: {
        "slide-in": "slide-in 0.3s ease-out",
        "slide-out": "slide-out 0.3s ease-in forwards",
        "fade-up": "fade-up 0.4s ease-out",
        "check-bounce": "check-bounce 0.3s ease-out",
        float: "float 15s ease-in-out infinite",
        "float-delayed": "float 20s ease-in-out infinite 5s",
        "float-slow": "float 25s ease-in-out infinite 10s",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
