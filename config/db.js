//数据库配置
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'Hikari1025',
    database: 'community_influence'
});

module.exports = pool;