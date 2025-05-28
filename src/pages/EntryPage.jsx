import React, { useState } from "react";
import "../styles/entry.css";
import { Sun, Moon, ChevronDown } from "lucide-react";
import GameSetupPage from "./GameSetupPage.jsx";
import GamePage from "./GamePage.jsx";
import ResultPage from "./ResultPage.jsx";
// 多人頁面預留（之後我們會建立）
import MultiplayerLobby from "./MultiplayerLobby.jsx";

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
		setStep(3);
	};

	// 結算畫面
	if (finalScore !== null) {
		return (
			<ResultPage
				score={finalScore}
				total={gameSettings.questions}
				theme={theme}
				onRestart={() => {
					setFinalScore(null);
					setStep(1);
				}}
			/>
		);
	}

	// 單人遊戲設定頁面
	if (step === 2 && mode === "quiz") {
		return (
			<GameSetupPage
				theme={theme}
				toggleTheme={toggleTheme}
				onBack={() => setStep(1)}
				onStart={handleStart}
			/>
		);
	}

	// 單人遊戲進行中
	if (step === 3 && mode === "quiz") {
		return (
			<GamePage
				theme={theme}
				settings={gameSettings}
				onFinish={(score) => {
					setFinalScore(score);
				}}
				onBackToHome={() => {
					setFinalScore(null);
					setStep(1);
				}}
				onToggleTheme={toggleTheme}
			/>
		);
	}

	if (step === 2 && mode === "multiplayer") {
		return (
			<MultiplayerLobby
				theme={theme}
				onBack={() => setStep(1)}
				onToggleTheme={toggleTheme}
				onJoinGame={(nicknameFromLobby) => {
					setNickname(nicknameFromLobby);
					console.log("✅ 成功進入多人遊戲，暱稱：", nicknameFromLobby);
					// 之後 setStep(4) 進入 MultiplayerGamePage
				}}
			/>
		);
	}

	// 首頁
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
						{mode === "quiz"
							? "寶可夢問答大賽"
							: mode === "multiplayer"
							? "多人對戰模式"
							: "請選擇遊戲模式"}
					</span>
					<ChevronDown size={16} />
					{dropdownOpen && (
						<ul className="custom-select-options">
							<li onClick={() => handleModeSelect("quiz")}>寶可夢問答大賽</li>
							<li onClick={() => handleModeSelect("multiplayer")}>
								多人對戰模式
							</li>
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
