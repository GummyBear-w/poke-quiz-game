import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { Home, Sun, Moon } from "lucide-react";

const socket = io("http://localhost:3000"); // 改為你 render 部署的網址

export default function MultiplayerLobby({
	theme,
	onToggleTheme,
	onBack,
	onJoinGame,
}) {
	const [nickname, setNickname] = useState("");
	const [players, setPlayers] = useState([]);
	const [isWaiting, setIsWaiting] = useState(false);

	useEffect(() => {
		socket.on("lobby_update", (data) => {
			setPlayers(data);
		});

		socket.on("game_started", () => {
			onJoinGame(nickname);
		});

		return () => socket.disconnect();
	}, [nickname]);

	const handleJoin = () => {
		if (nickname.trim()) {
			socket.emit("join_lobby", nickname);
			setIsWaiting(true);
		}
	};

	const handleStart = () => {
		socket.emit("start_game");
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
					<ul className="text-left">
						{players.map((p) => (
							<li key={p.id}>🔸 {p.nickname}</li>
						))}
					</ul>
					<button onClick={handleStart} className="start-button mt-4">
						開始遊戲
					</button>
				</div>
			)}
		</div>
	);
}
