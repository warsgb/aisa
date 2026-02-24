/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary color - Blue #1677FF
        primary: {
          DEFAULT: '#1677FF',
          50: '#e6f0ff',
          100: '#cce0ff',
          200: '#99c2ff',
          300: '#66a3ff',
          400: '#3385ff',
          500: '#1677FF',
          600: '#005ee5',
          700: '#0052b3',
          800: '#003d82',
          900: '#002951',
        },
        // Background color
        background: '#f5f7fa',
        // Accent colors
        accent: {
          hot: '#f97316',
          success: '#22c55e',
          info: '#3b82f6',
        },
        // Text colors
        text: {
          primary: '#1f2937',
          secondary: '#6b7280',
          muted: '#9ca3af',
        },
        // Legacy brand color @deprecated - Use primary instead
        brand: {
          DEFAULT: '#1677FF',
          50: '#e6f0ff',
          100: '#cce0ff',
          200: '#99c2ff',
          300: '#66a3ff',
          400: '#3385ff',
          500: '#1677FF',
          600: '#005ee5',
          700: '#0052b3',
          800: '#003d82',
          900: '#002951',
        },
        // Dark sidebar
        sidebar: {
          DEFAULT: '#1E293B',
          50: '#3b4b64',
          100: '#334155',
          200: '#2c3849',
          300: '#252f3f',
          400: '#1E293B',
        },
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
      },
      boxShadow: {
        'card': '0 2px 8px rgba(0,0,0,0.08)',
        'card-hover': '0 4px 16px rgba(0,0,0,0.12)',
      },
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-top': 'env(safe-area-inset-top)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
    },
  },
  plugins: [],
}
