const express = require('express');
const pool = require("../config/db")
const router = express.Router();

router.get('/achievements', async (req, res) => {
    
    try {
        // 查询符合条件的社群
        const query = `
          SELECT *
          FROM Achievement
        `;
        const [results] = await pool.execute(query);

        // 返回查询结果
        res.status(200).json({ code: 200, message: '查询成就成功', data:{achievements: results}  });

    } catch (error) {
        console.error('查询成就失败：', error);
        res.status(500).json({ message: '服务器错误' });
    }
});

module.exports = router;