/*
    影响力计算模块
*/
const express = require('express');
const pool = require("../config/db")
const router = express.Router();
const axios = require('axios');
const groupServiceConfig = require('../config/groupServer')
const calcInfluence = require("../utils/calcInfluence");
const {judgeAchievements,judgeInfluenceAchievements} = require('../utils/judgeAchievements')

// 更新影响力
router.post('/influence', async (req, res) => {
    const { area } = req.body;

    if (!area) {
        return res.status(400).json({ error: 'area is required' });
    }

    const { ip, port } = groupServiceConfig;
    try {
        const response = await axios.post(`http://${ip}:${port}/api/v1/userData`, { area });
        const { users } = response.data.data;

        // 社群表更新
        const userCount = users.length;
        const activityThreshold = Math.ceil(userCount * 0.1);
        let [communityResult] = await pool.query('SELECT community_id, user_count FROM Community WHERE name = ?', [area]);
        let communityId; // 社群对应id，后续操作要用到
        if (communityResult.length > 0) {
            communityId = communityResult[0].community_id;
            await pool.query(
                'UPDATE Community SET user_count = ?, activity_threshold = ? WHERE community_id = ?',
                [userCount, activityThreshold, communityId]
            );
        } else {
            const [insertResult] = await pool.query(
                'INSERT INTO Community (name, user_count, activity_threshold) VALUES (?, ?, ?)',
                [area, userCount, activityThreshold]
            );
            communityId = insertResult.insertId;
        }

        // User 表更新
        const userIds = users.map(user => user.userid);
        const insertUserPromises = userIds.map(async (userId) => {
            const userExists = await pool.query('SELECT user_id FROM User WHERE user_id = ?', [userId]);
            if (userExists[0].length === 0) {
                await pool.query('INSERT INTO User (user_id) VALUES (?)', [userId]);
            }

            const userExistInGroups = await pool.query(
                'SELECT user_id FROM UserPromotionRecord WHERE user_id = ? AND community_id = ?',
                [userId, communityId]
            );
            if (userExistInGroups[0].length === 0) {

                // 晋级表增添新用户
                await pool.query(`
                    INSERT INTO UserPromotionRecord (user_id, community_id, current_level, active_days, last_updated) 
                    VALUES (?, ?, 1, 0, NOW())
                `, [userId, communityId]);

                // 成就表增添新用户
                for (let achievement_id = 1; achievement_id <= 3; achievement_id++) {
                    await pool.query(`
                        INSERT INTO UserAchievementRecord (user_id, community_id, achievement_id, achieved, achievement_date) 
                        VALUES (?, ?, ?, ?, NOW())
                    `, [userId, communityId, achievement_id, false]);
                }
            }
        });
        await Promise.all(insertUserPromises);

        // 计算影响力并更新
        let isUpdated = false;
        const updateInfPromises = users.map(async (user) => {
            const { userid, post, read, likes, tread, comments } = user;

            // 检查当天记录是否存在
            const [existingRecord] = await pool.query(`
                SELECT influence_score, inactivity_days 
                FROM UserCommunityInfluence 
                WHERE user_id = ? AND community_id = ? AND record_date = CURDATE()
            `, [userid, communityId]);

            if (existingRecord.length > 0) {
                isUpdated = true; // 标志已存在记录
                return;
            }

            // 计算新的影响力得分
            const lastRecordQuery = `
                SELECT influence_score, inactivity_days 
                FROM UserCommunityInfluence 
                WHERE user_id = ? AND community_id = ? 
                ORDER BY record_date DESC 
                LIMIT 1
            `;
            const [lastRecordResult] = await pool.query(lastRecordQuery, [userid, communityId]);
            const lastRecord = lastRecordResult[0];

            let inactivityDays = lastRecord ? lastRecord.inactivity_days : 0;
            if (post === 0) {
                inactivityDays += 1;
            } else {
                inactivityDays = 0;
            }

            const influenceIncrement = calcInfluence(post, read, likes, tread, comments, inactivityDays);
            const newInfluenceScore = (lastRecord ? lastRecord.influence_score : 0) + influenceIncrement;

            // 判断晋级条件
            if (influenceIncrement >= activityThreshold) {
                const [promotionRecord] = await pool.query(`
                    SELECT current_level, active_days 
                    FROM UserPromotionRecord 
                    WHERE user_id = ? AND community_id = ?
                `, [userid, communityId]);

                if (promotionRecord.length > 0) {
                    let { current_level, active_days } = promotionRecord[0];
                    active_days += 1;

                    await pool.query(`
                        UPDATE UserPromotionRecord 
                        SET active_days = ?, last_updated = NOW() 
                        WHERE user_id = ? AND community_id = ?
                    `, [active_days, userid, communityId]);

                    if (current_level < 5) {
                        const [levelSetting] = await pool.query(`
                            SELECT days_required 
                            FROM LevelSetting 
                            WHERE level_id = ?
                        `, [current_level + 1]);

                        if (levelSetting.length > 0 && active_days >= levelSetting[0].days_required) {
                            current_level += 1;
                            await pool.query(`
                                UPDATE UserPromotionRecord 
                                SET current_level = ?, last_updated = NOW() 
                                WHERE user_id = ? AND community_id = ?
                            `, [current_level, userid, communityId]);
                        }
                    }
                }
            }

            // 更新影响力表
            await pool.query(`
                INSERT INTO UserCommunityInfluence (user_id, community_id, record_date, influence_score, inactivity_days, updated_time) 
                VALUES (?, ?, CURDATE(), ROUND(?, 1), ?, NOW())`,
                [userid, communityId, newInfluenceScore, inactivityDays]
            );

            // 成就判定
            await judgeAchievements(communityId, user);
        });

        await Promise.all(updateInfPromises);

        // 当天社群用户影响力更新完毕，处理影响力相关的成就
        await judgeInfluenceAchievements(communityId);

        if (isUpdated) {
            return res.status(403).json({ message: '部分用户当天影响力已计算，无须重复更新' });
        }
        return res.status(200).json({ message: 'Influence calculation completed successfully' });

    } catch (error) {
        console.error('Error calling internal API:', error);
        return res.status(500).json({ error: '服务器出现故障' });
    }
});

module.exports = router;


module.exports = router;