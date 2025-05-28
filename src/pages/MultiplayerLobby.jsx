import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { Home, Sun, Moon, Copy, Users } from "lucide-react";

export default function MultiplayerLobby({
	theme,
	onToggleTheme,
	onBack,
	onJoinGame,
	nickname,
	roomCode,
	isCreator,
}) {
	// 初始化狀態
	const [players, setPlayers] = useState([]);
	const [showPlayers, setShowPlayers] = useState([]); // 用於顯示的玩家列表，包含自己
	const socketRef = useRef(null);
	const [isHost, setIsHost] = useState(isCreator);
	const [connectionStatus, setConnectionStatus] = useState("連線中...");
	const [connectionError, setConnectionError] = useState("");
	const [copied, setCopied] = useState(false);

	// 遊戲設定 - 移除最大玩家數設置
	const [questions, setQuestions] = useState(10);
	const [timer, setTimer] = useState(15);
	const maxPlayers = 5; // 固定為5人

	// Socket 連接與事件處理
	useEffect(() => {
		try {
			// 創建連線
			const socket = io(
				import.meta.env.MODE === "development"
					? "http://localhost:3001"
					: "https://poke-quiz-server.onrender.com"
			);
			socketRef.current = socket;

			socket.on("connect", () => {
				setConnectionStatus("已連接");
				console.log("🔌 已連接至伺服器，Socket ID:", socket.id);

				// 將自己加入到顯示玩家列表中
				if (isCreator) {
					// 如果是創建者，先添加自己
					setShowPlayers([
						{
							id: "self",
							nickname,
							isHost: true,
							isSelf: true,
						},
					]);

					// 發送創建房間請求
					socket.emit("create_room", {
						nickname,
						settings: { maxPlayers, questions, timer },
					});
				} else {
					socket.emit("join_room", { nickname, roomCode });
				}
			});

			socket.on("disconnect", () => {
				setConnectionStatus("已斷線");
				console.log("🔌 與伺服器斷線");
			});

			socket.on("connect_error", (err) => {
				setConnectionStatus("連線錯誤: " + err.message);
				setConnectionError("連線錯誤: " + err.message);
				console.log("🔌 連線錯誤:", err.message);
			});

			socket.on("room_error", (data) => {
				alert(data.message);
				onBack(); // 返回上一頁
			});

			socket.on("room_update", (data) => {
				console.log("📥 收到房間更新", data);

				if (data.players) {
					setPlayers(data.players);

					// 更新顯示玩家列表，確保包含自己
					const updatedPlayers = data.players.map((p) => ({
						...p,
						isSelf: p.id === socket.id,
					}));
					setShowPlayers(updatedPlayers);
				}

				if (data.settings) {
					setQuestions(data.settings.questions || questions);
					setTimer(data.settings.timer || timer);
				}

				// 檢查房主狀態
				if (socket.id && data.hostId) {
					const isRoomHost = data.hostId === socket.id;
					setIsHost(isRoomHost);
				}
			});

			socket.on("game_started", (gameSettings) => {
				console.log("✅ 收到 game_started", gameSettings);
				onJoinGame(nickname, socketRef.current, gameSettings, roomCode);
			});

			return () => {
				socket.disconnect();
			};
		} catch (error) {
			console.error("Socket 連接錯誤:", error);
			setConnectionError("Socket 連接錯誤: " + error.message);
			setConnectionStatus("連接失敗");
		}
	}, [nickname, roomCode, isCreator]);

	const handleCopyRoomCode = () => {
		navigator.clipboard.writeText(roomCode);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const handleUpdateSettings = () => {
		if (socketRef.current && isHost) {
			socketRef.current.emit("update_room_settings", {
				roomCode,
				settings: { questions, timer, maxPlayers },
			});
		}
	};

	const handleStart = () => {
		if (socketRef.current && isHost) {
			// 計算玩家總數（包括房主）
			const totalPlayers = showPlayers.length;

			if (totalPlayers < 2) {
				alert("至少需要2位玩家才能開始多人遊戲！");
				return;
			}
			socketRef.current.emit("start_game", { roomCode });
		}
	};

	// 顯示錯誤信息（如果有）
	if (connectionError) {
		return (
			<div className={`entry-page centered ${theme}`}>
				<div className="top-bar flex justify-between items-center w-full max-w-2xl px-4">
					<button
						onClick={onBack}
						className="icon-button text-black dark:text-white padding-05"
					>
						<Home size={24} />
					</button>
					<h1 className="title text-lg sm:text-xl font-bold text-center dark:text-white">
						連接錯誤
					</h1>
					<button
						onClick={onToggleTheme}
						className="icon-button text-black dark:text-white"
					>
						{theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
					</button>
				</div>
				<div className="form-section">
					<p className="text-red-500 mb-4">{connectionError}</p>
					<button
						onClick={onBack}
						className="start-button dark:bg-orange-600 dark:hover:bg-orange-700 dark:text-white"
					>
						返回
					</button>
				</div>
			</div>
		);
	}

	// 計算玩家總數（包括自己）
	const totalPlayers = showPlayers.length;

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
				<h1 className="title text-lg sm:text-xl font-bold text-center dark:text-white">
					遊戲房間
				</h1>
				<button
					onClick={onToggleTheme}
					className="icon-button text-black dark:text-white"
				>
					{theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
				</button>
			</div>

			{/* Content */}
			<div className="form-section mt-0 max-w-md w-full">
				{/* Room Code and Status */}
				<div className="w-full mb-4">
					<div className="flex justify-between items-center mb-1">
						<div
							className={`text-sm ${
								connectionStatus === "已連接"
									? "text-green-500"
									: connectionStatus === "連線中..."
									? "text-amber-500"
									: "text-red-500"
							}`}
						>
							{connectionStatus}
						</div>
						<div className="flex items-center">
							<Users
								size={16}
								className="mr-1 text-black dark:text-white"
								style={theme === "dark" ? { color: "#FFF" } : {}}
							/>
							<span
								className="text-sm text-black dark:text-white"
								style={theme === "dark" ? { color: "#FFF" } : {}}
							>
								{totalPlayers}/{maxPlayers} 位玩家
							</span>
						</div>
					</div>

					{/* Room Code */}
					<div className="bg-white dark:bg-gray-700 p-3 rounded-lg flex justify-between items-center w-full">
						<div>
							<div className="text-xs text-gray-500 dark:text-gray-300">
								房間代碼
							</div>
							<div className="text-xl font-bold tracking-wider text-black dark:text-white">
								{roomCode}
							</div>
						</div>
						<button
							onClick={handleCopyRoomCode}
							className="p-2 bg-gray-200 hover:bg-gray-300 dark:bg-orange-600 dark:hover:bg-orange-700 rounded-lg transition-colors"
						>
							<Copy size={18} className="text-black dark:text-white" />
							{copied && (
								<span className="ml-1 text-xs dark:text-white">已複製!</span>
							)}
						</button>
					</div>
				</div>

				{/* 設定區塊 - 直接顯示 */}
				{isHost && (
					<div className="game-settings bg-white dark:bg-gray-700 rounded-lg p-4 mb-4 w-full">
						<h3 className="font-bold mb-3 text-black dark:text-white">
							遊戲設定
						</h3>

						<label className="block-label mt-3 text-black dark:text-white">
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

						<label className="block-label mt-3 text-black dark:text-white">
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

						<button
							onClick={handleUpdateSettings}
							className="start-button w-full py-2 bg-gray-300 hover:bg-gray-400 dark:bg-orange-600 dark:hover:bg-orange-700 text-black dark:text-black font-medium rounded"
						>
							更新設定
						</button>
					</div>
				)}

				{/* 玩家列表 */}
				<div className="bg-white dark:bg-gray-700 rounded-lg shadow-md overflow-hidden mb-4 w-full">
					<div className="bg-gray-200 dark:bg-gray-800 p-2 text-black dark:text-white font-bold">
						<div className="flex justify-between items-center">
							<span>玩家列表</span>
							<span className="text-sm">
								{totalPlayers} / {maxPlayers} 位玩家
							</span>
						</div>
					</div>
					<ul className="p-0 m-0 max-h-60 overflow-y-auto">
						{totalPlayers > 0 ? (
							showPlayers.map((p) => (
								<li
									key={p.id}
									className="border-b last:border-0 dark:border-gray-600 p-3 flex items-center justify-between"
								>
									<div className="flex items-center">
										{p.isHost && (
											<span className="text-yellow-500 mr-2">📍</span>
										)}
										<span className="font-medium text-black dark:text-white">
											{p.nickname}
										</span>
										{p.isSelf && (
											<span className="ml-2 text-xs bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200 px-2 py-0.5 rounded-full">
												你
											</span>
										)}
									</div>
									{p.isHost && (
										<span className="text-xs bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200 px-2 py-0.5 rounded-full">
											房主
										</span>
									)}
								</li>
							))
						) : (
							<li className="p-3 text-center text-gray-500 dark:text-gray-300">
								正在等待玩家加入...
							</li>
						)}
					</ul>
				</div>

				<button
					onClick={handleStart}
					className="start-button mt-4 w-full py-2.5 bg-gray-300 hover:bg-gray-400 dark:bg-orange-600 dark:hover:bg-orange-700 text-black dark:text-white font-medium rounded disabled:opacity-50 disabled:cursor-not-allowed"
					disabled={!isHost || totalPlayers < 2}
				>
					{isHost
						? totalPlayers < 2
							? "至少需要2位玩家"
							: "開始遊戲"
						: "等待房主開始..."}
				</button>

				{!isHost && (
					<p className="text-sm text-center mt-2 text-gray-500 dark:text-gray-300">
						只有房主可以開始遊戲
					</p>
				)}
			</div>
		</div>
	);
}
