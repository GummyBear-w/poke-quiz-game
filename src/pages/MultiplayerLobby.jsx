import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { Home, Sun, Moon, Copy, Users, RefreshCw } from "lucide-react";
import * as RoomManager from "../utils/roomManager";

export default function MultiplayerLobby({
	theme,
	onToggleTheme,
	onBack,
	onJoinGame,
	nickname: propNickname, // 來自props的暱稱
	roomCode: propRoomCode, // 來自props的房間代碼
	isCreator: propIsCreator, // 來自props的創建者標記
}) {
	// 獲取房間數據
	const [roomData, setRoomData] = useState(RoomManager.getRoomData());

	// 初始化狀態 - 整合所有來源
	const [players, setPlayers] = useState([]);
	const [showPlayers, setShowPlayers] = useState([]);
	const socketRef = useRef(null);
	const [isHost, setIsHost] = useState(propIsCreator || roomData.isCreator);
	const [connectionStatus, setConnectionStatus] = useState("連線中...");
	const [connectionError, setConnectionError] = useState("");
	const [copied, setCopied] = useState(false);
	const [joinError, setJoinError] = useState("");
	const [isReconnecting, setIsReconnecting] = useState(false);
	const connectionInitializedRef = useRef(false);
	const autoRetryCountRef = useRef(0); // 自動重試計數
	const maxAutoRetries = 2; // 最大自動重試次數
	const roomCreatedRef = useRef(false); // 追踪房間是否已成功創建

	// 修改1: 初始房間代碼為空，等待伺服器確認後才顯示
	const [roomCode, setRoomCode] = useState("");

	// 獲取暱稱 - 整合所有可能來源
	const [nickname, setNickname] = useState(() => {
		return propNickname || roomData.nickname || "玩家";
	});

	// 遊戲設定
	const [questions, setQuestions] = useState(10);
	const [timer, setTimer] = useState(15);
	const maxPlayers = 5;

	// 連接追踪
	const connectingRef = useRef(false);

	// 修改2: 每次進入大廳都強制觸發連接初始化
	useEffect(() => {
		console.log("強制觸發重新連接");
		connectionInitializedRef.current = false;
		connectingRef.current = false;

		// 如果有propRoomCode，儲存起來
		if (propRoomCode) {
			console.log("從props取得房間代碼:", propRoomCode);
			RoomManager.saveRoomData({
				roomCode: propRoomCode,
				nickname: propNickname || roomData.nickname,
				isCreator: propIsCreator || roomData.isCreator,
			});
		}

		// 重新初始化連接
		setIsReconnecting((prev) => !prev);
	}, []); // 僅在組件首次渲染時執行

	// 監聽全局房間狀態變化
	useEffect(() => {
		const removeListener = RoomManager.addListener((data) => {
			setRoomData(data);

			// 僅在必要時更新狀態，但不重新連接
			if (data.nickname && data.nickname !== nickname) {
				setNickname(data.nickname);
			}

			// 只處理房主狀態的變化
			if (data.isCreator !== undefined && isHost !== data.isCreator) {
				setIsHost(data.isCreator);
			}
		});

		return () => removeListener();
	}, [nickname, isHost]);

	// 自動重連函數
	const attemptAutoReconnect = () => {
		// 檢查重試次數是否超過限制
		if (autoRetryCountRef.current >= maxAutoRetries) {
			console.log(`已達到最大自動重試次數(${maxAutoRetries})，請手動重連`);
			return;
		}

		autoRetryCountRef.current++;
		console.log(`自動重試第 ${autoRetryCountRef.current} 次`);

		// 延遲2秒後重連
		setTimeout(() => {
			setConnectionStatus("自動重連中...");
			connectionInitializedRef.current = false;
			connectingRef.current = false;
			setIsReconnecting((prev) => !prev);
		}, 2000);
	};

	// 使用可靠的連接系統
	const setupConnection = () => {
		// 防止重複連接
		if (connectingRef.current) {
			console.log("已經在連接中，跳過");
			return null;
		}

		// 如果已經初始化並且沒有要求重連，則跳過
		if (connectionInitializedRef.current && !isReconnecting) {
			console.log("連接已初始化，跳過後續設置");
			return null;
		}

		connectionInitializedRef.current = true;
		connectingRef.current = true;
		roomCreatedRef.current = false; // 重置房間創建狀態

		// 檢查加入房間時是否有房間代碼
		const storedRoomData = RoomManager.getRoomData();
		const effectiveRoomCode = storedRoomData.roomCode || propRoomCode;

		if (!isHost && !effectiveRoomCode) {
			console.error("嘗試加入房間但沒有房間代碼");
			setJoinError("無法找到房間代碼，請返回重新加入");
			setConnectionError("無法找到房間代碼");
			connectingRef.current = false;
			return null;
		}

		// 清除現有連接
		if (socketRef.current) {
			console.log("清除現有連接");
			socketRef.current.disconnect();
			socketRef.current = null;
		}

		const effectiveNickname =
			propNickname || storedRoomData.nickname || nickname;

		console.log(
			`準備${isHost ? "創建" : "加入"}房間，昵稱:${effectiveNickname}，房間:${
				effectiveRoomCode || "新房間"
			}`
		);

		// 創建新連接
		const socket = io(
			import.meta.env.MODE === "development"
				? "http://localhost:3001"
				: "https://poke-quiz-server.onrender.com",
			{
				transports: ["websocket"], // 強制只用 WebSocket
				reconnection: true, // 自動重連
				reconnectionAttempts: 5, // 最多重連5次
				reconnectionDelay: 2000, // 每次間隔2秒
				timeout: 10000, // 等待最多10秒才 timeout
			}
		);

		socketRef.current = socket;

		// 基本連接事件
		socket.on("connect", () => {
			console.log("✅ 連接成功，Socket ID:", socket.id);
			setConnectionStatus("已連接");

			// 延遲發送請求，確保連接穩定
			setTimeout(() => {
				if (socket.connected) {
					// 確保連接仍然有效
					if (isHost) {
						// 創建房間
						console.log("發送創建房間請求");
						socket.emit("create_room", {
							nickname: effectiveNickname,
							settings: { maxPlayers, questions, timer },
						});
					} else {
						// 加入房間 - 使用從存儲或props獲取的房間代碼
						console.log("發送加入房間請求:", effectiveRoomCode);
						socket.emit("join_room", {
							nickname: effectiveNickname,
							roomCode: effectiveRoomCode,
						});
					}
				}
			}, 500);
		});

		// 連接錯誤處理
		socket.on("connect_error", (err) => {
			console.error("連接錯誤:", err);
			setConnectionStatus("連線錯誤: " + err.message);
			connectingRef.current = false;

			// 連接錯誤時嘗試自動重連
			attemptAutoReconnect();
		});

		// 斷開連接處理
		socket.on("disconnect", (reason) => {
			console.log("斷開連接，原因:", reason);
			setConnectionStatus("已斷線 (" + reason + ")");
			connectingRef.current = false;

			// 如果是網絡問題，嘗試自動重連
			if (reason === "transport error" || reason === "ping timeout") {
				attemptAutoReconnect();
			}
		});

		// 房間更新事件 - 修改3: 只有在收到room_update時才更新房間代碼和保存
		socket.on("room_update", (data) => {
			console.log("收到房間更新:", data);

			connectingRef.current = false; // 連接已完成

			// 更新房間代碼
			if (data.roomCode) {
				console.log("服務器分配房間代碼:", data.roomCode);
				setRoomCode(data.roomCode); // 設置UI顯示的房間代碼
				roomCreatedRef.current = true; // 標記房間已創建

				// 更新本地存儲
				RoomManager.saveRoomData({
					roomCode: data.roomCode,
					nickname: effectiveNickname,
					isCreator: isHost,
				});
			}

			// 更新玩家列表
			if (data.players) {
				setPlayers(data.players);

				const updatedPlayers = data.players.map((p) => ({
					...p,
					isSelf: p.id === socket.id,
				}));

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
				setIsHost(isRoomHost);
			}
		});

		// 房間錯誤處理
		socket.on("room_error", (data) => {
			console.log("房間錯誤:", data.message);
			setJoinError(data.message);

			if (data.fatal) {
				alert(data.message);
				onBack();
			}

			connectingRef.current = false;
		});

		// 遊戲開始事件
		socket.on("game_started", (gameSettings) => {
			console.log("遊戲開始:", gameSettings);
			onJoinGame(effectiveNickname, socketRef.current, gameSettings, roomCode);
		});

		// 保持心跳
		const heartbeatInterval = setInterval(() => {
			if (socket && socket.connected) {
				socket.emit("ping", { timestamp: Date.now() });
			}
		}, 5000);

		// 連接超時處理
		const timeoutId = setTimeout(() => {
			if (connectingRef.current && socket && !socket.connected) {
				console.log("連接超時，嘗試自動重連");
				connectingRef.current = false;
				attemptAutoReconnect();
			}
		}, 8000); // 8秒後自動重連

		// 返回清理函數
		return () => {
			clearInterval(heartbeatInterval);
			clearTimeout(timeoutId);
			connectingRef.current = false;
		};
	};

	// 當組件加載或重連標誌變化時，建立連接
	useEffect(() => {
		console.log("設置連接，重連狀態:", isReconnecting);
		const cleanup = setupConnection();

		return () => {
			if (cleanup) cleanup();
		};
	}, [isReconnecting]);

	const handleCopyRoomCode = () => {
		navigator.clipboard.writeText(roomCode);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const handleUpdateSettings = () => {
		if (socketRef.current && isHost && socketRef.current.connected) {
			console.log("發送更新設定請求");
			socketRef.current.emit("update_room_settings", {
				roomCode: roomCode,
				settings: { questions, timer, maxPlayers },
			});
		} else {
			console.log("無法更新設定");
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
				roomCode: roomCode,
			});
		} else {
			console.log("無法開始遊戲");
		}
	};

	const handleReconnect = () => {
		console.log("手動重新連接");
		setConnectionStatus("重新連線中...");
		setJoinError("");
		// 重置自動重試計數
		autoRetryCountRef.current = 0;
		setIsReconnecting((prev) => !prev); // 切換狀態觸發重連
		connectionInitializedRef.current = false; // 重置連接初始化標誌
		connectingRef.current = false;
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

	const totalPlayers = showPlayers.length;
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

					{/* Room Code - 修改4: 當房間代碼為空且正在連接時顯示等待訊息 */}
					<div className="bg-white dark:bg-gray-700 p-3 rounded-lg flex justify-between items-center w-full">
						<div>
							<div className="text-xs text-gray-500 dark:text-gray-300">
								房間代碼
							</div>
							<div className="text-xl font-bold tracking-wider text-black dark:text-white">
								{roomCode
									? roomCode
									: connectingRef.current
									? "正在建立房間..."
									: "等待連接..."}
							</div>
						</div>
						<button
							onClick={handleCopyRoomCode}
							className="p-2 bg-gray-200 hover:bg-gray-300 dark:bg-orange-600 dark:hover:bg-orange-700 rounded-lg transition-colors"
							disabled={!roomCode}
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
								{connectingRef.current ? "正在連接..." : "正在等待玩家加入..."}
							</li>
						)}
					</ul>
				</div>

				<button
					onClick={handleStart}
					className="start-button mt-4 w-full py-2.5 bg-gray-300 hover:bg-gray-400 dark:bg-orange-600 dark:hover:bg-orange-700 text-black dark:text-white font-medium rounded disabled:opacity-50 disabled:cursor-not-allowed"
					disabled={!isHost || totalPlayers < 2 || !roomCreatedRef.current}
				>
					{!roomCreatedRef.current
						? "等待房間建立..."
						: isHost
						? totalPlayers < 2
							? "至少需要2位玩家"
							: "開始遊戲"
						: "等待房主開始..."}
				</button>

				{!isHost && roomCreatedRef.current && (
					<p className="text-sm text-center mt-2 text-gray-500 dark:text-gray-300">
						只有房主可以開始遊戲
					</p>
				)}
			</div>
		</div>
	);
}
