const mysql = require('mysql');
const util = require('util');

const con = mysql.createConnection({
    host: "127.0.0.1",
    user: 'root',
    password: "",
    database: "adminpanel"
});

con.query = util.promisify(con.query);

con.connect(err => {
    if (err) {
        console.error('Error connecting to the database:', err.stack);
        process.exit(1);
    }
    console.log('Connected to the database as id ' + con.threadId);
});

module.exports = con;