import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Fresh Mint Palette
        primary: {
          DEFAULT: 'oklch(0.62 0.14 165)',
          dark: 'oklch(0.52 0.14 165)',
          light: 'oklch(0.72 0.12 165)',
          foreground: 'oklch(1 0 0)',
        },
        secondary: {
          DEFAULT: 'oklch(0.48 0.12 215)',
          dark: 'oklch(0.38 0.12 215)',
          light: 'oklch(0.58 0.10 215)',
          foreground: 'oklch(1 0 0)',
        },
        accent: {
          DEFAULT: 'oklch(0.65 0.18 85)',
          dark: 'oklch(0.55 0.18 85)',
          light: 'oklch(0.75 0.15 85)',
          foreground: 'oklch(0.20 0.06 85)',
        },
        background: {
          DEFAULT: 'oklch(0.98 0.01 145)',
          dark: 'oklch(0.94 0.02 145)',
        },
        surface: {
          DEFAULT: 'oklch(1 0 0)',
          muted: 'oklch(0.96 0.01 145)',
          border: 'oklch(0.88 0.02 145)',
        },
        text: {
          primary: 'oklch(0.20 0.06 165)',
          secondary: 'oklch(0.40 0.05 165)',
          muted: 'oklch(0.60 0.03 165)',
          inverse: 'oklch(0.98 0.01 145)',
        },
        status: {
          success: 'oklch(0.62 0.14 165)',
          warning: 'oklch(0.68 0.18 85)',
          error: 'oklch(0.62 0.18 25)',
          info: 'oklch(0.55 0.12 215)',
        },
        // Поддержка CSS-переменных из global.css
        booking: 'var(--booking)',
        'booking-hover': 'var(--booking-hover)',
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        foreground: 'var(--foreground)',
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
      },
      borderRadius: {
        'lg': 'var(--radius)',
        'md': 'calc(var(--radius) - 2px)',
        'sm': 'calc(var(--radius) - 4px)',
        'xl': 'calc(var(--radius) + 4px)',
        '2xl': 'calc(var(--radius) + 8px)',
        '3xl': 'calc(var(--radius) + 12px)',
        '4xl': 'calc(var(--radius) + 16px)',
      },
      boxShadow: {
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'primary': 'var(--shadow-primary)',
        'card': 'var(--shadow-card)',
        'card-hover': 'var(--shadow-card-hover)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'scale-up': 'scaleUp 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleUp: {
          '0%': { transform: 'scale(0.95)' },
          '100%': { transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}

export default config