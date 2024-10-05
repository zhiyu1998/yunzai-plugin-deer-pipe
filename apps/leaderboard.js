import { REDIS_YUNZAI_DEER_PIPE } from "../constants/core.js";
import Leaderboard from "../model/leaderboard.js";
import { redisExistAndGetKey } from "../utils/redis-util.js";
import puppeteer from "../../../lib/puppeteer/puppeteer.js";

export class LeaderboardApp extends plugin {
    constructor() {
        super({
            name: "🦌管排行榜",
            dsc: "一个🦌管排行榜",
            event: "message",
            priority: 5000,
            rule: [
                {
                    reg: "^(🦌|鹿)榜$",
                    fnc: "leaderboard",
                }
            ]
        })
    }

    async leaderboard(e){
        // 获取群成员
        const members = await Bot.pickGroup(e.group_id).getMemberList() || Array.from(e.bot.gml.get(e.group_id).keys());

        // 获取数据
        const deerData = await redisExistAndGetKey(REDIS_YUNZAI_DEER_PIPE)
        if (deerData == null) {
            return;
        }
        // 创建一个数组来存储ID和累加和的键值对
        const rankData = [];
        for (const deer in deerData) {
            if (members.includes(parseInt(deer))) {
                let sum = 0;
                // 遍历每个内层对象的键值
                for (const subKey in deerData[deer]) {
                    // 判断是否为数值型的键
                    if (!isNaN(subKey)) {
                        sum += deerData[deer][subKey]; // 将数值型键的值累加
                    }
                }

                // 将ID和累加和存入数组
                rankData.push({ id: deer, sum: sum });
            }
        }
        // 按照sum值从高到低排序
        rankData.sort((a, b) => b.sum - a.sum);
        // 增加order字段，从1开始
        const membersMap = await Bot.pickGroup(e.group_id).getMemberMap();
        rankData.forEach((item, index) => {
            const groupInfo = membersMap.get(parseInt(item.id));
            item.card = groupInfo.card || groupInfo.nickname;
            item.order = index + 1; // 第几名
        });
        // 传递给html
        const data = await new Leaderboard(e).getData(rankData);
        let img = await puppeteer.screenshot("leaderboard", data);
        e.reply(img);
    }
}
