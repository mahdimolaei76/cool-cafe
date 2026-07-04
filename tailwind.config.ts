import type { Config } from "tailwindcss";

export default {
    darkMode: "class",

    content: [
        "./index.html",
        "./src/**/*.{ts,tsx,js,jsx}",
    ],

    theme: {
        extend: {
            /* =========================
               BRAND COLORS
            ========================= */
            colors: {
                brand: {
                    50: "#fef2f2",
                    100: "#fee2e2",
                    200: "#fecaca",
                    300: "#fca5a5",
                    400: "#f87171",
                    500: "#ef4444",
                    600: "#dc2626",
                    700: "#b91c1c",
                    800: "#991b1b",
                    900: "#7f1d1f",
                    950: "#450a0a",
                },
            },

            /* =========================
               TYPOGRAPHY
            ========================= */
            fontFamily: {
                sans: ["Vazirmatn", "Inter", "system-ui", "sans-serif"],
                serif: ["Playfair Display", "Georgia", "serif"],
            },

            /* =========================
               RADIUS SYSTEM
            ========================= */
            borderRadius: {
                xl: "0.9rem",
                "2xl": "1.2rem",
            },

            /* =========================
               SHADOW SYSTEM
            ========================= */
            boxShadow: {
                soft: "0 10px 30px rgba(0,0,0,0.08)",
                glow: "0 0 0 1px rgba(255,255,255,0.05), 0 10px 30px rgba(0,0,0,0.25)",
            },
        },
    },

    plugins: [],
} satisfies Config;