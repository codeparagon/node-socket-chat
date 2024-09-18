const mysql = require('mysql');
const util = require('util');

const con = mysql.createConnection({
    host: "127.0.0.1",
    user: 'root',
    password: "",
    database: "adminpanel",
    // host: "127.0.0.1",
    // user: 'u713182227_adminpanal',
    // password: "AdminPanal@143",
    // database: "u713182227_adminpanal"
});

con.query = util.promisify(con.query);

con.connect(async (err) => {
    if (err) {
        console.error('Error connecting to the database:', err.stack);
        process.exit(1);
    }
    console.log('Connected to the database as id ' + con.threadId);

    // Check if tables exist, create them if not
    try {
        await checkAndCreateTables();
        console.log("Tables checked and created if necessary.");
    } catch (err) {
        console.error("Error checking or creating tables:", err);
        process.exit(1);
    }
});

async function checkAndCreateTables() {
    const tables = [
        {
            name: 'rooms',
            createSQL: `
                CREATE TABLE IF NOT EXISTS rooms (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user1_id INT NOT NULL,
                    user2_id INT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `
        },
        {
            name: 'room_messages',
            createSQL: `
                CREATE TABLE IF NOT EXISTS room_messages (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    room_id INT NOT NULL,
                    sender_id INT NOT NULL,
                    message TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (room_id) REFERENCES rooms(id)
                )
            `
        }
    ];

    for (const table of tables) {
        const result = await con.query(`SHOW TABLES LIKE '${table.name}'`);
        if (result.length === 0) {
            await con.query(table.createSQL);
            console.log(`Table '${table.name}' created.`);
        } else {
            console.log(`Table '${table.name}' already exists.`);
        }
    }
}

module.exports = con;