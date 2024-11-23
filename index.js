const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const serverConfig = require('./config/server');
const app = express();
const PORT = serverConfig.port;

const userRouter = require('./routes/userRouter')
const levelRouter = require('./routes/levelRouter');
const userInfluenceRouter = require('./routes/userInfluenceRouter')
const groupRouter = require('./routes/groupRouter')
const indexRouter = require('./routes/InfIndexRouter')
const achievementRouter = require('./routes/achievementRouter')

const achievementService = require('./service/getAchievement')
const generateGroupService = require('./service/generateGroupData')

app.use(bodyParser.json());
app.use(cors());

//路由配置
app.use(userRouter);
app.use(userInfluenceRouter);
app.use(levelRouter);
app.use(groupRouter);
app.use(indexRouter);
app.use(achievementRouter);

//本系统提供的服务
app.use('/api/v1', generateGroupService);
app.use('/api/v1', achievementService);

app.listen(PORT, () => {
    console.log(`服务器已启动，监听端口 ${PORT}`);
});
