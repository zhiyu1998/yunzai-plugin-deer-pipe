import puppeteer from "../../../lib/puppeteer/puppeteer.js";
import { REDIS_YUNZAI_DEER_PIPE } from "../constants/core.js";
import Leaderboard from "../model/leaderboard.js";
import { redisExistAndGetKey } from "../utils/redis-util.js";

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

    getRankData(deerData, members) {
        return Object.keys(deerData)
            .filter(deer => members.includes(parseInt(deer)))
            .map(deer => {
                const sum = Object.keys(deerData[deer])
                    .filter(subKey => !isNaN(subKey))
                    .reduce((acc, subKey) => acc + deerData[deer][subKey], 0);
                return { id: deer, sum: sum };
            })
            .sort((a, b) => b.sum - a.sum);
    }

    async leaderboard(e) {
        // 获取群成员和Redis数据并发执行
        const [members, deerData] = await Promise.all([
            Bot.pickGroup(e.group_id).getMemberList() || Array.from(e.bot.gml.get(e.group_id).keys()),
            redisExistAndGetKey(REDIS_YUNZAI_DEER_PIPE)
        ]);

        if (deerData == null) {
            return;
        }

        // 计算rankData
        const rankData = this.getRankData(deerData, members);

        // 获取成员信息并更新rankData
        const membersMap = await Bot.pickGroup(e.group_id).getMemberMap();
        const rankDataWithMembers = await Promise.all(rankData.map(async (item, index) => {
            const groupInfo = membersMap.get(parseInt(item.id));
            return {
                ...item,
                card: groupInfo.card || groupInfo.nickname,
                order: index + 1
            };
        }));

        // 传递给html
        const data = await new Leaderboard(e).getData(rankDataWithMembers);
        let img = await puppeteer.screenshot("leaderboard", data);
        e.reply(img);
    }
}
