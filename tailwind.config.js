/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './views/**/*.ejs',
    './node_modules/flowbite/**/*.js',
    './node_modules/flowbite-datepicker/**/*.js'
  ],
  theme: {
    extend: {
      fontFamily: {
        slab: ['Epilogue Slab', 'sans-serif'],
        playpen: ['Google Sans Code', 'sans-serif'],
        joan: ['Joan', 'serif'],
        k2d: ['K2D', 'sans-serif'],
        kosugi: ['Kosugi', 'sans-serif'],
        literata: ['Literata', 'serif'],
        lexendgiga: ['Lexend Giga', 'sans-serif'],
        lexend: ['Lexend', 'sans-serif'],
        kantumruy: ['Kantumruy', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
        'kiwi-maru': ['Kiwi Maru', 'serif'],
        'encode-sans-semi-condensed': [
          'Encode Sans Semi Condensed',
          'sans-serif'
        ],
        body: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'system-ui',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'Noto Sans',
          'sans-serif',
          'Apple Color Emoji',
          'Segoe UI Emoji',
          'Segoe UI Symbol',
          'Noto Color Emoji'
        ],
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'system-ui',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'Noto Sans',
          'sans-serif',
          'Apple Color Emoji',
          'Segoe UI Emoji',
          'Segoe UI Symbol',
          'Noto Color Emoji'
        ]
      },
      animation: {
        shimmer: 'shimmer 2s linear infinite'
      },
      keyframes: {
        shimmer: {
          from: {
            backgroundPosition: '0 0'
          },
          to: {
            backgroundPosition: '-200% 0'
          }
        }
      },
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554'
        }
      }
    }
  },
  plugins: [require('flowbite/plugin')]
}
