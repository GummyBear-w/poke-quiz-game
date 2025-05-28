import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { Home, Sun, Moon, Plus, LogIn } from "lucide-react";

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

	const handleNicknameSubmit = () => {
		if (nickname.trim().length < 2) {
			setError("暱稱至少需要2個字元");
			return;
		}
		setNicknameEntered(true);
		setError("");
	};

	const handleCreateRoom = () => {
		onCreateRoom(nickname);
	};

	const handleJoinRoom = () => {
		if (!roomCode.trim()) {
			setError("請輸入房間代碼");
			return;
		}
		onJoinRoom(nickname, roomCode);
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
									className="font-bold mb-2 flex items-center"
									style={theme === "dark" ? { color: "#000000" } : {}}
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
									className="font-bold mb-2 flex items-center"
									style={theme === "dark" ? { color: "#000000" } : {}}
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
									onClick={handleJoinRoom}
									className="start-button w-full py-2 bg-gray-300 hover:bg-gray-400 dark:bg-orange-600 dark:hover:bg-orange-700 text-black dark:text-black font-medium rounded disabled:opacity-50 disabled:cursor-not-allowed"
									disabled={!roomCode.trim()}
								>
									加入房間
								</button>
							</div>
						</div>
					</>
				)}
			</div>
		</div>
	);
}
