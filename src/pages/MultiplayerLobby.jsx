import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { Home, Sun, Moon } from "lucide-react";

export default function MultiplayerLobby({
	theme,
	onToggleTheme,
	onBack,
	onJoinGame,
}) {
	const [nickname, setNickname] = useState("");
	const [players, setPlayers] = useState([]);
	const [isWaiting, setIsWaiting] = useState(false);
	const socketRef = useRef(null);

	// First useEffect to initialize socket when component mounts
	useEffect(() => {
		// Create socket connection when component mounts
		const socket = io(
			import.meta.env.MODE === "development"
				? "http://localhost:3001"
				: "https://poke-quiz-server.onrender.com"
		);
		socketRef.current = socket;

		// Clean up on unmount
		return () => {
			if (socketRef.current) {
				socketRef.current.disconnect();
			}
		};
	}, []);

	// Second useEffect to handle socket events
	useEffect(() => {
		if (!socketRef.current) return;

		const socket = socketRef.current;

		// Define handlers
		const handleLobbyUpdate = (data) => {
			console.log("📥 收到 lobby_update", data);
			setPlayers(data);
		};

		const handleGameStart = () => {
			console.log("✅ 收到 game_started");
			onJoinGame(nickname);
		};

		// Add event listeners
		socket.on("lobby_update", handleLobbyUpdate);
		socket.on("game_started", handleGameStart);

		// Clean up event listeners
		return () => {
			socket.off("lobby_update", handleLobbyUpdate);
			socket.off("game_started", handleGameStart);
		};
	}, [nickname, onJoinGame, socketRef.current]);

	const handleJoin = () => {
		if (nickname.trim() && socketRef.current) {
			socketRef.current.emit("join_lobby", nickname);
			setIsWaiting(true);
		}
	};

	const handleStart = () => {
		if (socketRef.current) {
			socketRef.current.emit("start_game");
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
					<ul className="text-left">
						{players.length > 0 ? (
							players.map((p) => <li key={p.id}>🗣️ {p.nickname}</li>)
						) : (
							<li>等待玩家加入...</li>
						)}
					</ul>
					<p className="mt-2 text-sm">目前玩家數: {players.length}</p>

					<button onClick={handleStart} className="start-button mt-4">
						開始遊戲
					</button>
				</div>
			)}
		</div>
	);
}
