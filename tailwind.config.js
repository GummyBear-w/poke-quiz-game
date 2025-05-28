/** @type {import('tailwindcss').Config} */
export default {
	content: [
		"./index.html",
		"./src/**/*.{js,ts,jsx,tsx}", // ← 必要，才能偵測你寫在元件裡的 className
	],
	safelist: [
		// 明確列出需要保留的類名
		"dark:bg-orange-600",
		"dark:hover:bg-orange-700",
		"dark:text-black",
		"dark:text-white",
		"dark:bg-gray-700",
		"dark:bg-gray-800",
	],
	theme: {
		extend: {},
	},
	plugins: [],
};
