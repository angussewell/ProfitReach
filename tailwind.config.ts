import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-lexend)', 'system-ui', 'sans-serif'],
      },
      colors: {
        'hubspot': {
          orange: '#ff7a59',
          'orange-light': '#ff8f73',
          'orange-dark': '#f65c3e',
          blue: '#2e475d',
          'blue-light': '#516f90',
          'blue-dark': '#213343',
          gray: '#516f90',
          'gray-light': '#f5f8fa',
          'gray-dark': '#2d3e50',
        },
      },
    },
  },
  plugins: [],
  future: {
    hoverOnlyWhenSupported: true,
  },
  darkMode: 'class',
} satisfies Config;
