/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",  // ← 必要，才能偵測你寫在元件裡的 className
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
