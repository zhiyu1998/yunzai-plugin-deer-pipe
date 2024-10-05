import Base from './base.js'

export default class Leaderboard extends Base {
    constructor (e) {
        super(e)
        this.model = 'leaderboard'
    }

    /** 生成版本信息图片 */
    async getData (rankData, deerTitle = "鹿管") {
        const curMonth = new Date().getMonth() + 1;
        return {
            ...this.screenData,
            saveId: 'leaderboard',
            rankData: rankData,
            deerTitle: deerTitle,
            curMonth: curMonth
        }
    }
}
