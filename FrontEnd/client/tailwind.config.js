/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#0A0A0B',
        surface: '#141416',
        'surface-2': '#1C1C1F',
        line: 'rgba(255,255,255,0.08)',
        'line-strong': 'rgba(255,255,255,0.14)',
        ink: '#F5F3EF',
        'ink-muted': '#9A9A9E',
        glass: 'rgba(255,255,255,0.06)',
        'glass-strong': 'rgba(255,255,255,0.10)',
        // Muted gold accent. `accent.fg` is the near-black ink that sits ON gold.
        accent: {
          DEFAULT: '#E4C590',
          fg: '#0A0A0B',
          soft: 'rgba(228,197,144,0.14)',
          line: 'rgba(228,197,144,0.32)',
        },
      },
      fontFamily: {
        // `sans` is the default UI face; `display` (Playfair) is opt-in on headings.
        sans: ['"DM Sans Variable"', 'system-ui', 'sans-serif'],
        display: ['"Playfair Display Variable"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono Variable"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        lg: '16px',
        xl: '22px',
        '2xl': '28px',
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.12)',
        'glass-sm': '0 4px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.10)',
        glow: '0 0 24px rgba(228,197,144,0.30)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        shimmer: 'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [],
};
