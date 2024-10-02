import { createCanvas, loadImage, registerFont } from 'canvas';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { CHECK_IMG, DEERPIPE_IMG, MISANS_FONT, PLUGIN_PATH } from '../constants/core.js';

registerFont(MISANS_FONT, { family: 'MiSans' });

function getMonthCalendar(now) {
    const year = now.getFullYear();
    const month = now.getMonth(); // 当前月，0表示1月，11表示12月

    // 获取当前月的天数
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // 获取当前月的第一天是星期几，并调整为周一为一周的开始
    let firstDayOfMonth = new Date(year, month, 1).getDay();
    firstDayOfMonth = (firstDayOfMonth === 0) ? 6 : firstDayOfMonth - 1; // 调整为以周一为起始日

    // 创建一个二维数组，表示6行7列的日历（最多6周）
    const cal = [];
    let week = new Array(7).fill(null); // 初始化一周的天数为空

    // 填充空白日期到第一天
    let day = 1;
    for (let i = firstDayOfMonth; i < 7; i++) {
        week[i] = day++;
    }

    // 添加第一周到日历
    cal.push(week);

    // 填充剩余的日期
    while (day <= daysInMonth) {
        week = new Array(7).fill(null); // 初始化新的一周为空
        for (let i = 0; i < 7 && day <= daysInMonth; i++) {
            week[i] = day++;
        }
        cal.push(week);
    }

    return cal;
}


/**
 * 生成签到图片
 * 源代码来自：https://github.com/SamuNatsu/nonebot-plugin-deer-pipe/blob/main/src/nonebot_plugin_deer_pipe/image.py
 * @param now
 * @param name
 * @param deer
 * @returns {Promise<*>}
 */
export async function generateImage(now, name, deer) {
    const cal = getMonthCalendar(now);

    const IMG_W = 700;
    const IMG_H = 100 * (cal.length + 1); // 根据周数动态调整图片高度
    const BOX_W = 100;
    const BOX_H = 100;

    const canvas = createCanvas(IMG_W, IMG_H);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, IMG_W, IMG_H);

    // 异步加载图像
    const deerpipeImage = await loadImage(DEERPIPE_IMG);
    const checkImage = await loadImage(CHECK_IMG);

    for (let weekIdx = 0; weekIdx < cal.length; weekIdx++) {
        for (let dayIdx = 0; dayIdx < cal[weekIdx].length; dayIdx++) {
            const day = cal[weekIdx][dayIdx];
            const x0 = dayIdx * BOX_W;
            const y0 = (weekIdx + 1) * BOX_H;
            if (day !== null) { // 只绘制不为 null 的日期
                // 绘制日历格子和图像
                ctx.drawImage(deerpipeImage, x0, y0);
                ctx.fillStyle = 'black';
                ctx.font = '30px MiSans';
                ctx.fillText(day.toString(), x0 + 5, y0 + BOX_H - 35);

                // 检查该天是否签到
                if (deer[day]) {
                    ctx.drawImage(checkImage, x0, y0);
                    if (deer[day] > 1) {
                        const txt = deer[day] > 99 ? 'x99+' : `x${ deer[day] }`;
                        const tlen = ctx.measureText(txt).width;
                        ctx.font = 'bold 30px MiSans'; // 加粗字体
                        ctx.fillStyle = 'red';
                        ctx.fillText(txt, x0 + BOX_W - tlen - 5, y0 + BOX_H - 20);
                    }
                }
            }
        }
    }


    // 设置签名的字体大小并显示
    ctx.font = '30px MiSans';
    ctx.fillText(`${ now.getFullYear() }-${ String(now.getMonth() + 1).padStart(2, '0') } 签到`, 5, 35);

    ctx.font = '30px MiSans'; // 名字的字体可以更大一些
    ctx.fillText(name, 5, 85);

    const imgPath = path.join(PLUGIN_PATH, `${ crypto.randomBytes(16).toString('hex') }.png`);
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(imgPath, buffer);

    const raw = fs.readFileSync(imgPath);
    fs.unlinkSync(imgPath);

    return raw;
}


// 调用示例
// generateImage(new Date(), "测试", {
//     1: 2,
//     5: 1,
//     12: 99
// }).then(buffer => {
//     console.log("Image generated successfully");
//     // 可以写入文件或进行其他处理
// });
