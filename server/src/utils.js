const generateRandomText = (length) => {
    return Math.random()
        .toString(36)
        .substring(2, 2 + length);
};

const successResponse = (roomId, data) => ({ status: true, data: { roomId, ...data } });

module.exports = { generateRandomText, successResponse };
