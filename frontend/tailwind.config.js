/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html","./src/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: {
    colors: { brand: { 50:"#eef2ff",500:"#6366f1",600:"#4f46e5",700:"#4338ca",900:"#312e81" } },
    keyframes: {
      fadeInUp: { "0%": { opacity: 0, transform: "translateY(12px)" }, "100%": { opacity: 1, transform: "translateY(0)" } },
      fadeIn: { "0%": { opacity: 0 }, "100%": { opacity: 1 } },
      liveGlow: {
        "0%, 100%": { boxShadow: "0 0 0 0 rgba(34,197,94,0.55)", borderColor: "rgba(74,222,128,1)" },
        "50%": { boxShadow: "0 0 0 5px rgba(34,197,94,0)", borderColor: "rgba(134,239,172,1)" },
      },
    },
    animation: {
      "fade-in-up": "fadeInUp 0.5s ease-out both",
      "fade-in": "fadeIn 0.6s ease-out both",
      "live-glow": "liveGlow 1.8s ease-in-out infinite",
    },
  } },
  plugins: []
};
