/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 沿用現有 CSS 變數色彩系統
        'bg-primary': '#f5f5f5',
        'bg-card': '#ffffff',
        'text-primary': '#1a1a1a',
        'text-secondary': '#666666',
        'border': '#e0e0e0',
        'accent': '#2563eb',
        'danger': '#dc2626',
        'success': '#16a34a',
      },
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '6': '24px',
        '8': '32px',
      },
      borderRadius: {
        'sm': '4px',
        'md': '6px',
        'lg': '8px',
      },
    },
  },
  plugins: [],
}
