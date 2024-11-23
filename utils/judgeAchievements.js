const pool = require("../config/db")

//与用户当天数据有关的成就判定
async function judgeAchievements(communityId, user){
    await judgeAch2(communityId, user);
    await judgeAch3(communityId, user);
}

//与用户在社群影响力排名的成就判定
async function judgeInfluenceAchievements(communityId){
    await judgeAch1(communityId);
}

// 判定成就“备受瞩目”
async function judgeAch1(communityId) {
    try {
        // 查询某社群按影响力降序排列的用户数据
        const query = `
            SELECT user_id 
            FROM UserCommunityInfluence 
            WHERE community_id = ? AND record_date = CURDATE() 
            ORDER BY influence_score DESC
            LIMIT 1;
        `;
        const [rows] = await pool.execute(query, [communityId]);

        if (rows.length > 0) {
            // 用户是影响力最高者，更新 UserAchievementRecord
            let userid = rows[0].user_id;

            const updateQuery = `
                UPDATE UserAchievementRecord
                SET achieved = TRUE, achievement_date = NOW()
                WHERE user_id = ? AND community_id = ? AND achievement_id = 1;
            `;
            await pool.execute(updateQuery, [userid, communityId]);
            console.log(`成就“备受瞩目”已更新，用户ID: ${userid}`);
        }
    } catch (error) {
        console.error(`Error in judgeAch1: ${error.message}`);
    }
}

// 判定成就“乐于交流”
async function judgeAch2(communityId, user) {
    try {
        let { userid, comments } = user;
        if (comments > 10) {
            // 用户评论数大于10，更新 UserAchievementRecord
            const updateQuery = `
                UPDATE UserAchievementRecord
                SET achieved = TRUE, achievement_date = NOW()
                WHERE user_id = ? AND community_id = ? AND achievement_id = 2;
            `;
            await pool.execute(updateQuery, [userid, communityId]);
            console.log(`成就“乐于交流”已更新，用户ID: ${userid}`);
        }
    } catch (error) {
        console.error(`Error in judgeAch2: ${error.message}`);
    }
}

// 判定成就“有口皆碑”
async function judgeAch3(communityId, user) {
    try {
        let { userid, likes } = user;
        if (likes > 1000) {
            // 用户单日点赞数大于1000，更新 UserAchievementRecord
            const updateQuery = `
                UPDATE UserAchievementRecord
                SET achieved = TRUE, achievement_date = NOW()
                WHERE user_id = ? AND community_id = ? AND achievement_id = 3;
            `;
            await pool.execute(updateQuery, [userid, communityId]);
            console.log(`成就“有口皆碑”已更新，用户ID: ${userid}`);
        }
    } catch (error) {
        console.error(`Error in judgeAch3: ${error.message}`);
    }
}


module.exports = {judgeAchievements,judgeInfluenceAchievements};