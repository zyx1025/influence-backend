const pool = require("../config/db")
const achievementToken = require("../config/achievementToken")

function authenticateToken(token){
    const currentDate = new Date();
    const formattedDate = `${currentDate.getFullYear()}${(currentDate.getMonth() + 1)
        .toString()
        .padStart(2, '0')}${currentDate.getDate().toString().padStart(2, '0')}`;

    const expectedToken = `${achievementToken.token}${formattedDate}`;
    console.log(expectedToken);

    return token === expectedToken;
}

module.exports = authenticateToken;