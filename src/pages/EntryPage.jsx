import React, { useState } from "react";
import "../styles/entry.css";
import { Sun, Moon, ChevronDown } from "lucide-react";
import GameSetupPage from "./GameSetupPage.jsx";

export default function EntryPage() {
	const [theme, setTheme] = useState("light");
	const [mode, setMode] = useState("");
	const [dropdownOpen, setDropdownOpen] = useState(false);
	const [step, setStep] = useState(1);

	const toggleTheme = () => {
		setTheme((prev) => (prev === "light" ? "dark" : "light"));
	};

	const handleModeSelect = (value) => {
		setMode(value);
		setDropdownOpen(false);
	};

	const handleStart = (settings) => {
		console.log("最終設定：", settings);
		// TODO: 導入遊戲頁面
	};

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
