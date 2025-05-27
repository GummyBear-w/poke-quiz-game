import React, { useState } from "react";
import "../styles/entry.css";
import { Sun, Moon, ChevronDown } from "lucide-react";
import GameSetupPage from "./GameSetupPage.jsx";
import GamePage from "./GamePage.jsx";
import ResultPage from "./ResultPage.jsx";

export default function EntryPage() {
	const [theme, setTheme] = useState("light");
	const [mode, setMode] = useState("");
	const [dropdownOpen, setDropdownOpen] = useState(false);
	const [step, setStep] = useState(1);
	const [gameSettings, setGameSettings] = useState(null);
	const [finalScore, setFinalScore] = useState(null);

	const toggleTheme = () => {
		setTheme((prev) => (prev === "light" ? "dark" : "light"));
	};

	const handleModeSelect = (value) => {
		setMode(value);
		setDropdownOpen(false);
	};

	const handleStart = (settings) => {
		setGameSettings(settings);
		setStep(3); // 進入 GamePage
	};

	if (finalScore !== null) {
		return (
			<ResultPage
				score={finalScore}
				total={gameSettings.questions}
				theme={theme}
				onRestart={() => {
					setFinalScore(null);
					setStep(1); // 回首頁
				}}
			/>
		);
	}

	if (step === 2) {
		return (
			<GameSetupPage
				theme={theme}
				toggleTheme={toggleTheme}
				onBack={() => setStep(1)}
				onStart={handleStart}
			/>
		);
	}

	if (step === 3) {
		return (
			<GamePage
				theme={theme}
				settings={gameSettings}
				onFinish={(score) => {
					setFinalScore(score);
				}}
				onBackToHome={() => {
					setFinalScore(null);
					setStep(1); // 回首頁
				}}
				onToggleTheme={toggleTheme}
			/>
		);
	}

	return (
		<div className={`entry-page centered ${theme}`}>
			<div className="top-bar">
				<h1 className="title text-center w-full">寶可夢大廳</h1>
				<div className="absolute right-6">
					<button onClick={toggleTheme} className="theme-toggle icon-button">
						{theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
					</button>
				</div>
			</div>

			<div className="form-section">
				<label className="block-label">選擇模式：</label>

				<div
					className="custom-select"
					onClick={() => setDropdownOpen(!dropdownOpen)}
				>
					<span>
						{mode
							? mode === "quiz"
								? "寶可夢問答大賽"
								: mode
							: "請選擇遊戲模式"}
					</span>
					<ChevronDown size={16} />
					{dropdownOpen && (
						<ul className="custom-select-options">
							<li onClick={() => handleModeSelect("quiz")}>寶可夢問答大賽</li>
						</ul>
					)}
				</div>

				<button
					onClick={() => setStep(2)}
					className={`start-button ${!mode ? "disabled" : ""}`}
					disabled={!mode}
				>
					下一步
				</button>
			</div>
		</div>
	);
}
