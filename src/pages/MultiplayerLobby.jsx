import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { Home, Sun, Moon, Copy, Users, RefreshCw } from "lucide-react";
// 從 MultiplayerEntryPage.jsx 導入輔助函數和共享變量
import {
	lastValidatedRoom,
	saveRoomData,
	getRoomCode,
} from "./MultiplayerEntryPage";

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
	const [showPlayers, setShowPlayers] = useState([]);
	const socketRef = useRef(null);
	const [isHost, setIsHost] = useState(
		isCreator || lastValidatedRoom.isCreator
	);
	const [connectionStatus, setConnectionStatus] = useState("連線中...");
	const [connectionError, setConnectionError] = useState("");
	const [copied, setCopied] = useState(false);
	const [joinError, setJoinError] = useState("");
	const [isReconnecting, setIsReconnecting] = useState(false);

	// 獲取房間代碼 - 優先使用從 lastValidatedRoom 或 sessionStorage 獲取的代碼
	const [actualRoomCode, setActualRoomCode] = useState(
		getRoomCode() || roomCode
	);

	// 遊戲設定
	const [questions, setQuestions] = useState(10);
	const [timer, setTimer] = useState(15);
	const maxPlayers = 5;

	// Socket 連接與事件處理
	useEffect(() => {
		console.log("============ useEffect 執行 ===========");
		console.log(
			"nickname:",
			nickname,
			"roomCode:",
			roomCode,
			"isCreator:",
			isCreator
		);
		console.log("lastValidatedRoom:", lastValidatedRoom);
		console.log("sessionStorage:", {
			roomCode: sessionStorage.getItem("roomCode"),
			nickname: sessionStorage.getItem("nickname"),
		});

		// 重要: 清除之前的連接
		if (socketRef.current) {
			console.log("關閉舊的 socket 連接");
			socketRef.current.disconnect();
		}

		// 輔助函數：獲取有效的暱稱
		const getEffectiveNickname = () => {
			return (
				nickname ||
				lastValidatedRoom.nickname ||
				sessionStorage.getItem("nickname") ||
				"玩家"
			);
		};

		// 輔助函數：獲取有效的房間代碼
		const getEffectiveRoomCode = () => {
			return actualRoomCode || getRoomCode() || roomCode || "";
		};

		// 清除舊連接後等待一小段時間再創建新連接，避免伺服器端混淆
		setTimeout(() => {
			// 創建新的 socket 連接 - 保存為一個變數，以便在回調中使用
			const socket = io(
				import.meta.env.MODE === "development"
					? "http://localhost:3001"
					: "https://poke-quiz-server.onrender.com",
				{
					// 禁用自動重連，我們將手動處理
					reconnection: false,
					// 避免連接斷開時自動重連導致的問題
					forceNew: true,
					transports: ["websocket"],
				}
			);

			// 立即保存 socket 引用
			socketRef.current = socket;

			socket.on("connect", () => {
				console.log("🔌 已成功連接至伺服器，Socket ID:", socket.id);
				setConnectionStatus("已連接");
				setIsReconnecting(false);

				const effectiveNickname = getEffectiveNickname();

				// 重要: 使用延時發送，確保連接完全建立
				setTimeout(() => {
					if (isCreator || lastValidatedRoom.isCreator) {
						// 如果是創建者，發送創建房間請求
						console.log("發送創建房間請求，昵稱:", effectiveNickname);
						socket.emit("create_room", {
							nickname: effectiveNickname,
							settings: { maxPlayers, questions, timer },
						});
					} else {
						// 加入房間
						const joinRoomCode = getEffectiveRoomCode();
						if (!joinRoomCode) {
							console.error("無法找到房間代碼！");
							setJoinError("無法找到有效的房間代碼，請回到大廳重新加入");
							return;
						}

						console.log(
							"發送加入房間請求，房間:",
							joinRoomCode,
							"昵稱:",
							effectiveNickname
						);
						setJoinError("");
						socket.emit("join_room", {
							nickname: effectiveNickname,
							roomCode: joinRoomCode,
						});
					}
				}, 100);
			});

			// 重要: 監聽連接錯誤，但避免斷開現有連接
			socket.io.on("reconnect_attempt", () => {
				console.log("嘗試重新連接");
				setConnectionStatus("重新連線中...");
			});

			socket.on("connect_error", (err) => {
				console.error("🚫 連接錯誤:", err.message);
				setConnectionStatus("連線錯誤: " + err.message);
				setConnectionError("連線錯誤: " + err.message);
			});

			socket.on("disconnect", (reason) => {
				console.log("🔌 與伺服器斷線，原因:", reason);
				setConnectionStatus("已斷線 (" + reason + ")");

				// 如果是服務器主動斷開，我們不要自動重連
				if (reason === "io server disconnect") {
					console.log("服務器斷開連接，不會自動重連");
				} else {
					// 自動嘗試重連一次
					console.log("嘗試自動重新連接...");
					handleReconnect();
				}
			});

			// 處理房間錯誤
			socket.on("room_error", (data) => {
				console.log("❌ 房間錯誤:", data.message);
				setJoinError(data.message);

				if (data.fatal) {
					alert(data.message);
					onBack();
				}
			});

			// 接收房間更新信息
			socket.on("room_update", (data) => {
				console.log("📥 收到房間更新", data);

				// 確認已加入房間
				console.log("確認已成功加入房間，維持連接");

				// 更新房間代碼
				if (data.roomCode) {
					console.log(`伺服器分配的房間代碼: ${data.roomCode}`);
					setActualRoomCode(data.roomCode);

					// 更新全局狀態
					saveRoomData({
						roomCode: data.roomCode,
					});
				}

				// 更新玩家列表
				if (data.players) {
					console.log("接收到玩家列表:", data.players);
					setPlayers(data.players);

					const updatedPlayers = data.players.map((p) => ({
						...p,
						isSelf: p.id === socket.id,
					}));

					console.log("處理後的玩家列表:", updatedPlayers);
					setShowPlayers(updatedPlayers);
				}

				// 更新遊戲設定
				if (data.settings) {
					setQuestions(data.settings.questions || questions);
					setTimer(data.settings.timer || timer);
				}

				// 確認房主身份
				if (data.hostId) {
					const isRoomHost = data.hostId === socket.id;
					console.log(
						"確認房主身份:",
						isRoomHost,
						"Socket ID:",
						socket.id,
						"Host ID:",
						data.hostId
					);
					setIsHost(isRoomHost);
				}
			});

			// 處理遊戲開始
			socket.on("game_started", (gameSettings) => {
				console.log("✅ 收到 game_started", gameSettings);
				onJoinGame(
					nickname || lastValidatedRoom.nickname,
					socketRef.current,
					gameSettings,
					actualRoomCode || getRoomCode()
				);
			});

			// 監聽連接保持事件 (如果服務器實現了這個功能)
			socket.on("keep_alive", () => {
				console.log("收到連接保持信號");
				socket.emit("keep_alive_response");
			});
		}, 100); // 等待100ms再創建連接，避免連接沖突

		// 定期發送心跳包保持連接活躍
		const pingInterval = setInterval(() => {
			if (socketRef.current && socketRef.current.connected) {
				socketRef.current.emit("ping");
				console.log("發送心跳包...");
			}
		}, 15000); // 每15秒

		// 清理函數
		return () => {
			console.log("🧹 清理連接");
			clearInterval(pingInterval);
			// 這裡不要斷開連接，讓它保持連接狀態
			// 而是在下一次 useEffect 調用時處理
		};
	}, [isReconnecting, roomCode]); // 添加roomCode作為依賴項，確保房間代碼變化時重新連接

	// 組件卸載時確保斷開連接
	useEffect(() => {
		return () => {
			if (socketRef.current) {
				console.log("組件卸載，關閉 socket 連接");
				socketRef.current.disconnect();
			}
		};
	}, []);

	const handleCopyRoomCode = () => {
		navigator.clipboard.writeText(actualRoomCode || roomCode);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const handleUpdateSettings = () => {
		if (socketRef.current && isHost && socketRef.current.connected) {
			console.log("發送更新設定請求");
			socketRef.current.emit("update_room_settings", {
				roomCode: actualRoomCode || roomCode,
				settings: { questions, timer, maxPlayers },
			});
		} else {
			console.log("無法更新設定：socket未連接或非房主");
		}
	};

	const handleStart = () => {
		if (socketRef.current && isHost && socketRef.current.connected) {
			const totalPlayers = showPlayers.length;
			if (totalPlayers < 2) {
				alert("至少需要2位玩家才能開始多人遊戲！");
				return;
			}

			console.log("發送開始遊戲請求");
			socketRef.current.emit("start_game", {
				roomCode: actualRoomCode || roomCode,
			});
		} else {
			console.log("無法開始遊戲：socket未連接或非房主");
		}
	};

	const handleReconnect = () => {
		console.log("手動重新連接");
		setConnectionStatus("重新連線中...");
		setJoinError("");
		setIsReconnecting((prev) => !prev); // 切換狀態觸發重連
	};

	// 顯示錯誤信息
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
					<div className="flex space-x-2">
						<button
							onClick={handleReconnect}
							className="start-button bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white dark:text-white flex-1"
						>
							重新連接
						</button>
						<button
							onClick={onBack}
							className="start-button bg-gray-300 hover:bg-gray-400 dark:bg-orange-600 dark:hover:bg-orange-700 text-black dark:text-white flex-1"
						>
							返回
						</button>
					</div>
				</div>
			</div>
		);
	}

	// 使用actualRoomCode或回退到原始roomCode
	const displayRoomCode = actualRoomCode || roomCode;
	const totalPlayers = showPlayers.length;

	// 獲取連接狀態
	const getConnectionStatus = () => {
		return socketRef.current
			? socketRef.current.connected
				? "已連接"
				: "已斷開"
			: "未連接";
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
								connectionStatus.includes("已連接")
									? "text-green-500"
									: connectionStatus.includes("連線中") ||
									  connectionStatus.includes("重新連線中")
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

					{/* 加入房間錯誤顯示 */}
					{joinError && (
						<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-2 flex justify-between items-center">
							<p className="text-sm">{joinError}</p>
							<button
								onClick={handleReconnect}
								className="text-xs bg-red-200 hover:bg-red-300 text-red-800 px-2 py-1 rounded flex items-center"
							>
								<RefreshCw size={12} className="mr-1" /> 重試
							</button>
						</div>
					)}

					{/* Room Code */}
					<div className="bg-white dark:bg-gray-700 p-3 rounded-lg flex justify-between items-center w-full">
						<div>
							<div className="text-xs text-gray-500 dark:text-gray-300">
								房間代碼
							</div>
							<div className="text-xl font-bold tracking-wider text-black dark:text-white">
								{displayRoomCode}
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

				{/* 遊戲設定 */}
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

				{/* 調試信息 */}
				<div className="mt-4 text-xs text-gray-500 border-t pt-2">
					<div>Socket ID: {socketRef.current?.id || "未連接"}</div>
					<div>連接狀態: {getConnectionStatus()}</div>
					<div>房間代碼: {displayRoomCode || "未知"}</div>
					<div>玩家數: {totalPlayers}</div>
					<div>是房主: {isHost ? "是" : "否"}</div>
					<div>lastValidated: {JSON.stringify(lastValidatedRoom)}</div>
					<div>Session: {sessionStorage.getItem("roomCode") || "無"}</div>
					<button
						onClick={handleReconnect}
						className="mt-1 px-2 py-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded"
					>
						重新連接
					</button>
				</div>
			</div>
		</div>
	);
}
