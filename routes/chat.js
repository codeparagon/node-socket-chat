const express = require('express');
const router = express.Router();
const { storeSocketConnection, getChatMessages, getOrCreateRoom, getAllRooms, formatRooms } = require('../sockets/chat');


// Route to connect a user by storing their socket connection
router.post('/connect', async (req, res) => {
    const { userId, socketId } = req.body;

    if (!userId || !socketId) {
        return res.status(400).json({ error: 'User ID and Socket ID are required.' });
    }

    try {
        await storeSocketConnection(userId, socketId);
        res.json({ message: 'User connected successfully.' });
    } catch (err) {
        console.error('Error connecting user:', err);
        res.status(500).json({ error: 'Failed to connect user.' });
    }
});

// Route to get chat messages between two users
router.post('/get-chat', async (req, res) => {
    const { senderId, receiverId } = req.body;

    if (!senderId || !receiverId) {
        return res.status(400).json({ error: 'Sender ID and Receiver ID are required.' });
    }

    try {
        // Retrieve the room between the sender and receiver
        const room = await getOrCreateRoom(senderId, receiverId);

        // Get chat messages from the room
        const messages = await getChatMessages(room.id);

        const groupedMessages = messages.reduce((acc, message) => {
            if (!acc[message.room_id]) {
                acc[message.room_id] = {
                    room_id: message.room_id,
                    messages: []
                };
            }
            acc[message.room_id].messages.push({
                id: message.id,
                sender_id: message.sender_id,
                message: message.message,
                created_at: message.created_at,
                updated_at: message.updated_at
            });
            return acc;
        }, {});

        const result = Object.values(groupedMessages);

        res.json(result[0]);
    } catch (err) {
        console.error('Error retrieving chat messages:', err);
        res.status(500).json({ error: 'Failed to retrieve chat messages.' });
    }
});

router.post('/get-room-chat', async (req, res) => {
    const { roomId } = req.body;

    if (!roomId) {
        return res.status(400).json({ error: 'Room ID is required.' });
    }

    try {

        // Get chat messages from the room
        const messages = await getChatMessages(roomId);

        const groupedMessages = messages.reduce((acc, message) => {
            if (!acc[message.room_id]) {
                acc[message.room_id] = {
                    room_id: message.room_id,
                    messages: []
                };
            }
            acc[message.room_id].messages.push({
                id: message.id,
                sender_id: message.sender_id,
                message: message.message,
                created_at: message.created_at,
                updated_at: message.updated_at
            });
            return acc;
        }, {});

        const result = Object.values(groupedMessages);

        res.json(result[0]);
    } catch (err) {
        console.error('Error retrieving chat messages:', err);
        res.status(500).json({ error: 'Failed to retrieve chat messages.' });
    }
});


// Route to get or create a room between two users
router.post('/get-room', async (req, res) => {
    const { user1Id, user2Id } = req.body;

    if (!user1Id || !user2Id) {
        return res.status(400).json({ error: 'Both User IDs are required.' });
    }

    try {
        const room = await getOrCreateRoom(user1Id, user2Id);
        res.json({ room });
    } catch (err) {
        console.error('Error getting or creating room:', err);
        res.status(500).json({ error: 'Failed to get or create room.' });
    }
});

// Route to get or create a room between two users
router.post('/get-user-rooms', async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required.' });
    }

    try {
        const rooms = await getAllRooms(userId);

        if (rooms.length === 0) {
            return res.status(404).json({ message: 'No rooms found.' });
        }

        const formattedRooms = await formatRooms(rooms, userId);

        res.json({ rooms: formattedRooms });
    } catch (err) {
        console.error('Error retrieving rooms:', err);
        res.status(500).json({ error: 'Failed to retrieve rooms.' });
    }
});


module.exports = router;