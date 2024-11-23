//数据库配置
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '123456',
    database: 'community_influence'
});

module.exports = pool;