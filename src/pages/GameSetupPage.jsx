import React, { useState } from "react";
import "../styles/entry.css";
import { ArrowLeft, Sun, Moon } from "lucide-react";

export default function GameSetupPage({ theme, onBack, onStart, toggleTheme }) {
	const [questions, setQuestions] = useState(5);
	const [timer, setTimer] = useState(5);

	const startGame = () => {
		const settings = { questions, timer };
		onStart(settings); // 回傳給 EntryPage
	};

	return (
		<div className={`entry-page centered ${theme}`}>
			<div className="top-bar relative">
				{/* 返回按鈕 - 左上角固定 */}
				<button
					onClick={onBack}
					className="icon-button absolute left-0 top-1/2 -translate-y-1/2"
				>
					<ArrowLeft size={22} />
				</button>

				{/* 標題 - 完全置中 */}
				<h1 className="title text-center w-full">遊戲設定</h1>

				{/* 主題切換 - 右上角固定 */}
				<button
					onClick={toggleTheme}
					className="icon-button absolute right-0 top-1/2 -translate-y-1/2"
				>
					{theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
				</button>
			</div>

			<div className="form-section">
				<label className="block-label">題目數量：{questions} 題</label>
				<input
					type="range"
					min={5}
					max={20}
					step={1}
					value={questions}
					onChange={(e) => setQuestions(Number(e.target.value))}
				/>

				<label className="block-label">倒數秒數（每題）：{timer} 秒</label>
				<input
					type="range"
					min={5}
					max={30}
					step={5}
					value={timer}
					onChange={(e) => setTimer(Number(e.target.value))}
				/>

				<div className="flex gap-4 mt-4">
					<button className="start-button w-full" onClick={startGame}>
						開始遊戲
					</button>
				</div>
			</div>
		</div>
	);
}
