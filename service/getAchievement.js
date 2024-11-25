const express = require('express');
const router = express.Router();
const authToken = require("../utils/authenticate")
const {getUserLevels, getCommunityId, getCommunityAchievements} = require("../utils/dbUtils")

router.post('/achievements', async (req, res) => {

    console.log(req.body);

    const { area } = req.body;
    const { token } = req.headers;

    if (!area) {
        return res.status(400).json({ error: 'area is required' });
    }

    if(!authToken(token)){
        return res.status(403).json({ error: 'Authentication failed: Invalid token' });
    }


    const communityId = await getCommunityId(area);
    const userAchievements = await getCommunityAchievements(communityId);

    res.json({
        code: 200,
        message: '获取社群用户成就数据成功',
        data: { userAchievements }
    });
});

module.exports = router;