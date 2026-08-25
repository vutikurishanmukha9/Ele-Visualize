# Theme & Design System

## Part 1 — Compact Token Summary

- **Design Aesthetic**: Scientific Laboratory Porcelain, Frosted Glass, High-Precision Instruments with Emerald Accent.
- **Color Tokens**:
  - `canvas`: `#f8faf8` (clean laboratory porcelain base)
  - `surface-1`: `#ffffff` (card and inspector container)
  - `surface-2`: `#f5f8f6`
  - `surface-soft`: `#e6f6ef` (soft emerald tint)
  - `primary`: `#16a875` (luminous emerald)
  - `primary-dark`: `#087f5b`
  - `ink`: `#14231e`
  - `ink-muted`: `#5a6e65`
  - `border`: `#e2e8e4` / `rgba(20, 35, 30, 0.08)`
  - `element.alkali`: `#FF3366`
  - `element.alkaline`: `#FF9933`
  - `element.transition`: `#FFCC33`
  - `element.postTransition`: `#33CC99`
  - `element.metalloid`: `#33CCCC`
  - `element.nonmetal`: `#3399FF`
  - `element.halogen`: `#9933FF`
  - `element.noble`: `#CC33FF`
  - `element.lanthanide`: `#FF66CC`
  - `element.actinide`: `#FF3333`
- **Typography**:
  - `font-sans`: `Plus Jakarta Sans`, `-apple-system`, `sans-serif`
  - `font-serif`: `Newsreader`, `Playfair Display`, `serif`
  - `font-mono`: `JetBrains Mono`, `Space Grotesk`, `monospace`
- **Border Radius**: `12px` (`var(--radius)`)
- **Shadows**:
  - `shadow-card`: `0 1px 2px rgba(15, 30, 25, 0.04), 0 8px 24px rgba(15, 30, 25, 0.06)`
  - `shadow-emerald`: `0 8px 20px -4px rgba(22, 168, 117, 0.35)`

---

## Part 2 — Raw Source Dumps

### `tailwind.config.ts`
```typescript
import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Space Grotesk", "system-ui", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
```

### `index.css`
```css
@import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400..700;1,6..72,400..700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 140 20% 98%;
    --foreground: 160 28% 11%;
    --card: 0 0% 100%;
    --card-foreground: 160 28% 11%;
    --primary: 160 76% 37%;
    --primary-foreground: 0 0% 100%;
    --secondary: 150 20% 96%;
    --muted: 150 20% 96%;
    --muted-foreground: 155 12% 40%;
    --border: 150 15% 90%;
    --radius: 12px;
  }
}
```
