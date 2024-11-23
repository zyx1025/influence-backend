const express = require('express');
const pool = require("../config/db")
const router = express.Router();

router.post('/level', async (req, res) => {
    const { area, user_id } = req.body;

    // 校验输入参数
    if (!area || user_id === undefined) {
        return res.status(400).json({ error: 'area and user_id are required' });
    }

    try {
        // 查询 Community 表获取 community_id
        const [communityResult] = await pool.query(
            'SELECT community_id FROM Community WHERE name = ?',
            [area]
        );

        if (communityResult.length === 0) {
            return res.status(404).json({ error: 'Community not found' });
        }

        const communityId = communityResult[0].community_id;

        // 查询 UserPromotionRecord 表获取用户信息（模糊匹配 user_id）
        const [userRecords] = await pool.query(`
            SELECT user_id AS id, current_level AS level, active_days
            FROM UserPromotionRecord
            WHERE community_id = ? AND user_id LIKE ?
        `, [communityId, `%${user_id}%`]);

        // 返回结果
        if (userRecords.length === 0) {
            return res.status(404).json({ error: 'No matching users found' });
        }

        res.status(200).json({  code: 200, message:"success", data:{users_level: userRecords }});
    } catch (error) {
        console.error('Error fetching user levels:', error);
        res.status(500).json({ error: '服务器出现故障' });
    }
});

module.exports = router;