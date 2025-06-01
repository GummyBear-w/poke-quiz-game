// 使用 localStorage 而不是 sessionStorage 以確保數據持久性
const STORAGE_KEY = "pokemonGameRoomData";

// 默認房間數據
const DEFAULT_ROOM_DATA = {
	roomCode: "",
	nickname: "",
	isCreator: false,
	lastUpdated: null,
};

// 全局内存变量，用于跨组件状态共享
const globalRoomState = {
	...DEFAULT_ROOM_DATA,
};

// 变更监听器列表
const listeners = [];

// 添加状态变更监听器
export function addListener(callback) {
	listeners.push(callback);
	return () => {
		const index = listeners.indexOf(callback);
		if (index > -1) listeners.splice(index, 1);
	};
}

// 通知所有监听器
function notifyListeners() {
	listeners.forEach((listener) => listener(globalRoomState));
}

// 從存儲中獲取數據并初始化内存中的全局状态
export function initRoomData() {
	try {
		const data = localStorage.getItem(STORAGE_KEY);
		if (data) {
			const parsedData = JSON.parse(data);
			Object.assign(globalRoomState, parsedData);
			console.log("從本地存儲加載房間數據:", globalRoomState);
		}
	} catch (e) {
		console.error("讀取房間數據失敗", e);
	}
	return { ...globalRoomState };
}

// 获取当前房间数据
export function getRoomData() {
	return { ...globalRoomState };
}

// 保存數據到存儲并更新内存中的全局状态
export function saveRoomData(data) {
	Object.assign(globalRoomState, data, {
		lastUpdated: new Date().toISOString(),
	});

	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(globalRoomState));
		console.log("已更新房間數據:", globalRoomState);
	} catch (e) {
		console.error("保存房間數據失敗", e);
	}

	// 通知所有监听器
	notifyListeners();

	return { ...globalRoomState };
}

// 清除房間數據
export function clearRoomData() {
	Object.assign(globalRoomState, DEFAULT_ROOM_DATA);

	try {
		localStorage.removeItem(STORAGE_KEY);
		console.log("已清除房間數據");
	} catch (e) {
		console.error("清除房間數據失敗", e);
	}

	// 通知所有监听器
	notifyListeners();

	return { ...DEFAULT_ROOM_DATA };
}

// 獲取房間代碼
export function getRoomCode() {
	return globalRoomState.roomCode || "";
}

// 檢查是否是創建者
export function isCreator() {
	return globalRoomState.isCreator || false;
}

// 获取昵称
export function getNickname() {
	return globalRoomState.nickname || "";
}

// 初始化模块，加载存储中的数据
initRoomData();

export default {
	getRoomData,
	saveRoomData,
	clearRoomData,
	getRoomCode,
	isCreator,
	getNickname,
	addListener,
};
