const { generateRandomText } = require('./utils');

const defaultRoomValue = { value: '', lastUpdate: '', usersCount: 0 };

const store = {
    default: { ...defaultRoomValue },
};

// - Store Structure
// room_id: {
//   value: "",
//   lastUpdate: "",
//   usersCount: 0,
// },

const addNewRoom = (roomId = generateRandomText(6)) => {
    if (isRoomExists(roomId)) return false;

    store[roomId] = { ...defaultRoomValue };
    return true;
};

const getRoomData = (roomId) => store[roomId];

const isRoomExists = (roomId) => !!store[roomId];

const updateRoomData = (roomId, data) => {
    if (!isRoomExists(roomId)) return false;
    const { lastUpdate, value } = data;

    if (store[roomId].lastUpdate < lastUpdate) {
        store[roomId].value = value;
        store[roomId].lastUpdate = lastUpdate;
    }

    return true;
};

const addUserToRoom = (roomId) => {
    if (!isRoomExists(roomId)) return false;
    ++store[roomId].usersCount;
    return true;
};

const removeUserFromRoom = (roomId) => {
    if (!isRoomExists(roomId)) return false;
    --store[roomId].usersCount;
    return true;
};

module.exports = {
    addNewRoom,
    updateRoomData,
    getRoomData,
    isRoomExists,
    addUserToRoom,
    removeUserFromRoom,
    updateRoomData,
};
