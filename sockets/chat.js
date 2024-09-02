const con = require('../config/db');
const users = {};


function initializeSocket(io) {
    io.on('connection', (socket) => {
        // console.log('A user connected:', socket.id);

        socket.on('setUser', async ({ userId, socketId }) => {
            try {
                if (userId) {
                    await storeSocketConnection(userId, socketId);
                    console.log(`User ${userId} set with socket id ${socket.id}`);
                    
                    const rooms = await getAllRooms(userId);

                    if (rooms.length === 0) {
                        socket.emit('userRooms', { message: 'No rooms found.' });
                    } else {
                        const formattedRooms = await formatRooms(rooms, userId);
                        socket.emit('userRooms', { rooms: formattedRooms });
                    }
                }
            } catch (err) {
                console.error('Error setting user:', err.stack);
            }
        });

        socket.on('chatMessage', async ({ message, targetUserId, senderUserId }) => {
            try {
                const room = await getOrCreateRoom(senderUserId, targetUserId);
    
                const targetSocketId = users[targetUserId];
                if (targetSocketId) {
                    io.to(targetSocketId).emit('chatMessage', { senderId: senderUserId, message });
    
                    await storeMessage(room.id, senderUserId, message);
    
                    console.log(`Message from ${senderUserId} to ${targetUserId} stored and emitted.`);
    
                } else {
                    console.log(`Target user ${targetUserId} not connected.`);
                }
            } catch (err) {
                console.error('Error handling chat message:', err.stack);
            }
        });

        // Handle typing indicator
        socket.on('typing', async ({ targetUserId, isTyping, senderUserId }) => {
            try {
                // const room = await getRoomById(roomId);
                // const otherUserId = room.user1_id === senderUserId ? room.user2_id : room.user1_id;
                // const targetSocketId = await getUserSocketId(otherUserId);
                
                const targetSocketId = await getUserSocketId(targetUserId);
                
                if (targetSocketId) {
                    io.to(targetSocketId).emit('typing', { isTyping, senderUserId });
                }
            } catch (err) {
                console.error('Error handling typing indicator:', err.stack);
            }
        });

        socket.on('disconnect', async () => {
            try {
               
                await con.query('DELETE FROM socket_connections WHERE socket_id = ?', [socket.id]);
                console.log('A user disconnected:', socket.id);
            } catch (err) {
                console.error('Error during disconnection:', err.stack);
            }
        });
    });
}

async function storeSocketConnection(userId, socketId) {
    const query = `
        INSERT INTO socket_connections (user_id, socket_id, created_at, updated_at)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE socket_id = VALUES(socket_id), updated_at = VALUES(updated_at)
    `;
    try {
        await con.query(query, [userId, socketId, new Date().toISOString(), new Date().toISOString()]);
        users[userId] = socketId; // Store the userId and socketId in memory
    } catch (err) {
        console.error('Error storing socket connection:', err.stack);
        throw err;
    }
}

async function getRoomById(roomId) {
    const queryFindRoom = `
        SELECT * FROM rooms WHERE id = ?
    `;
    try {
        let rooms = await con.query(queryFindRoom, [roomId]);
        return rooms[0];
    } catch (err) {
        console.error('Error retrieving room:', err.stack);
        throw err;
    }
}

async function getOrCreateRoom(user1Id, user2Id) {
    const queryFindRoom = `
        SELECT * FROM rooms 
        WHERE (user1_id = ? AND user2_id = ?) 
        OR (user1_id = ? AND user2_id = ?)
    `;
    const queryCreateRoom = `
        INSERT INTO rooms (user1_id, user2_id, created_at, updated_at)
        VALUES (?, ?, ?, ?)
    `;

    try {
        let rooms = await con.query(queryFindRoom, [user1Id, user2Id, user2Id, user1Id]);

        if (rooms.length === 0) {
            const result = await con.query(queryCreateRoom, [user1Id, user2Id, new Date().toISOString(), new Date().toISOString()]);
            
            return { id: result.insertId, user1_id: user1Id, user2_id: user2Id };
        } else {
            return rooms[0];
        }
    } catch (err) {
        console.error('Error creating or retrieving room:', err.stack);
        throw err;
    }
}

async function storeMessage(roomId, senderId, message) {
    const query = `
        INSERT INTO room_messages (room_id, sender_id, message, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
    `;
    try {
        await con.query(query, [roomId, senderId, message, new Date().toISOString(), new Date().toISOString()]);
        console.log(`Message stored successfully in room ${roomId} by sender ${senderId}`);
    } catch (err) {
        console.error('Error inserting message:', err.stack);
        throw err;
    }
}

async function getAllRooms(userId) {
    const queryFindRoom = `
        SELECT * FROM rooms 
        WHERE user1_id = ? OR user2_id = ?
    `;

    try {
        const rooms = await con.query(queryFindRoom, [userId, userId]);
        return rooms;
    } catch (err) {
        console.error('Error retrieving rooms:', err.stack);
        throw err;
    }
}

async function formatRooms(rooms, userId) {
    const formattedRooms = [];

    for (const room of rooms) {
        // Identify the other user in the room
        const otherUserId = (room.user1_id == userId) ? room.user2_id : room.user1_id;

        // Check if the other user is online
        const isOnline = await checkUserOnlineStatus(otherUserId);

        // Format the room with the other user's ID and online status
        formattedRooms.push({
            roomId: room.id,
            otherUserId: otherUserId,
            createdAt: room.created_at,
            updatedAt: room.updated_at,
            isOnline: isOnline
        });
    }

    return formattedRooms;
}

async function checkUserOnlineStatus(userId) {
    const queryCheckOnline = `
        SELECT COUNT(*) AS count FROM socket_connections
        WHERE user_id = ?
    `;

    try {
        const result = await con.query(queryCheckOnline, [userId]);
        return result[0].count > 0; // Return true if the user is online
    } catch (err) {
        console.error('Error checking user online status:', err.stack);
        throw err;
    }
}


async function getChatMessages(roomId) {
    const query = `
        SELECT * FROM room_messages
        WHERE room_id = ?
        ORDER BY created_at ASC
    `;
    try {
        const messages = await con.query(query, [roomId]);
        return messages;
    } catch (err) {
        console.error('Error fetching chat messages:', err.stack);
        throw err;
    }
}

async function getUserSocketId(userId) {
    const queryCheckOnline = `
        SELECT socket_id FROM socket_connections
        WHERE user_id = ?
    `;

    try {
        const result = await con.query(queryCheckOnline, [userId]);
        
        if (result.length > 0) {
            return result[0].socket_id; // Return the socket_id if the user is online
        } else {
            return null; // Return null if the user is not online
        }
    } catch (err) {
        console.error('Error checking user online status:', err.stack);
        throw err;
    }
}




module.exports = { initializeSocket, storeSocketConnection, storeMessage, getChatMessages, getOrCreateRoom, getAllRooms, formatRooms };
