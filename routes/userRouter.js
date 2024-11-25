/*
    用户管理模块
 */
const express = require('express');
const pool = require("../config/db")
const router = express.Router();
const jwt = require('jsonwebtoken');
const serverConfig = require("../config/server");
//登录
router.post('/login', async(req, res) => {
    const { id, password } = req.body;

    if (!id || !password) {
        return res.status(400).json({ code: 400, message: '用户名或密码不能为空' });
    }

    const query = 'SELECT * FROM SystemUser WHERE username = ? AND password = ?';
    try {
        const [results] = await pool.query(query, [id, password]);
        if (results.length > 0) {
            const token = jwt.sign({ id }, serverConfig.secretKey, { expiresIn: '1h' });
            return res.status(200).json({ code: 200, message: '登录成功', token });
        } else {
            return res.status(401).json({ code: 401, message: '用户名或密码错误' });
        }
    } catch (error) {
        console.error('数据库查询错误:', error);
        return res.status(500).json({ code: 500, message: '数据库查询错误' });
    }
});

//重置密码接口
// router.put('/reset', async (req, res) => {
//     const { id, password } = req.body;
//
//     const query = 'UPDATE SystemUser SET password = ? where username = ?';
//
//     try {
//         const [result] = await pool.query(query, [password, id]);
//         if (result.affectedRows > 0) {
//             return res.status(200).json({ code: 200, message: '修改密码成功' });
//         } else {
//             return res.status(401).json({ code: 401, message: '该用户名不存在' });
//         }
//     } catch (error) {
//         console.error('数据库查询错误:', error);
//         return res.status(500).json({ code: 500, message: '数据库查询错误' });
//     }
// });

router.put('/reset', async (req, res) => {
    const { password } = req.body;

    const query = 'UPDATE SystemUser SET password = ?';

    try {
        const [result] = await pool.query(query, [password]);
        if (result.affectedRows > 0) {
            return res.status(200).json({ code: 200, message: '修改密码成功' });
        } else {
            return res.status(401).json({ code: 401, message: '该用户名不存在' });
        }
    } catch (error) {
        console.error('数据库查询错误:', error);
        return res.status(500).json({ code: 500, message: '数据库查询错误' });
    }
});


module.exports = router;


