/** @type {import('tailwindcss').Config} */
export default {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: '#D4AF37',
          light: '#F5E6A3',
          dark: '#1A1500',
        },
        black: {
          DEFAULT: '#0A0A0A',
          card: '#111111',
          dark: '#141414',
        },
      },
      animation: {
        pulse_gold: 'pulse_gold 2s ease-in-out infinite',
        scan: 'scan 3s linear infinite',
        float: 'float 6s ease-in-out infinite',
      },
      keyframes: {
        pulse_gold: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.6', transform: 'scale(0.95)' },
        },
        scan: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(400%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
