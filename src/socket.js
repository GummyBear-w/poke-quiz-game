// src/socket.js
import { io } from "socket.io-client";

// 改成你的 Render URL
const SOCKET_URL = "https://poke-quiz-server.onrender.com";

const socket = io(SOCKET_URL, {
	transports: ["websocket"],
});

export default socket;
