import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      boxShadow: {
        glow: "0 0 0 1px rgba(255,255,255,.08), 0 10px 30px rgba(0,0,0,.45)",
        soft: "0 1px 0 rgba(255,255,255,.06), 0 18px 50px rgba(0,0,0,.45)"
      },
      borderRadius: {
        "2xl": "1.25rem",
        "3xl": "1.75rem"
      },
      keyframes: {
        shimmer: {
          "0%": { transform: "translateX(-60%)" },
          "100%": { transform: "translateX(160%)" }
        },
        floaty: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" }
        },
        hue: {
          "0%": { filter: "hue-rotate(0deg)" },
          "100%": { filter: "hue-rotate(360deg)" }
        }
      },
      animation: {
        shimmer: "shimmer 2.2s ease-in-out infinite",
        floaty: "floaty 5s ease-in-out infinite",
        hue: "hue 14s linear infinite"
      }
    },
  },
  plugins: [],
};

export default config;
