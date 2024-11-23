//影响力计算，具体来说计算当日的增值
const {alpha1,alpha2,alpha3,alpha4,alpha5} = require('../config/influenceParams')

//衰减因子计算
const calculateDecayFactor = (inactivityDays) => {
    return 1 / (1 + 0.01 * Math.pow(inactivityDays, 1.5));
};

function calcInfluence(post, read, likes, tread, comments, inactivityDays) {
    return (
        (alpha1 * post) +
        (alpha2 * read) +
        (alpha3 * likes) -
        (alpha4 * tread) +
        (alpha5 * comments)
    ) * calculateDecayFactor(inactivityDays);
}

module.exports = calcInfluence;