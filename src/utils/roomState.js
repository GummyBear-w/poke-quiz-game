// 共享狀態模組
const roomState = {
	roomCode: "",
	nickname: "",
	isCreator: false,
};

// 存儲到 sessionStorage
export const saveRoomState = () => {
	try {
		sessionStorage.setItem("roomCode", roomState.roomCode);
		sessionStorage.setItem("nickname", roomState.nickname);
		sessionStorage.setItem("isCreator", String(roomState.isCreator));
		console.log("保存房間狀態到 sessionStorage:", roomState);
	} catch (e) {
		console.error("保存到 sessionStorage 失敗:", e);
	}
};

// 從 sessionStorage 加載
export const loadRoomState = () => {
	try {
		const roomCode = sessionStorage.getItem("roomCode") || "";
		const nickname = sessionStorage.getItem("nickname") || "";
		const isCreator = sessionStorage.getItem("isCreator") === "true";

		roomState.roomCode = roomCode;
		roomState.nickname = nickname;
		roomState.isCreator = isCreator;

		console.log("從 sessionStorage 載入房間狀態:", roomState);
		return roomState;
	} catch (e) {
		console.error("從 sessionStorage 加載失敗:", e);
		return roomState;
	}
};

// 更新狀態
export const updateRoomState = (newState) => {
	Object.assign(roomState, newState);
	saveRoomState();
	return roomState;
};

// 獲取當前狀態
export const getRoomState = () => {
	return roomState;
};

export default {
	getRoomState,
	updateRoomState,
	loadRoomState,
	saveRoomState,
};
