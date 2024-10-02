import { REDIS_YUNZAI_DEER_PIPE } from "../constants/core.js";
import { generateImage } from "../utils/core.js";
import { redisExistAndGetKey, redisExistKey, redisSetKey } from "../utils/redis-util.js";

export class DeerPipe extends plugin {
    constructor() {
        super({
            name: "🦌管",
            dsc: "一个🦌管签到插件，发送🦌以进行签到",
            event: "message",
            priority: 5000,
            rule: [
                {
                    reg: "^(🦌|鹿)$",
                    fnc: "lu",
                }
            ]
        })
    }

    /**
     * 签到
     * @param user_id 用户ID，QQ号一般是
     * @param day    当天日期
     * @returns {Promise<Object>}
     */
    async sign(user_id, day) {
        const userId = parseInt(user_id);
        const signDay = parseInt(day);

        // 获取当前日期的月份
        const currentMonth = new Date().getMonth() + 1; // getMonth() 返回的月份从0开始，所以要加1

        // 获取当前的deerData
        let deerData = await redisExistAndGetKey(REDIS_YUNZAI_DEER_PIPE) || {};

        // 如果用户有过签到数据，检查月份是否一致
        if (deerData[userId] && deerData[userId].lastSignMonth !== currentMonth) {
            // 如果月份不一致，清空之前的数据并初始化
            deerData[userId] = { lastSignMonth: currentMonth }; // 保留上次签到的月份
        }

        // 如果没有签到数据，则初始化
        if (!deerData[userId]) {
            deerData[userId] = { lastSignMonth: currentMonth }; // 初始化用户签到数据并记录月份
        }

        // 检查签到天数
        const dayKey = String(signDay);
        if (!deerData[userId][dayKey]) {
            deerData[userId][dayKey] = 1; // 如果没有签到记录，则设置为1
        } else {
            deerData[userId][dayKey] += 1; // 如果有签到记录，则加1
        }

        // 更新 Redis 中的数据
        await redisSetKey(REDIS_YUNZAI_DEER_PIPE, deerData);

        // 返回签到数据
        return deerData;
    }

    async lu(e) {
        // 获取用户
        const user = e.sender;
        const { user_id, nickname } = user;
        // 获取当前日期
        const date = new Date();
        // 获取当前是几号
        const day = date.getDate();
        const signData = await this.sign(user_id, day);
        const raw = await generateImage(date, nickname, signData[user_id]);
        await e.reply(segment.image(raw));
    }
}
