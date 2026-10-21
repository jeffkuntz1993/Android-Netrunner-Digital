/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          dark: '#0a0b10',
          darker: '#050608',
          card: '#12151e',
          border: '#1f293d',
          neonCyan: '#00f0ff',
          neonPink: '#ff0055',
          neonYellow: '#ffe600',
          credit: '#ffb703',
          click: '#e63946',
          corp: '#00b4d8',
          runner: '#f72585',
        }
      },
      fontFamily: {
        mono: ['Fira Code', 'Courier New', 'monospace'],
        cyber: ['Orbitron', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
