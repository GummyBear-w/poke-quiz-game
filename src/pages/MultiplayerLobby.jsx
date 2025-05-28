import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { Home, Sun, Moon, Settings } from "lucide-react";

export default function MultiplayerLobby({
	theme,
	onToggleTheme,
	onBack,
	onJoinGame,
}) {
	const [nickname, setNickname] = useState("");
	const [players, setPlayers] = useState([]);
	const [isWaiting, setIsWaiting] = useState(false);
	const [showSettings, setShowSettings] = useState(false);
	const socketRef = useRef(null);
	const [isHost, setIsHost] = useState(false);

	// 遊戲設定
	const [questions, setQuestions] = useState(10);
	const [timer, setTimer] = useState(15);

	// Socket 連接與事件處理
	useEffect(() => {
		if (!socketRef.current) return;

		const socket = socketRef.current;

		const handleLobbyUpdate = (data) => {
			console.log("📥 收到 lobby_update", data);
			setPlayers(data.players || []);
			// 檢查房主狀態
			const isRoomHost = data.hostId === socket.id;
			setIsHost(isRoomHost);
		};

		const handleGameStart = (gameSettings) => {
			console.log("✅ 收到 game_started", gameSettings);
			onJoinGame(nickname, socketRef.current, gameSettings);
		};

		socket.on("lobby_update", handleLobbyUpdate);
		socket.on("game_started", handleGameStart);

		return () => {
			socket.off("lobby_update", handleLobbyUpdate);
			socket.off("game_started", handleGameStart);
		};
	}, [nickname, onJoinGame]);

	const handleJoin = () => {
		if (nickname.trim()) {
			if (!socketRef.current) {
				const socket = io(
					import.meta.env.MODE === "development"
						? "http://localhost:3001"
						: "https://poke-quiz-server.onrender.com"
				);
				socketRef.current = socket;
			}
			socketRef.current.emit("join_lobby", nickname);
			setIsWaiting(true);
		}
	};

	const handleStart = () => {
		if (socketRef.current && isHost) {
			// 發送遊戲設定到伺服器
			socketRef.current.emit("start_game", {
				questions,
				timer,
			});
		}
	};

	return (
		<div className={`entry-page centered ${theme}`}>
			{/* Header */}
			<div className="top-bar flex justify-between items-center w-full max-w-2xl px-4">
				<button
					onClick={onBack}
					className="icon-button text-black dark:text-white padding-05"
				>
					<Home size={24} />
				</button>
				<h1 className="title text-lg sm:text-xl font-bold text-center">
					多人遊戲大廳
				</h1>
				<button
					onClick={onToggleTheme}
					className="icon-button text-black dark:text-white"
				>
					{theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
				</button>
			</div>

			{/* Content */}
			{!isWaiting ? (
				<div className="form-section">
					<input
						className="w-full p-2 rounded-md border mt-8"
						value={nickname}
						onChange={(e) => setNickname(e.target.value)}
						placeholder="請輸入暱稱"
					/>
					<button
						onClick={handleJoin}
						className="start-button mt-4"
						disabled={!nickname}
					>
						加入房間
					</button>
				</div>
			) : (
				<div className="form-section mt-8">
					<p className="mb-2">等待其他玩家中：</p>
					<ul className="text-left bg-white dark:bg-gray-800 rounded-lg p-4 mb-4">
						{players.map((p) => (
							<li key={p.id} className="mb-2 flex items-center">
								<span className="mr-2">🔸</span>
								{p.nickname}
								{p.id === socketRef.current?.id && (
									<span className="ml-2">(你)</span>
								)}
								{p.isHost && (
									<span className="ml-2 text-orange-500">(房主)</span>
								)}
							</li>
						))}
					</ul>

					{isHost && (
						<>
							<button
								onClick={() => setShowSettings(!showSettings)}
								className="text-button w-full flex justify-between items-center mb-4 p-3 bg-amber-100 dark:bg-amber-900 rounded-lg"
							>
								<span>{showSettings ? "收起設定" : "遊戲設定"}</span>
								<Settings size={18} />
							</button>

							{showSettings && (
								<div className="game-settings bg-white dark:bg-gray-800 rounded-lg p-4 mb-4">
									<label className="block-label">
										題目數量：{questions} 題
									</label>
									<input
										type="range"
										min={5}
										max={20}
										step={1}
										value={questions}
										onChange={(e) => setQuestions(Number(e.target.value))}
										className="w-full"
									/>

									<label className="block-label mt-3">
										回答時間：{timer} 秒
									</label>
									<input
										type="range"
										min={5}
										max={30}
										step={5}
										value={timer}
										onChange={(e) => setTimer(Number(e.target.value))}
										className="w-full"
									/>
								</div>
							)}
						</>
					)}

					<button
						onClick={handleStart}
						className={`start-button mt-4 ${
							!isHost ? "opacity-50 cursor-not-allowed" : ""
						}`}
						disabled={!isHost}
					>
						{isHost ? "開始遊戲" : "等待房主開始..."}
					</button>

					{!isHost && (
						<p className="text-sm text-center mt-2 text-gray-500">
							只有房主可以開始遊戲
						</p>
					)}
				</div>
			)}
		</div>
	);
}
