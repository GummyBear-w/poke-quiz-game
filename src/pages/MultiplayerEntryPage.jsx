import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { Home, Sun, Moon, Plus, LogIn, Loader } from "lucide-react";
import * as RoomManager from "../utils/roomManager";

export default function MultiplayerEntryPage({
	theme,
	onToggleTheme,
	onBack,
	onCreateRoom,
	onJoinRoom,
}) {
	const [nickname, setNickname] = useState("");
	const [nicknameEntered, setNicknameEntered] = useState(false);
	const [roomCode, setRoomCode] = useState("");
	const [error, setError] = useState("");
	const [isValidating, setIsValidating] = useState(false);
	const [validationSocket, setValidationSocket] = useState(null);
	const [roomData, setRoomData] = useState(RoomManager.getRoomData());

	// 监听全局房间状态变化
	useEffect(() => {
		const removeListener = RoomManager.addListener((data) => {
			setRoomData(data);
		});

		return () => removeListener();
	}, []);

	// 頁面載入時檢查並清除過期的房間數據
	useEffect(() => {
		const savedRoom = RoomManager.getRoomData();

		// 如果數據存在但超過1小時，則清除
		if (savedRoom.lastUpdated) {
			const lastUpdate = new Date(savedRoom.lastUpdated);
			const oneHourAgo = new Date();
			oneHourAgo.setHours(oneHourAgo.getHours() - 1);

			if (lastUpdate < oneHourAgo) {
				console.log("清除過期的房間數據");
				RoomManager.clearRoomData();
			}
		}
	}, []);

	// 初始化驗證用socket連接
	useEffect(() => {
		if (nicknameEntered) {
			const socket = io(
				import.meta.env.MODE === "development"
					? "http://localhost:3001"
					: "https://poke-quiz-server.onrender.com"
			);

			setValidationSocket(socket);

			socket.on("connect", () => {
				console.log("驗證socket已連接");
			});

			// 監聽驗證結果
			socket.on("room_validation_result", (data) => {
				console.log("收到房間驗證結果:", data);
				setIsValidating(false);

				if (data.exists) {
					if (data.nicknameAvailable) {
						const formattedRoomCode = roomCode.trim().toUpperCase();

						// 重要：保存数据到Room Manager
						RoomManager.saveRoomData({
							roomCode: formattedRoomCode,
							nickname: nickname,
							isCreator: false,
						});

						console.log("已存儲驗證通過的房間信息:", formattedRoomCode);

						// 房間存在且昵稱可用，可以加入
						onJoinRoom(nickname, formattedRoomCode);
						setError("");
					} else {
						// 昵稱已被使用
						setError("此昵稱在房間中已被使用，請使用其他昵稱");
					}
				} else {
					// 房間不存在
					setError("找不到此房間代碼，請檢查輸入是否正確");
				}
			});

			socket.on("error", (err) => {
				console.error("驗證socket錯誤:", err);
				setIsValidating(false);
				setError("驗證過程中發生錯誤: " + (err.message || "未知錯誤"));
			});

			socket.on("connect_error", (err) => {
				console.error("驗證socket連接錯誤:", err);
				setIsValidating(false);
				setError("連接服務器時發生錯誤，請稍後再試");
			});

			return () => {
				socket.disconnect();
				setValidationSocket(null);
			};
		}
	}, [nicknameEntered, nickname, roomCode, onJoinRoom]);

	// 後備超時機制
	useEffect(() => {
		let timeoutId;
		if (isValidating) {
			// 如果5秒後還在驗證中，自動重置狀態
			timeoutId = setTimeout(() => {
				if (isValidating) {
					console.log("驗證超時，自動重置");
					setIsValidating(false);
					setError("驗證請求超時，請再試一次或直接加入");
				}
			}, 5000);
		}

		return () => {
			if (timeoutId) clearTimeout(timeoutId);
		};
	}, [isValidating]);

	const handleNicknameSubmit = () => {
		if (nickname.trim().length < 2) {
			setError("暱稱至少需要2個字元");
			return;
		}
		setNicknameEntered(true);
		setError("");
	};

	const handleCreateRoom = () => {
		// 重要：清除舊的房間信息，設置新的
		RoomManager.saveRoomData({
			roomCode: "", // 房間代碼由服務器生成
			nickname: nickname,
			isCreator: true, // 標記為創建者
		});

		console.log("創建房間時設置用戶資訊:", RoomManager.getRoomData());

		// 調用傳入的 onCreateRoom 函數
		onCreateRoom(nickname);
	};

	const handleJoinRoom = (skipValidation = false) => {
		if (!roomCode.trim()) {
			setError("請輸入房間代碼");
			return;
		}

		const formattedRoomCode = roomCode.trim().toUpperCase();

		if (skipValidation) {
			// 直接保存房間信息
			RoomManager.saveRoomData({
				roomCode: formattedRoomCode,
				nickname: nickname,
				isCreator: false,
			});

			console.log("跳過驗證，直接存儲房間信息:", RoomManager.getRoomData());

			// 跳過驗證直接加入
			onJoinRoom(nickname, formattedRoomCode);
			return;
		}

		setIsValidating(true);
		setError("");

		// 驗證房間是否存在以及昵稱是否可用
		if (validationSocket && validationSocket.connected) {
			console.log("發送驗證請求:", { roomCode: formattedRoomCode, nickname });
			validationSocket.emit("validate_room_and_nickname", {
				roomCode: formattedRoomCode,
				nickname,
			});
		} else {
			// 如果沒有連接到驗證socket，直接嘗試加入
			console.log("驗證socket未連接，直接加入");
			setIsValidating(false);

			// 仍然保存房間信息
			RoomManager.saveRoomData({
				roomCode: formattedRoomCode,
				nickname: nickname,
				isCreator: false,
			});

			onJoinRoom(nickname, formattedRoomCode);
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
				<h1 className="title text-lg sm:text-xl font-bold text-center dark:text-white">
					多人遊戲大廳
				</h1>
				<button
					onClick={onToggleTheme}
					className="icon-button text-black dark:text-white"
				>
					{theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
				</button>
			</div>

			<div className="form-section max-w-md w-full">
				{!nicknameEntered ? (
					<>
						<h2 className="text-lg font-bold mb-4 text-center dark:text-white">
							請輸入暱稱
						</h2>
						<input
							className="w-full p-2 rounded-md border bg-white dark:bg-gray-700 text-black dark:text-white"
							value={nickname}
							onChange={(e) => setNickname(e.target.value)}
							placeholder="你的遊戲暱稱"
							style={{
								placeholderColor: theme === "dark" ? "#9ca3af" : "",
							}}
						/>
						{error && <p className="text-red-500 text-sm mt-2">{error}</p>}
						<button
							onClick={handleNicknameSubmit}
							className="start-button w-full py-2.5 bg-gray-300 hover:bg-gray-400 dark:bg-orange-600 dark:hover:bg-orange-700 text-black dark:text-black font-medium rounded mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
							disabled={!nickname.trim()}
						>
							確認
						</button>
					</>
				) : (
					<>
						<h2 className="text-lg font-bold mb-4 text-center dark:text-white">
							你好，{nickname}！
						</h2>

						<div className="grid grid-cols-1 gap-4">
							<div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md">
								<h3
									className="font-bold mb-2 flex items-center dark:text-white"
									style={theme === "dark" ? { color: "#FFF" } : {}}
								>
									<Plus size={18} className="mr-2" /> 創建房間
								</h3>
								<p className="text-sm mb-3 text-gray-600 dark:text-gray-300">
									創建一個新的遊戲房間，邀請朋友加入
								</p>
								<button
									onClick={handleCreateRoom}
									className="start-button w-full py-2 bg-gray-300 hover:bg-gray-400 dark:bg-orange-600 dark:hover:bg-orange-700 text-black dark:text-black font-medium rounded"
								>
									創建房間
								</button>
							</div>

							<div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md">
								<h3
									className="font-bold mb-2 flex items-center dark:text-white"
									style={theme === "dark" ? { color: "#FFF" } : {}}
								>
									<LogIn size={18} className="mr-2" /> 加入房間
								</h3>
								<p className="text-sm mb-3 text-gray-600 dark:text-gray-300">
									輸入房間代碼加入已存在的遊戲
								</p>
								<input
									className="w-full p-2 rounded-md border mb-3 bg-white dark:bg-gray-700 text-black dark:text-white"
									value={roomCode}
									onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
									placeholder="輸入房間代碼 (如: ABC123)"
									maxLength={6}
								/>
								{error && <p className="text-red-500 text-sm mb-2">{error}</p>}

								<button
									onClick={() => handleJoinRoom(false)}
									className="start-button w-full py-2 bg-gray-300 hover:bg-gray-400 dark:bg-orange-600 dark:hover:bg-orange-700 text-black dark:text-black font-medium rounded disabled:opacity-50 disabled:cursor-not-allowed mb-2"
									disabled={!roomCode.trim() || isValidating}
								>
									{isValidating ? (
										<span className="flex items-center justify-center">
											<Loader size={16} className="animate-spin mr-2" />{" "}
											驗證中...
										</span>
									) : (
										"加入房間"
									)}
								</button>

								{isValidating && (
									<button
										onClick={() => handleJoinRoom(true)}
										className="w-full py-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
									>
										跳過驗證直接加入
									</button>
								)}
							</div>
						</div>
					</>
				)}

				{/* 調試信息 */}
				<div className="mt-4 text-xs text-gray-500 dark:text-gray-400 border-t pt-2">
					<div>全局房間: {roomData.roomCode || "無"}</div>
					<div>全局暱稱: {roomData.nickname || "無"}</div>
					<div>全局創建者: {roomData.isCreator ? "是" : "否"}</div>
					<div>
						本地存儲房間:{" "}
						{localStorage.getItem("pokemonGameRoomData")
							? JSON.parse(localStorage.getItem("pokemonGameRoomData")).roomCode
							: "無"}
					</div>
					<div>當前輸入房間: {roomCode || "無"}</div>
					<div>驗證狀態: {isValidating ? "正在驗證" : "閒置"}</div>
				</div>
			</div>
		</div>
	);
}
