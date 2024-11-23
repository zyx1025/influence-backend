//用于数据库查询的一些方法
const pool = require("../config/db")
const achievementToken = require("../config/achievementToken")

//根据area获取社群ID
async function getCommunityId(area) {
    const communityQuery = `
        SELECT community_id
        FROM community
        WHERE name LIKE ?
        LIMIT 1
      `;
    const [communityResults] = await pool.execute(communityQuery, [`%${area}%`]);
    if (communityResults.length === 0) {
        throw new Error('未找到符合条件的社群');
    }
    return communityResults[0].community_id;
}

//根据社群ID和该社群内多个用户ID获取所有用户的等级
async function getUserLevels(communityId, userIds) {
    if (userIds.length === 0) return [];
    const placeholders = userIds.map(() => '?').join(',');
    const promotionQuery = `
        SELECT user_id, current_level
        FROM UserPromotionRecord
        WHERE community_id = ?
        AND user_id IN (${placeholders})
      `;
    const [promotionResults] = await pool.execute(promotionQuery, [communityId, ...userIds]);
    return promotionResults;
}

async function getCommunityAchievements(communityId){
    try {
        // 查询某社群所有用户的成就信息
        const query = `
            SELECT user_id,  achievement_id, achieved, achievement_date
            FROM UserAchievementRecord 
            WHERE community_id = ?
        `;
        const [rows] = await pool.execute(query, [communityId]);
        return rows;
    } catch (error) {
        console.error(`Error in getAchievement: ${error.message}`);
    }
}


module.exports = { getUserLevels, getCommunityId, getCommunityAchievements };