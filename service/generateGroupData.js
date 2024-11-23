/*
 说明：原本社群数据由其它系统提供。为了节省服务器数量，本server代替该系统产生社群数据
 即原本以下代码是别的系统的，但本系统把它的活接过来了
 */
const { generateUserData } = require('../utils/generateData');
const express = require('express');

const router = express.Router();

router.post('/userData', (req, res) => {
    console.log(req.body);

    const { area } = req.body;

    if (!area) {
        return res.status(400).json({ error: 'area is required' });
    }

    const communitySize = 20;
    const users = generateUserData(area, communitySize);

    // 返回响应
    res.json({
        code: 200,
        message: '获取社群数据成功',
        data: { users }
    });
});

module.exports = router;
