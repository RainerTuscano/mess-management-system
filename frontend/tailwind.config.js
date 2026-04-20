/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          ink: "#1d2433",
          teal: "#0f766e",
          gold: "#c48a1b",
          mist: "#dff4f1",
          sand: "#f6ebd7",
          coral: "#c65d42"
        }
      },
      fontFamily: {
        display: ["Georgia", "Cambria", "Times New Roman", "serif"],
        body: ["Trebuchet MS", "Verdana", "sans-serif"]
      },
      boxShadow: {
        panel: "0 24px 60px rgba(18, 38, 63, 0.12)"
      },
      backgroundImage: {
        "hero-grid":
          "radial-gradient(circle at top, rgba(15,118,110,0.18), transparent 42%), linear-gradient(135deg, rgba(196,138,27,0.12), rgba(255,255,255,0) 45%), linear-gradient(rgba(29,36,51,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(29,36,51,0.04) 1px, transparent 1px)"
      },
      backgroundSize: {
        "hero-grid": "auto, auto, 22px 22px, 22px 22px"
      },
      keyframes: {
        rise: {
          "0%": { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      },
      animation: {
        rise: "rise 0.55s ease-out forwards"
      }
    }
  },
  plugins: []
};
