/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand — medical navy/blue
        brand: {
          50:  '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
          950: '#172554',
        },
        // Surface / ink semantic tokens, used via dark: variants
        surface: {
          light:  '#FFFFFF',
          alt:    '#F8FAFC',
          dark:   '#0A0A0A',
          'dark-alt': '#141414',
        },
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Instrument Serif"', 'Georgia', 'serif'],
      },
      boxShadow: {
        'soft':  '0 1px 6px rgba(15, 23, 42, .07), 0 1px 2px rgba(15, 23, 42, .04)',
        'card':  '0 4px 20px rgba(15, 23, 42, .09), 0 1px 4px rgba(15, 23, 42, .05)',
        'lift':  '0 12px 40px rgba(15, 23, 42, .12), 0 4px 12px rgba(15, 23, 42, .06)',
        'glow':  '0 0 0 3px rgba(37, 99, 235, .18)',
        'glass': '0 8px 32px rgba(0, 0, 0, .12)',
      },
      backdropBlur: { xs: '2px' },
      animation: {
        'fade-in':   'fadeIn .2s ease-out',
        'slide-up':  'slideUp .2s ease-out',
        'spin-slow': 'spin 1.4s linear infinite',
        'shimmer':   'shimmer 1.4s infinite',
        'pulse-soft':'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:    { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp:   { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        shimmer:   { to: { backgroundPosition: '-200% 0' } },
        pulseSoft: { '0%,100%': { opacity: 1 }, '50%': { opacity: .6 } },
      },
    },
  },
  plugins: [],
}
