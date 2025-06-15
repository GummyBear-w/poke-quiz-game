import React, { useEffect, useState } from "react";
import {
	Home,
	Sun,
	Moon,
	Trophy,
	Medal,
	Award,
	Star,
	Repeat,
	ArrowRight,
} from "lucide-react";
import confetti from "canvas-confetti";

export default function ResultPage({
	score, // 單人模式分數
	total, // 單人模式總題數
	onRestart, // 重新開始回調
	onBackToHome, // 返回主頁回調
	onToggleTheme, // 切換主題回調
	theme, // 當前主題
	result, // 多人模式結果數據
	socket, // socket連接
	isMultiplayer = false, // 是否多人模式
	isHost = false, // 是否房主
}) {
	const [showConfetti, setShowConfetti] = useState(false);
	const [hostDisconnected, setHostDisconnected] = useState(false);

	// 初始化時檢查是否為多人模式的獲勝者
	useEffect(() => {
		if (!isMultiplayer) return;

		// 檢查是否為房主斷線
		if (result && result.reason === "hostDisconnected") {
			setHostDisconnected(true);
		}

		// 如果是多人模式的贏家，放煙花效果
		if (
			result?.players &&
			result.players.length > 0 &&
			result.players.some((p) => p.id === socket?.id && p.rank === 1)
		) {
			setShowConfetti(true);
			launchConfetti();
		}
	}, [result, isMultiplayer, socket?.id]);

	// 煙花效果
	const launchConfetti = () => {
		const duration = 3000;
		const end = Date.now() + duration;

		const interval = setInterval(() => {
			if (Date.now() > end) {
				clearInterval(interval);
				return;
			}

			confetti({
				particleCount: 30,
				spread: 70,
				origin: { y: 0.6 },
				colors: ["#FFC000", "#FF3D00", "#4CAF50", "#2196F3", "#9C27B0"],
			});
		}, 250);
	};

	// 重新開始遊戲事件處理
	const handleRestart = () => {
		if (isMultiplayer && isHost && socket) {
			socket.emit("restart_game", { roomCode: result.roomCode });
		}
		onRestart();
	};

	// 獲取獎牌圖示
	const getRankIcon = (rank) => {
		switch (rank) {
			case 1:
				return <Trophy size={24} className="text-yellow-500" />;
			case 2:
				return <Medal size={24} className="text-gray-400" />;
			case 3:
				return <Award size={24} className="text-amber-700" />;
			default:
				return <Star size={20} className="text-gray-500" />;
		}
	};

	// 是否是當前用戶
	const isCurrentUser = (playerId) => socket && socket.id === playerId;

	// 處理排名數據
	const processPlayerRanks = () => {
		if (!result?.players || !Array.isArray(result.players)) return [];

		// 如果玩家已經有排名資料，直接返回
		if (result.players[0]?.rank) return result.players;

		// 否則計算排名
		let sortedPlayers = [...result.players].sort((a, b) => b.score - a.score);

		return sortedPlayers.map((player, index) => {
			// 處理相同分數的情況
			let rank = index + 1;
			if (index > 0 && player.score === sortedPlayers[index - 1].score) {
				rank = index; // 相同分數，相同排名
			}
			return { ...player, rank };
		});
	};

	// 獲取winner
	const getWinner = () => {
		if (result?.winner) return result.winner;

		const rankedPlayers = processPlayerRanks();
		return rankedPlayers.length > 0 ? rankedPlayers[0] : null;
	};

	// 渲染單人模式結果
	const renderSinglePlayerResult = () => (
		<div className="form-section items-center text-center">
			<h1 className="title mb-4 dark:text-white">遊戲結束！</h1>
			<p className="text-lg font-semibold dark:text-white">
				你答對了{" "}
				<span className="text-orange-500 dark:text-orange-400">{score}</span> /{" "}
				{total} 題
			</p>
			<button
				onClick={handleRestart}
				className="icon-button mt-6 text-black dark:text-white"
			>
				<ArrowRight size={32} />
			</button>
		</div>
	);

	// 渲染多人模式結果
	const renderMultiPlayerResult = () => {
		console.log("渲染多人結果:", result);

		// 數據檢查
		if (!result) {
			return (
				<div className="form-section items-center text-center">
					<h1 className="title mb-4 dark:text-white">遊戲結束</h1>
					<p className="text-lg font-semibold dark:text-white mb-4">
						無法載入遊戲結果
					</p>
					<button
						onClick={onBackToHome}
						className="start-button w-full mt-4 py-2.5 bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-black dark:text-white font-medium rounded"
					>
						返回主頁
					</button>
				</div>
			);
		}

		// 如果沒有玩家數據
		if (
			!result.players ||
			!Array.isArray(result.players) ||
			result.players.length === 0
		) {
			return (
				<div className="form-section items-center text-center">
					<h1 className="title mb-4 dark:text-white">遊戲結束</h1>
					<p className="text-lg font-semibold dark:text-white mb-4">
						無玩家數據
					</p>
					<button
						onClick={onBackToHome}
						className="start-button w-full mt-4 py-2.5 bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-black dark:text-white font-medium rounded"
					>
						返回主頁
					</button>
				</div>
			);
		}

		const rankedPlayers = processPlayerRanks();
		const winner = getWinner();

		// 注意這裡添加了 return 語句
		return (
			<div className="form-section mt-0 max-w-md w-full">
				{/* 房主斷線提示 */}
				{hostDisconnected && (
					<div className="w-full mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-center">
						{result.message || "房主已離線，遊戲提前結束！"}
					</div>
				)}

				{/* 贏家區域 */}
				{winner && (
					<div className="bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-orange-900/30 p-4 rounded-xl mb-6 text-center">
						<div className="text-xl font-bold mb-2 text-amber-800 dark:text-amber-400">
							🏆 獲勝玩家
						</div>
						<div className="text-2xl font-bold text-amber-600 dark:text-amber-500">
							{winner.nickname}
							{isCurrentUser(winner.id) && " (你)"}
						</div>
						<div className="text-lg mt-1 text-amber-700 dark:text-amber-400">
							{winner.score} 分
						</div>
					</div>
				)}

				{/* 排行榜表格 */}
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden mb-6">
					<div
						className="p-3 bg-amber-500 dark:bg-orange-600 text-white"
						style={{
							backgroundColor: theme === "dark" ? "#f59e0b" : "grey",
						}}
					>
						<h3 className="font-bold text-center">最終排名</h3>
					</div>
					<div className="overflow-hidden">
						<table className="w-full">
							<thead className="bg-amber-100 dark:bg-gray-700">
								<tr>
									<th className="px-3 py-2 text-left font-medium text-black dark:text-white">
										名次
									</th>
									<th className="px-3 py-2 text-left font-medium text-black dark:text-white">
										玩家
									</th>
									<th className="px-3 py-2 text-right font-medium text-black dark:text-white">
										分數
									</th>
								</tr>
							</thead>
							<tbody>
								{rankedPlayers.map((player, index) => (
									<tr
										key={player.id || index}
										className={`${
											isCurrentUser(player.id)
												? "bg-amber-100 dark:bg-orange-900/40 font-bold"
												: index % 2 === 0
												? "bg-white dark:bg-gray-800"
												: "bg-gray-50 dark:bg-gray-700"
										} border-b dark:border-gray-700`}
									>
										<td className="px-3 py-3 text-gray-900 dark:text-gray-200 flex items-center">
											{getRankIcon(player.rank || index + 1)}
											<span className="ml-2">{player.rank || index + 1}</span>
										</td>
										<td className="px-3 py-3 text-gray-900 dark:text-gray-200">
											{player.nickname || `玩家${index + 1}`}
											{isCurrentUser(player.id) && (
												<span className="ml-1 text-xs bg-amber-100 text-amber-800 dark:bg-orange-800 dark:text-orange-200 px-1.5 py-0.5 rounded-full">
													你
												</span>
											)}
										</td>
										<td className="px-3 py-3 text-right text-gray-900 dark:text-gray-200">
											{player.score || 0}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>

				{/* 重新開始按鈕 (如果是房主) */}
				{isHost ? (
					<button
						onClick={handleRestart}
						className="start-button w-full py-3 bg-amber-500 hover:bg-amber-600 dark:bg-orange-600 dark:hover:bg-orange-700 text-white dark:text-white font-medium rounded flex items-center justify-center gap-2"
					>
						<Repeat size={18} /> 再來一局
					</button>
				) : (
					<div className="text-center text-sm text-gray-500 dark:text-gray-400">
						等待房主開始新遊戲...
					</div>
				)}

				{/* 返回主頁按鈕 */}
				<button
					onClick={onBackToHome}
					className="start-button w-full mt-4 py-2.5 bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-black dark:text-white font-medium rounded"
				>
					返回主頁
				</button>
			</div>
		);
	};

	return (
		<div className={`entry-page centered ${theme}`}>
			{/* 標題欄 - 只在多人模式顯示 */}
			{isMultiplayer && (
				<div className="top-bar flex justify-between items-center w-full max-w-2xl px-4">
					<button
						onClick={onBackToHome}
						className="icon-button text-black dark:text-white"
					>
						<Home size={24} />
					</button>
					<h1 className="title text-lg sm:text-xl font-bold text-center dark:text-white">
						遊戲結束 - 排行榜
					</h1>
					<button
						onClick={onToggleTheme}
						className="icon-button text-black dark:text-white"
					>
						{theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
					</button>
				</div>
			)}

			{/* 根據模式渲染不同內容 */}
			{isMultiplayer ? renderMultiPlayerResult() : renderSinglePlayerResult()}
		</div>
	);
}
