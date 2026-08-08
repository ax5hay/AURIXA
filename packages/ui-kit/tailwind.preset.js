module.exports = {
  theme: {
    extend: {
      colors: {
        ui: {
          canvas: "rgb(var(--ui-canvas-rgb) / <alpha-value>)",
          "canvas-subtle": "rgb(var(--ui-canvas-subtle-rgb) / <alpha-value>)",
          surface: "rgb(var(--ui-surface-rgb) / <alpha-value>)",
          "surface-raised": "rgb(var(--ui-surface-raised-rgb) / <alpha-value>)",
          "surface-inset": "rgb(var(--ui-surface-inset-rgb) / <alpha-value>)",
          ink: "rgb(var(--ui-ink-rgb) / <alpha-value>)",
          muted: "rgb(var(--ui-ink-muted-rgb) / <alpha-value>)",
          faint: "rgb(var(--ui-ink-faint-rgb) / <alpha-value>)",
          border: "var(--ui-border)",
          "border-strong": "var(--ui-border-strong)",
          accent: "rgb(var(--ui-accent-rgb) / <alpha-value>)",
          "accent-strong": "rgb(var(--ui-accent-strong-rgb) / <alpha-value>)",
          "accent-ink": "rgb(var(--ui-accent-ink-rgb) / <alpha-value>)",
          tint: "rgb(var(--ui-tint-rgb) / <alpha-value>)",
          highlight: "rgb(var(--ui-highlight-rgb) / <alpha-value>)",
          danger: "rgb(var(--ui-danger-rgb) / <alpha-value>)",
          warning: "rgb(var(--ui-warning-rgb) / <alpha-value>)",
          success: "rgb(var(--ui-success-rgb) / <alpha-value>)",
          info: "rgb(var(--ui-info-rgb) / <alpha-value>)",
        },
        aurixa: {
          50: "#f0f4ff",
          100: "#dbe4ff",
          200: "#bac8ff",
          300: "#91a7ff",
          400: "#748ffc",
          500: "#5c7cfa",
          600: "#4c6ef5",
          700: "#4263eb",
          800: "#3b5bdb",
          900: "#364fc7",
          950: "#2b3fa0",
        },
        surface: {
          primary: "#0a0a0f",
          secondary: "#12121a",
          tertiary: "#1a1a25",
          elevated: "#22222f",
        },
        accent: {
          success: "#51cf66",
          warning: "#fcc419",
          error: "#ff6b6b",
          info: "#74c0fc",
        },
      },
      fontFamily: {
        sans: ["var(--ui-font-body)", "system-ui", "sans-serif"],
        display: ["var(--ui-font-display)", "Georgia", "serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        "ui-sm": "var(--ui-radius-sm)",
        "ui-md": "var(--ui-radius-md)",
        "ui-lg": "var(--ui-radius-lg)",
        "ui-xl": "var(--ui-radius-xl)",
      },
      boxShadow: {
        "ui-soft": "var(--ui-shadow-soft)",
        ui: "var(--ui-shadow)",
      },
      keyframes: {
        "ui-toast-in": {
          from: { opacity: "0", transform: "translateY(0.75rem) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
      animation: {
        "ui-toast-in": "ui-toast-in 220ms cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
};
