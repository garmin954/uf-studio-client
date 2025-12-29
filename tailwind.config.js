/** @type {import('tailwindcss').Config} */

export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      transitionDuration: {
        '2000': '2000ms',
      },
      colors: {
        border: "hsl(var(--border))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        nav: {
          DEFAULT: "hsl(var(--nav))",
          foreground: "hsl(var(--nav-foreground))",
        },
        subtext: {
          DEFAULT: "hsl(var(--subtext))",
        },
        disabled: {
          DEFAULT: "hsl(var(--disabled))",
        }
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      height: {
        default: "3.11rem",
      },
      fontSize: {
        small: "1.08rem",    // 小号（原 1-08，保持一致）
        default: "1.18rem",  // 默认（原 1-18，核心基础字号）
        "base-plus": "1.25rem", // 基础加大（原 1-25，比默认大一点）
        medium: "1.33rem",   // 中号（原 1-33，保留原有命名）
        large: "1.5rem",     // 大号（原 1-5，保留原有命名）
        "large-plus": "1.66rem", // 大号加大（原 1-66，比大号大一点）
        max: "1.78rem", // 最大号（原 1-83，比大号加大号大一点）
      },
      shadow: {
        default: "0px 1px 2px 0px rgba(0,0,0,0.06), 0px 1px 3px 0px rgba(0,0,0,0.1)"
      }
    }
  },
  plugins: [import("tailwindcss-animate")],
}