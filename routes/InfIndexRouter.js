const express = require('express');
const pool = require("../config/db")
const router = express.Router();
const {getUserLevels, getCommunityId} = require('../utils/dbUtils');

// POST 请求：获取社群影响力最高的前 10 用户
router.post('/index/influence', async (req, res) => {
    const { area } = req.body;

    if (!area) {
        return res.status(400).json({ message: '社群名称不能为空' });
    }

    try {
        // 1. 查询 community_id
        const communityQuery = `
      SELECT community_id
      FROM community
      WHERE name LIKE ?
      LIMIT 1
    `;
        const [communityResults] = await pool.execute(communityQuery, [`%${area}%`]);

        if (communityResults.length === 0) {
            return res.status(404).json({ message: '未找到符合条件的社群' });
        }

        const communityId = communityResults[0].community_id;

        // 2. 查询当前日期的影响力 Top 10 (user_id, influence_score)
        const influenceQuery = `
          SELECT user_id, influence_score
          FROM UserCommunityInfluence
          WHERE community_id = ? 
          AND record_date = CURDATE()
          ORDER BY influence_score DESC
          LIMIT 10
        `;
        const [influenceResults] = await pool.execute(influenceQuery, [communityId]);

        if (influenceResults.length === 0) {
            return res.status(200).json({ code: 200, message: 'success', data: { user_influence_most: [] } });
        }

        // 3. 根据 user_id 和 community_id 查询 current_level
        const userIds = influenceResults.map(user => user.user_id); // 提取影响力前10的 user_id

        const placeholders = userIds.map(() => '?').join(',');
        const promotionQuery = `
          SELECT user_id, current_level
          FROM UserPromotionRecord
          WHERE community_id = ?
          AND user_id IN (${placeholders})
        `;
        const [promotionResults] = await pool.execute(promotionQuery, [communityId, ...userIds]);

        // 4. 合并影响力和等级数据
        const userInfluenceMost = influenceResults.map(user => {
            const promotionData = promotionResults.find(p => p.user_id === user.user_id);
            return {
                id: user.user_id,
                influence: user.influence_score,
                level: promotionData ? promotionData.current_level : null, // 如果没找到记录，则等级为 null
            };
        });

        // 返回查询结果
        res.status(200).json({
            code: 200,
            message: 'success',
            data: {
                user_influence_most: userInfluenceMost,
            },
        });
    } catch (error) {
        console.error('查询失败：', error);
        res.status(500).json({ message: '服务器错误，无法查询用户影响力' });
    }
});

// POST 请求：获取社群影响力一周增长最快的前 10 用户
router.post('/index/increase', async (req, res) => {
    const { area } = req.body;

    if (!area) {
        return res.status(400).json({ message: '社群名称不能为空' });
    }

    try {
        // 1. 获取 community_id
        const communityId = await getCommunityId(area);

        // 2. 查询近一周增长最快的用户
        const influenceQuery = `
            SELECT 
                user_id,
                MAX(CASE WHEN record_date = CURDATE() - INTERVAL 7 DAY THEN influence_score ELSE 0 END) AS week_ago_score,
                MAX(CASE WHEN record_date = CURDATE() THEN influence_score ELSE 0 END) AS today_score
            FROM UserCommunityInfluence
            WHERE community_id = ?
            GROUP BY user_id
            ORDER BY (today_score - week_ago_score) DESC
            LIMIT 10
        `;
        const [influenceResults] = await pool.execute(influenceQuery, [communityId]);

        if (influenceResults.length === 0) {
            return res.status(200).json({ code: 200, message: 'success', data: { user_influence_increase_most: [] } });
        }

        // 3. 提取用户 ID 列表
        const userIds = influenceResults.map(user => user.user_id);

        // 4. 查询用户的等级信息
        const promotionResults = await getUserLevels(communityId, userIds);

        // 构造用户 ID 到等级的映射
        const userLevelMap = promotionResults.reduce((map, record) => {
            map[record.user_id] = record.current_level;
            return map;
        }, {});

        // 5. 查询一周内的详细影响力数据
        const detailedInfluenceQuery = `
            SELECT user_id, record_date, influence_score
            FROM UserCommunityInfluence
            WHERE community_id = ?
            AND user_id IN (${userIds.map(() => '?').join(',')})
            AND record_date BETWEEN DATE_SUB(CURDATE(), INTERVAL 7 DAY) AND CURDATE()
        `;
        const [detailedInfluenceResults] = await pool.execute(detailedInfluenceQuery, [communityId, ...userIds]);

        // 初始化用户的影响力数组，包含 7 天的影响力，默认为 0
        const userInfluenceMap = userIds.reduce((map, userId) => {
            map[userId] = Array(7).fill(0); // 初始化数组长度为 7
            return map;
        }, {});

        // 填充每个用户的详细影响力数据
        detailedInfluenceResults.forEach(record => {
            const recordDate = new Date(record.record_date); // 将记录的日期转为 JS 日期对象
            const currentDate = new Date(); // 获取当前日期
            const daysAgo = Math.floor((currentDate - recordDate) / (1000 * 60 * 60 * 24)); // 计算相差的天数

            if (daysAgo >= 0 && daysAgo < 7) { // 确保记录在过去 7 天之内
                userInfluenceMap[record.user_id][6 - daysAgo] = record.influence_score; // 按天数填入对应的位置
            }
        });

        // 合并数据，构建返回结果
        const userInfluenceArray = influenceResults.map(user => ({
            id: user.user_id,
            level: userLevelMap[user.user_id] || 0, // 默认等级为 0
            recent_influence: userInfluenceMap[user.user_id], // 最近 7 天的影响力数据
        }));

        // 6. 返回数据
        res.status(200).json({
            code: 200,
            message: 'success',
            data: {
                user_influence_increase_most: userInfluenceArray,
            },
        });
    } catch (error) {
        console.error('查询失败：', error.message || error);
        res.status(500).json({ message: '服务器错误，无法查询用户影响力增长' });
    }
});

// POST 请求：获取社群影响力一周下降最快的前 10 用户
router.post('/index/decrease', async (req, res) => {
    const { area } = req.body;

    if (!area) {
        return res.status(400).json({ message: '社群名称不能为空' });
    }

    try {
        // 1. 获取 community_id
        const communityId = await getCommunityId(area);

        // 2. 查询近一周增长最快的用户
        const influenceQuery = `
            SELECT 
                user_id,
                MAX(CASE WHEN record_date = CURDATE() - INTERVAL 7 DAY THEN influence_score ELSE 0 END) AS week_ago_score,
                MAX(CASE WHEN record_date = CURDATE() THEN influence_score ELSE 0 END) AS today_score
            FROM UserCommunityInfluence
            WHERE community_id = ?
            GROUP BY user_id
            ORDER BY (today_score - week_ago_score)
            LIMIT 10
        `;
        const [influenceResults] = await pool.execute(influenceQuery, [communityId]);

        if (influenceResults.length === 0) {
            return res.status(200).json({ code: 200, message: 'success', data: { user_influence_increase_most: [] } });
        }

        // 3. 提取用户 ID 列表
        const userIds = influenceResults.map(user => user.user_id);

        // 4. 查询用户的等级信息
        const promotionResults = await getUserLevels(communityId, userIds);

        // 构造用户 ID 到等级的映射
        const userLevelMap = promotionResults.reduce((map, record) => {
            map[record.user_id] = record.current_level;
            return map;
        }, {});

        // 5. 查询一周内的详细影响力数据
        const detailedInfluenceQuery = `
            SELECT user_id, record_date, influence_score
            FROM UserCommunityInfluence
            WHERE community_id = ?
            AND user_id IN (${userIds.map(() => '?').join(',')})
            AND record_date BETWEEN DATE_SUB(CURDATE(), INTERVAL 7 DAY) AND CURDATE()
        `;
        const [detailedInfluenceResults] = await pool.execute(detailedInfluenceQuery, [communityId, ...userIds]);

        // 初始化用户的影响力数组，包含 7 天的影响力，默认为 0
        const userInfluenceMap = userIds.reduce((map, userId) => {
            map[userId] = Array(7).fill(0); // 初始化数组长度为 7
            return map;
        }, {});

        // 填充每个用户的详细影响力数据
        detailedInfluenceResults.forEach(record => {
            const recordDate = new Date(record.record_date); // 将记录的日期转为 JS 日期对象
            const currentDate = new Date(); // 获取当前日期
            const daysAgo = Math.floor((currentDate - recordDate) / (1000 * 60 * 60 * 24)); // 计算相差的天数

            if (daysAgo >= 0 && daysAgo < 7) { // 确保记录在过去 7 天之内
                userInfluenceMap[record.user_id][6 - daysAgo] = record.influence_score; // 按天数填入对应的位置
            }
        });

        // 合并数据，构建返回结果
        const userInfluenceArray = influenceResults.map(user => ({
            id: user.user_id,
            level: userLevelMap[user.user_id] || 0, // 默认等级为 0
            recent_influence: userInfluenceMap[user.user_id], // 最近 7 天的影响力数据
        }));

        // 6. 返回数据
        res.status(200).json({
            code: 200,
            message: 'success',
            data: {
                user_influence_decrease_most: userInfluenceArray,
            },
        });
    } catch (error) {
        console.error('查询失败：', error.message || error);
        res.status(500).json({ message: '服务器错误，无法查询用户影响力增长' });
    }
});


module.exports = router;