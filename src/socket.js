import { io } from "socket.io-client";

// 這裡請填寫你部署到 Render 上的 Socket.IO server URL（或 localhost 測試）
const URL = "http://localhost:3001"; // ← 開發階段用

export const socket = io(URL, {
	autoConnect: false,
});
