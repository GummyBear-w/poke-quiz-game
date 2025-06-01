import React, { useState } from "react";
import "../styles/entry.css";
import { Sun, Moon, ChevronDown } from "lucide-react";
import GameSetupPage from "./GameSetupPage.jsx";
import GamePage from "./GamePage.jsx";
import ResultPage from "./ResultPage.jsx";
import MultiplayerEntryPage from "./MultiplayerEntryPage.jsx";
import MultiplayerLobby from "./MultiplayerLobby.jsx";

export default function EntryPage() {
	const [theme, setTheme] = useState("light");
	const [mode, setMode] = useState("");
	const [dropdownOpen, setDropdownOpen] = useState(false);
	const [step, setStep] = useState(1);
	const [gameSettings, setGameSettings] = useState(null);
	const [finalScore, setFinalScore] = useState(null);
	const [nickname, setNickname] = useState("");
	const [socket, setSocket] = useState(null);
	const [multiplayerSettings, setMultiplayerSettings] = useState(null);
	const [multiplayerResults, setMultiplayerResults] = useState(null);
	const [roomCode, setRoomCode] = useState("");
	const [isRoomCreator, setIsRoomCreator] = useState(false);

	const toggleTheme = () => {
		if (theme === "light") {
			setTheme("dark");
			document.documentElement.classList.add("dark");
		} else {
			setTheme("light");
			document.documentElement.classList.remove("dark");
		}
	};

	const handleModeSelect = (value) => {
		setMode(value);
		setDropdownOpen(false);
	};

	const handleStart = (settings) => {
		setGameSettings(settings);
		setStep(3);
	};

	const handleCreateRoom = (nickname) => {
		setNickname(nickname);
		setIsRoomCreator(true);
		// 生成隨機房間代碼 (6位英文數字組合)
		const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
		setRoomCode(randomCode);
		setStep(3); // 進入房間大廳
	};

	const handleJoinRoom = (nickname, roomCode) => {
		setNickname(nickname);
		setRoomCode(roomCode);
		setIsRoomCreator(false);
		setStep(3); // 進入房間大廳
	};

	// 多人模式結算畫面
	if (multiplayerResults !== null) {
		return (
			<ResultPage
				score={multiplayerResults.score}
				total={multiplayerResults.total}
				theme={theme}
				isMultiplayer={true}
				playerRanking={multiplayerResults.players}
				onRestart={() => {
					setMultiplayerResults(null);
					setStep(1);
				}}
			/>
		);
	}

	// 單人模式結算畫面
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

	// 多人遊戲入口頁面
	if (step === 2 && mode === "multiplayer") {
		return (
			<MultiplayerEntryPage
				theme={theme}
				onBack={() => setStep(1)}
				onToggleTheme={toggleTheme}
				onCreateRoom={handleCreateRoom}
				onJoinRoom={handleJoinRoom}
			/>
		);
	}

	// 多人遊戲房間大廳
	if (step === 3 && mode === "multiplayer") {
		return (
			<MultiplayerLobby
				theme={theme}
				onBack={() => setStep(2)} // 返回到多人入口頁面，而非首頁
				onToggleTheme={toggleTheme}
				nickname={nickname}
				roomCode={roomCode}
				isCreator={isRoomCreator} // 確保這個屬性名稱與 MultiplayerLobby 組件接受的一致
				onJoinGame={(
					nicknameFromLobby,
					socketInstance,
					settings,
					roomCodeFromLobby
				) => {
					// 確保所有參數都正確傳遞
					setNickname(nicknameFromLobby || nickname);
					setSocket(socketInstance);
					setMultiplayerSettings(settings);
					setRoomCode(roomCodeFromLobby || roomCode);
					console.log("進入遊戲頁面", settings);
					setStep(4); // 進入遊戲頁面
				}}
			/>
		);
	}

	// 多人遊戲進行中
	if (step === 4 && mode === "multiplayer") {
		return (
			<GamePage
				theme={theme}
				settings={{
					...multiplayerSettings,
					isMultiplayer: true,
					nickname,
					roomCode,
				}}
				socket={socket}
				onFinish={(score, playerData) => {
					// 設置多人遊戲結果
					setMultiplayerResults({
						score: score,
						total: multiplayerSettings?.questions || 10,
						players: playerData,
					});

					// 斷開連接
					if (socket) {
						socket.disconnect();
						setSocket(null);
					}
				}}
				onBackToHome={() => {
					setStep(1);
					// 斷開連接
					if (socket) {
						socket.disconnect();
						setSocket(null);
					}
				}}
				onToggleTheme={toggleTheme}
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
