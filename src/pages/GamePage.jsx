import React, { useEffect, useState, useRef } from "react";
import { Home, Sun, Moon, Users } from "lucide-react";

export default function GamePage({
	theme,
	settings,
	onFinish,
	onBackToHome,
	onToggleTheme,
	socket = null, // 透過參數傳入socket
}) {
	const {
		questions: totalQuestions,
		timer: timePerQuestion,
		isMultiplayer = false,
		nickname = "",
	} = settings;

	const [questionIndex, setQuestionIndex] = useState(0);
	const [pokemon, setPokemon] = useState(null);
	const [acceptedAnswers, setAcceptedAnswers] = useState([]);
	const [userAnswer, setUserAnswer] = useState("");
	const [score, setScore] = useState(0);
	const [timeLeft, setTimeLeft] = useState(timePerQuestion);
	const [isComposing, setIsComposing] = useState(false);
	const [imageLoading, setImageLoading] = useState(true);
	const [hasAnswered, setHasAnswered] = useState(false);
	const [answerBubbles, setAnswerBubbles] = useState([]);
	const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
	const [correctAnswer, setCorrectAnswer] = useState("");
	const [isCorrect, setIsCorrect] = useState(false);
	const [players, setPlayers] = useState([]);
	const [showScoreboard, setShowScoreboard] = useState(false);

	// 其他 useRef 參數...
	const timerRef = useRef(null);
	const inputRef = useRef(null);
	const processingRef = useRef(false);
	const fetchingRef = useRef(false);
	const questionRef = useRef(-1);

	// 單人模式邏輯
	useEffect(() => {
		if (isMultiplayer) return; // 多人模式跳過此邏輯

		// 原先的 useEffect 邏輯
		if (questionRef.current === questionIndex) return;
		questionRef.current = questionIndex;

		if (questionIndex >= totalQuestions) {
			onFinish(score);
			return;
		}

		setImageLoading(true);
		setPokemon(null);
		setHasAnswered(false);
		processingRef.current = false;
		fetchingRef.current = false;
		setUserAnswer("");
		setAnswerBubbles([]);
		setShowCorrectAnswer(false);
		setCorrectAnswer("");

		loadPokemon();
		return () => clearInterval(timerRef.current);
	}, [questionIndex, isMultiplayer]);

	// 多人模式邏輯
	useEffect(() => {
		if (!isMultiplayer || !socket) return; // 單人模式跳過此邏輯

		// 監聽伺服器事件
		const handleGameQuestion = (data) => {
			setImageLoading(true);
			setHasAnswered(false);
			processingRef.current = false;
			setUserAnswer("");
			setAnswerBubbles([]);
			setShowCorrectAnswer(false);
			setCorrectAnswer("");

			setPokemon({
				img: data.imageUrl,
				nameZh: data.correctAnswer,
			});
			setAcceptedAnswers(data.acceptedAnswers);
			setCorrectAnswer(data.correctAnswer);
			setImageLoading(false);
			setQuestionIndex(data.questionNumber - 1);
			setTimeLeft(data.timeRemaining);

			// 聚焦輸入框
			setTimeout(() => inputRef.current?.focus(), 100);
		};

		const handleGameUpdate = (data) => {
			setPlayers(data.players);
		};

		const handleTimeUpdate = (data) => {
			setTimeLeft(data.timeRemaining);
		};

		const handleShowAnswer = (data) => {
			setHasAnswered(true);
			setShowCorrectAnswer(true);
			setCorrectAnswer(data.correctAnswer);
		};

		const handlePlayerAnswered = (data) => {
			// 顯示其他玩家的回答
			if (data.playerId !== socket.id) {
				setAnswerBubbles((prev) => [
					...prev,
					{
						id: Date.now(),
						text: data.nickname + ": " + data.answer,
						correct: data.correct,
						top: Math.random() * 85,
						left: Math.random() * 85,
						dx: Math.random() * 85 - 50,
						dy: Math.random() * 85 - 50,
						duration: 6 + Math.random() * 2,
					},
				]);
			}

			// 如果是自己答對了
			if (data.playerId === socket.id && data.correct) {
				setIsCorrect(true);
			}
		};

		const handleGameOver = (data) => {
			// 遊戲結束
			onFinish(data.players.find((p) => p.id === socket.id)?.score || 0);
		};

		socket.on("game_question", handleGameQuestion);
		socket.on("game_update", handleGameUpdate);
		socket.on("time_update", handleTimeUpdate);
		socket.on("show_answer", handleShowAnswer);
		socket.on("player_answered", handlePlayerAnswered);
		socket.on("game_over", handleGameOver);

		return () => {
			socket.off("game_question", handleGameQuestion);
			socket.off("game_update", handleGameUpdate);
			socket.off("time_update", handleTimeUpdate);
			socket.off("show_answer", handleShowAnswer);
			socket.off("player_answered", handlePlayerAnswered);
			socket.off("game_over", handleGameOver);
		};
	}, [isMultiplayer, socket]);

	// 單人模式函數
	const loadPokemon = () => {
		if (fetchingRef.current) return;
		fetchingRef.current = true;
		fetchPokemon();
	};

	const fetchPokemon = async () => {
		clearInterval(timerRef.current);
		try {
			await new Promise((r) => setTimeout(r, 100));
			const id = Math.floor(Math.random() * 1010) + 1;
			const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
			const data = await res.json();
			const speciesRes = await fetch(data.species.url);
			const speciesData = await speciesRes.json();

			const zhEntry = speciesData.names.find(
				(n) => n.language.name === "zh-Hant"
			);
			const nameZh = zhEntry?.name || speciesData.names[0]?.name || "未知";
			const allNames = speciesData.names.map((n) => n.name);
			allNames.push(data.name); // 英文名

			const image = new Image();
			image.src = data.sprites.other["official-artwork"].front_default;
			image.onload = () => {
				if (questionRef.current === questionIndex) {
					setPokemon({ img: image.src, nameZh });
					setAcceptedAnswers(allNames.map((n) => n.toLowerCase()));
					setCorrectAnswer(nameZh);
					setImageLoading(false);
					setTimeLeft(timePerQuestion);
					startCountdown();
					setTimeout(() => inputRef.current?.focus(), 100);
				}
			};

			fetchingRef.current = false;
		} catch (error) {
			console.error("獲取寶可夢資料失敗:", error);
			fetchingRef.current = false;
			setTimeout(fetchPokemon, 1000); // 失敗後重試
		}
	};

	const startCountdown = () => {
		clearInterval(timerRef.current);
		timerRef.current = setInterval(() => {
			setTimeLeft((prev) => {
				if (prev <= 1) {
					clearInterval(timerRef.current);
					handleTimeUp();
					return 0;
				}
				return prev - 1;
			});
		}, 1000);
	};

	const handleTimeUp = () => {
		if (processingRef.current) return;
		processingRef.current = true;
		setHasAnswered(true);
		setIsCorrect(false); // 沒答出就是錯
		setShowCorrectAnswer(true);
		setTimeout(() => setQuestionIndex((prev) => prev + 1), 2000);
	};

	// 檢查答案 - 處理多人與單人模式
	const checkAnswer = () => {
		if (hasAnswered || processingRef.current) return;
		const input = userAnswer.trim().toLowerCase();

		if (isMultiplayer) {
			// 多人模式: 發送答案到伺服器
			socket.emit("submit_answer", {
				answer: userAnswer.trim(),
			});

			// 顯示自己的答案泡泡
			const id = Date.now();
			setAnswerBubbles((prev) => [
				...prev,
				{
					id,
					text: nickname + ": " + userAnswer.trim(),
					correct: acceptedAnswers.includes(input),
					top: Math.random() * 85,
					left: Math.random() * 85,
					dx: Math.random() * 85 - 50,
					dy: Math.random() * 85 - 50,
					duration: 6 + Math.random() * 2,
				},
			]);

			setUserAnswer("");
			setTimeout(() => inputRef.current?.focus(), 300);
		} else {
			// 單人模式: 原有的檢查邏輯
			const correct = acceptedAnswers.includes(input);
			const id = Date.now();
			setAnswerBubbles((prev) => [
				...prev,
				{
					id,
					text: userAnswer.trim(),
					correct,
					top: Math.random() * 85,
					left: Math.random() * 85,
					dx: Math.random() * 85 - 50,
					dy: Math.random() * 85 - 50,
					duration: 6 + Math.random() * 2,
				},
			]);

			if (correct) {
				processingRef.current = true;
				setHasAnswered(true);
				clearInterval(timerRef.current);
				setScore((prev) => prev + 1);
				setIsCorrect(true);
				setShowCorrectAnswer(true);
				setTimeout(() => setQuestionIndex((prev) => prev + 1), 1500);
			} else {
				setUserAnswer("");
				setIsCorrect(false);
				setTimeout(() => inputRef.current?.focus(), 300);
			}
		}
	};

	const spinnerColor =
		theme === "dark" ? "border-orange-400" : "border-amber-500";
	const correctColor = theme === "dark" ? "text-white" : "text-orange-500";

	return (
		<div className={`entry-page centered ${theme}`}>
			{/* Header */}
			<div className="top-bar flex justify-between items-center w-full max-w-2xl px-4">
				<button
					onClick={onBackToHome}
					className="icon-button text-black dark:text-white"
				>
					<Home size={24} />
				</button>
				<h1 className="title text-lg sm:text-xl font-bold text-center">
					第 {questionIndex + 1} / {totalQuestions} 題
				</h1>
				<div className="flex gap-2">
					{isMultiplayer && (
						<button
							onClick={() => setShowScoreboard(!showScoreboard)}
							className="icon-button text-black dark:text-white"
						>
							<Users size={20} />
						</button>
					)}
					<button
						onClick={onToggleTheme}
						className="icon-button text-black dark:text-white"
					>
						{theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
					</button>
				</div>
			</div>

			{/* 多人遊戲排行榜 */}
			{isMultiplayer && showScoreboard && (
				<div className="w-full max-w-md mb-4 rounded-lg overflow-hidden shadow-lg bg-white dark:bg-gray-800">
					<div className="p-3 bg-amber-500 dark:bg-orange-600 text-white">
						<h3 className="font-bold text-center">玩家排行榜</h3>
					</div>
					<div className="p-2">
						{[...players]
							.sort((a, b) => b.score - a.score)
							.map((player, index) => (
								<div
									key={player.id}
									className={`flex justify-between items-center p-2 ${
										player.id === socket.id
											? "font-bold bg-amber-100 dark:bg-orange-900 rounded"
											: ""
									}`}
								>
									<div className="flex items-center">
										<span className="mr-2">{index + 1}.</span>
										<span>{player.nickname}</span>
										{player.id === socket.id && (
											<span className="ml-1">(你)</span>
										)}
									</div>
									<span>{player.score} 分</span>
								</div>
							))}
					</div>
				</div>
			)}

			{/* Content */}
			<div className="form-section items-center relative">
				<p className="text-lg font-semibold">倒數：{timeLeft} 秒</p>

				{/* 圖片 */}
				<div className="w-48 h-48 flex items-center justify-center my-4">
					{imageLoading ? (
						<div className="text-center">
							<div
								className={`animate-spin h-10 w-10 border-4 ${spinnerColor} rounded-full border-t-transparent mx-auto`}
							></div>
							<p className="mt-2">載入中...</p>
						</div>
					) : (
						pokemon && (
							<img
								src={pokemon.img}
								alt="寶可夢"
								className="w-full h-full object-contain"
							/>
						)
					)}
				</div>

				{/* 正解區塊（固定高度） */}
				<div className="h-6 mb-3">
					{showCorrectAnswer && (
						<p className={`font-semibold ${correctColor}`}>
							{isCorrect
								? `答對了：${correctAnswer}`
								: `正解：${correctAnswer}`}
						</p>
					)}
				</div>

				{/* 輸入框 */}
				<input
					ref={inputRef}
					className="w-full p-2 rounded-lg focus:outline-none focus:ring-0 
             text-black dark:text-white bg-white dark:bg-[#1f1f1f] border border-gray-300 dark:border-orange-400"
					placeholder="請輸入寶可夢名稱"
					value={userAnswer}
					onChange={(e) => setUserAnswer(e.target.value)}
					onCompositionStart={() => setIsComposing(true)}
					onCompositionEnd={() => setIsComposing(false)}
					onKeyDown={(e) => {
						if (e.key === "Enter" && !isComposing) {
							checkAnswer();
						}
					}}
					autoComplete="off"
					disabled={hasAnswered}
				/>

				{/* 氣泡 - 保持不變 */}
				<div className="fixed top-0 left-0 w-screen h-screen pointer-events-none overflow-hidden z-10">
					{answerBubbles.map((b) => {
						// 與原來相同的氣泡實現
						const ruleName = `floatBubble-${b.id}`;
						const keyframes = `
              @keyframes ${ruleName} {
                0% { transform: translate(0px, 0px) scale(1); }
                25% { transform: translate(${b.dx}px, ${-b.dy}px) scale(1.1); }
                50% { transform: translate(${b.dx / 2}px, ${
							b.dy / 2
						}px) scale(0.95); }
                75% { transform: translate(${-b.dx}px, ${b.dy}px) scale(1.05); }
                100% { transform: translate(0px, 0px) scale(1); }
              }
            `;
						try {
							const sheet = document.styleSheets[0];
							const exists = [...sheet.cssRules].some(
								(rule) => rule.name === ruleName
							);
							if (!exists) sheet.insertRule(keyframes, sheet.cssRules.length);
						} catch (err) {
							console.warn("⚠️ 無法插入動畫:", err);
						}

						return (
							<div
								key={b.id}
								className={`absolute px-4 py-2 text-base font-semibold rounded-full shadow-lg
                ${
									b.correct
										? "bg-yellow-400 bg-opacity-80 text-white"
										: "bg-orange-600 bg-opacity-80 text-white"
								}`}
								style={{
									top: `${b.top}%`,
									left: `${b.left}%`,
									animation: `floatBubble-${b.id} ${b.duration}s ease-in-out infinite`,
									transform: "translate(-50%, -50%)",
								}}
							>
								{b.text}
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
