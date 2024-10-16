import puppeteer from "../../../lib/puppeteer/puppeteer.js";
import { REDIS_YUNZAI_DEER_PIPE_FRIENDS } from "../constants/core.js";
import FriendsModel from "../model/friends.js";
import { isNumeric } from "../utils/common.js";
import { redisExistAndGetKey, redisSetKey } from "../utils/redis-util.js";

export class Friends extends plugin {
    constructor() {
        super({
            name: "帮🦌",
            dsc: "添加信任🦌友友，可以帮你🦌🦌",
            event: "message",
            priority: 5000,
            rule: [
                {
                    reg: "^添加(🦌|鹿)友(.*)",
                    fnc: "addDeerFriend",
                },
                {
                    reg: "^绝交(🦌|鹿)友(.*)",
                    fnc: "delDeerFriend",
                },
                {
                    reg: "^我的(🦌|鹿)友$",
                    fnc: "myDeerFriend",
                }
            ]
        })
    }

    /**
     * 获取群内的昵称
     * @param e
     * @param user_id
     * @returns {Promise<*>}
     */
    async getGroupUserInfo(e) {
        const curGroup = e.group || Bot?.pickGroup(e.group_id);
        return curGroup?.getMemberMap();
    }

    /**
     * 获取群信息
     * @param whiteList
     * @param user_id
     * @param membersMap
     * @returns {*}
     */
    generateDeerData(whiteList, user_id, membersMap) {
        return whiteList[user_id].filter(item => {
            const groupInfo = membersMap.get(parseInt(item));
            return groupInfo !== undefined;
        }).map(item => {
            const groupInfo = membersMap.get(parseInt(item));
            return {
                user_id: item,
                nickname: groupInfo?.card || groupInfo?.nickname
            }
        });
    }

    /**
     * 从群信息中提取某个用户的昵称
     * @param membersMap
     * @param deerTrustUserId
     * @returns {*}
     */
    extractDeerNickname(membersMap, deerTrustUserId) {
        const trustDeerInfo = membersMap.get(parseInt(deerTrustUserId));
        return trustDeerInfo?.nickname || trustDeerInfo?.card || deerTrustUserId;
    }


    async addDeerFriend(e) {
        // 获取用户
        const user = e.sender;
        const { user_id, nickname, card } = user;
        let deerTrustUserId = null;
        // 获取🦌友
        if (e.at) {
            // 通过 at 添加
            deerTrustUserId = e.at;
        } else {
            deerTrustUserId = e?.reply_id !== undefined ?
                (await e.getReply()).user_id :
                e.msg.replace(/添加(🦌|鹿)友/g, "").trim();
        }
        // 判断是否存在
        if (!deerTrustUserId || !isNumeric(deerTrustUserId)) {
            e.reply("无法获取到🦌友信息，或者这是一个无效的🦌信息，请重试", true);
            return;
        }
        let whiteList = await redisExistAndGetKey(REDIS_YUNZAI_DEER_PIPE_FRIENDS) || {};
        // 第一次初始化
        if (whiteList[user_id] === undefined) {
            whiteList[user_id] = [];
        }
        // 重复检测
        if (whiteList[user_id].includes(deerTrustUserId)) {
            e.reply("🦌友已存在，无须添加!");
            return;
        }
        whiteList[user_id].push(deerTrustUserId);
        // 放置到Redis里
        await redisSetKey(REDIS_YUNZAI_DEER_PIPE_FRIENDS, whiteList);
        // 获取🦌友信息
        const membersMap = await this.getGroupUserInfo(e);
        // 生成我的🦌友图片
        const deerData = this.generateDeerData(whiteList, user_id, membersMap);
        if (deerData.length === 0) {
            e.reply("暂时没有🦌友！", true);
            return;
        }
        const data = await new FriendsModel(e).getData(deerData, nickname);
        let img = await puppeteer.screenshot("friends", data);
        // 获取🦌友信息
        const trustDeer = this.extractDeerNickname(membersMap, deerTrustUserId);
        e.reply([`${ card || nickname }成功交到🦌友：${ trustDeer }`, img], true);
    }

    async delDeerFriend(e) {
        // 获取用户
        const user = e.sender;
        const { user_id, nickname, card } = user;
        let deerTrustUserId = null;
        // 获取🦌友
        if (e.at) {
            // 通过 at 添加
            deerTrustUserId = e.at;
        } else {
            deerTrustUserId = e?.reply_id !== undefined ?
                (await e.getReply()).user_id :
                e.msg.replace(/绝交(🦌|鹿)友/g, "").trim();
        }
        if (!deerTrustUserId || !isNumeric(deerTrustUserId)) {
            e.reply("无法获取到🦌友信息，或者这是一个无效的🦌信息，请重试", true);
            return;
        }
        let whiteList = await redisExistAndGetKey(REDIS_YUNZAI_DEER_PIPE_FRIENDS) || {};
        // 第一次初始化
        if (whiteList[user_id] === undefined) {
            whiteList[user_id] = [];
        }
        // 重复检测
        if (!whiteList[user_id].includes(deerTrustUserId)) {
            e.reply("🦌友不存在，无须绝交!");
            return;
        }
        // 删除🦌友
        whiteList[user_id] = whiteList[user_id].filter(item => item !== deerTrustUserId);
        // 放置到Redis里
        await redisSetKey(REDIS_YUNZAI_DEER_PIPE_FRIENDS, whiteList);
        // 获取🦌友信息
        const membersMap = await this.getGroupUserInfo(e);
        // 生成我的🦌友图片
        const deerData = this.generateDeerData(whiteList, user_id, membersMap);
        if (deerData.length === 0) {
            e.reply("暂时没有🦌友！", true);
            return;
        }
        const data = await new FriendsModel(e).getData(deerData, nickname);
        let img = await puppeteer.screenshot("friends", data);
        // 获取🦌友信息
        const trustDeer = this.extractDeerNickname(membersMap, deerTrustUserId);
        e.reply([`${ card || nickname }成功绝交🦌友：${ trustDeer }`, img], true);
    }

    async myDeerFriend(e) {
        // 获取用户
        const user = e.sender;
        const { user_id, nickname, card } = user;
        // 获取🦌友
        let whiteList = await redisExistAndGetKey(REDIS_YUNZAI_DEER_PIPE_FRIENDS) || {};
        if (whiteList[user_id] === undefined || whiteList[user_id].length === 0) {
            e.reply("你还没有🦌友呢！", true);
            return;
        }
        const curGroup = e.group || Bot?.pickGroup(e.group_id);
        const membersMap = await curGroup?.getMemberMap();
        const deerData = this.generateDeerData(whiteList, user_id, membersMap);
        if (deerData.length === 0) {
            e.reply("暂时没有🦌友！", true);
            return;
        }
        const data = await new FriendsModel(e).getData(deerData, card || nickname);
        let img = await puppeteer.screenshot("friends", data);
        e.reply(img);
    }
}
