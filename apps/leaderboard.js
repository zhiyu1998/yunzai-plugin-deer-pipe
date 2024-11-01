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
                    reg: "^(🦌|鹿|戒🦌|戒鹿)榜$",
                    fnc: "leaderboard",
                }
            ]
        })
    }

    getRankData(deerData, members, order = "desc") {
        // 获取当月
        const curMonth = new Date().getMonth() + 1;
        // 过滤出本群有的成员 && 本月有签到
        const rankData = Object.keys(deerData)
            .filter(deer => members.includes(parseInt(deer)) && deerData[deer].lastSignMonth === curMonth)
            .map(deer => {
                const sum = Object.keys(deerData[deer])
                    .filter(subKey => !isNaN(subKey))
                    .reduce((acc, subKey) => acc + deerData[deer][subKey], 0);
                return { id: deer, sum: sum };
            });

        // 根据order参数排序
        if (order === "asc") {
            rankData.sort((a, b) => a.sum - b.sum);
        } else {
            rankData.sort((a, b) => b.sum - a.sum);
        }
        return rankData;
    }

    async leaderboard(e) {
        const curGroup = e.group || Bot?.pickGroup(e.group_id);
        const membersMap = await curGroup?.getMemberMap();
        // 获取群成员和Redis数据并发执行
        let [members, deerData] = await Promise.all([
            membersMap,
            redisExistAndGetKey(REDIS_YUNZAI_DEER_PIPE)
        ]);

        if (deerData == null) {
            return;
        }

        // 转换成数组
        members = Array.from(members.keys());

        const isWithdrawal = e.msg.includes("戒");
        // 计算rankData
        const rankData = isWithdrawal ? this.getRankData(deerData, members, "asc") : this.getRankData(deerData, members);

        // 获取成员信息并更新rankData
        const rankDataWithMembers = await Promise.all(rankData.map(async (item, index) => {
            const groupInfo = membersMap.get(parseInt(item.id));
            return {
                ...item,
                card: groupInfo.card || groupInfo.nickname,
                order: index + 1
            };
        }));

        // 传递给html
        const data = await new Leaderboard(e).getData(rankDataWithMembers, isWithdrawal ? "戒鹿" : "鹿管");
        let img = await puppeteer.screenshot("leaderboard", data);
        e.reply(img);
    }
}
