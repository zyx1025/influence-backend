//server配置
module.exports = {
    port: 3000,
    secretKey: 'lbz', //jwt token生成用的，部署上线时改为环境变量（如process.env.SECRET_KEY）
}