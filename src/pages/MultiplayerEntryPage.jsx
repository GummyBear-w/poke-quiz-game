import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { Home, Sun, Moon, Plus, LogIn, Loader } from "lucide-react";

// 共享房間信息 - 確保正確導出
export const lastValidatedRoom = {
	roomCode: "",
	nickname: "",
	isCreator: false,
};

// 輔助函數: 保存房間數據
export function saveRoomData(data) {
	Object.assign(lastValidatedRoom, data);

	try {
		// 同時保存到 sessionStorage 作為備份
		sessionStorage.setItem("roomCode", data.roomCode || "");
		sessionStorage.setItem("nickname", data.nickname || "");
		sessionStorage.setItem("isCreator", String(data.isCreator || false));
	} catch (e) {
		console.error("無法保存到 sessionStorage", e);
	}

	console.log("已更新房間數據:", lastValidatedRoom);
}

// 輔助函數: 獲取有效的房間代碼
export function getRoomCode() {
	// 從多處獲取房間代碼，以確保可靠性
	return lastValidatedRoom.roomCode || sessionStorage.getItem("roomCode") || "";
}

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
						// 存儲已驗證的房間信息
						const formattedRoomCode = roomCode.trim().toUpperCase();

						// 保存房間信息
						saveRoomData({
							roomCode: formattedRoomCode,
							nickname: nickname,
							isCreator: false,
						});

						console.log("已存儲驗證通過的房間信息:", lastValidatedRoom);

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
	}, [nicknameEntered]);

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
		// 在創建房間時設置共享數據
		saveRoomData({
			roomCode: "", // 房間代碼由服務器生成
			nickname: nickname,
			isCreator: true, // 標記為創建者
		});

		console.log("創建房間時設置用戶資訊:", lastValidatedRoom);

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
			// 直接加入前存儲房間信息
			saveRoomData({
				roomCode: formattedRoomCode,
				nickname: nickname,
				isCreator: false,
			});

			console.log("跳過驗證，直接存儲房間信息:", lastValidatedRoom);

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

			// 仍然存儲信息
			saveRoomData({
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
				{import.meta.env.DEV && (
					<div className="mt-4 text-xs text-gray-500 dark:text-gray-400 border-t pt-2">
						<div>已驗證房間: {lastValidatedRoom.roomCode || "無"}</div>
						<div>玩家昵稱: {lastValidatedRoom.nickname || "無"}</div>
						<div>是創建者: {lastValidatedRoom.isCreator ? "是" : "否"}</div>
						<div>Session: {sessionStorage.getItem("roomCode") || "無"}</div>
					</div>
				)}
			</div>
		</div>
	);
}
