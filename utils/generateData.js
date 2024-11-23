const faker = require('faker');

const generateUserData = (area, communitySize) => {
    const users = [];
    const usedIds = new Set(); // 记录已生成的唯一ID
    const activeUsers = Math.max(communitySize * 0.1, 1);

    for (let i = 0; i < communitySize; i++) {
        let userid;

        // 确保生成唯一的ID
        do {
            userid = faker.datatype.number({ min: 1, max: communitySize * 3 });
        } while (usedIds.has(userid));
        usedIds.add(userid); // 记录生成的ID

        const postCount = faker.datatype.number({ min: 0, max: 10 });
        const readCount = faker.datatype.number({ min: postCount * 10, max: postCount * 100 });
        const likeCount = Math.floor(faker.datatype.number({ min: postCount * 1, max: postCount * 10 }));
        const treadCount = Math.floor(faker.datatype.number({ min: 0, max: postCount * 2 }));
        const commentCount = faker.datatype.number({ min: 0, max: readCount * 0.2 });

        users.push({
            userid, // 使用唯一ID
            post: postCount,
            read: readCount,
            likes: likeCount,
            tread: treadCount,
            comments: commentCount
        });
    }

    // 确保至少10%的活跃用户新发帖量超过 5 条
    users.slice(0, activeUsers).forEach(user => {
        user.post = faker.datatype.number({ min: 6, max: 20 });
        user.read = faker.datatype.number({ min: user.post * 10, max: user.post * 100 });
        user.likes = Math.floor(faker.datatype.number({ min: user.post * 1, max: user.post * 20 }));
        user.tread = Math.floor(faker.datatype.number({ min: 0, max: user.post * 2 }));
        user.comments = faker.datatype.number({ min: 0, max: user.read * 0.2 });
    });

    // 确保80%的用户点赞数和点踩数比例保持在10:1左右，20%用户有异常较高的点赞或点踩数
    users.forEach(user => {
        if (Math.random() < 0.8) {
            user.likes = Math.floor(user.tread * 10); // 10:1
        } else {
            user.likes = Math.floor(faker.datatype.number({ min: 0, max: user.tread * 50 })); // 异常值
        }
    });

    return users;
};

module.exports = { generateUserData };
