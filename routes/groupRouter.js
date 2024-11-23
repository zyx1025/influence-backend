const express = require('express');
const pool = require("../config/db")
const router = express.Router();

//模糊匹配社群
router.post('/community', async (req, res) => {
    const { area } = req.body;

    try {
        // 查询符合条件的社群
        const query = `
          SELECT community_id AS id, name, user_count
          FROM community
          WHERE name LIKE ?
        `;
        const [results] = await pool.execute(query, [`%${area}%`]);

        // 返回查询结果
        res.status(200).json({ code: 200, message: '查询社群成功', data:{communities: results}  });

    } catch (error) {
        console.error('查询社群失败：', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

module.exports = router;