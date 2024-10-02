import { CHECK_IMG, DEERPIPE_IMG, MISANS_FONT, PLUGIN_PATH } from '../constants/core.js';
import { createCanvas, loadImage, registerFont } from 'canvas';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

registerFont(MISANS_FONT, { family: 'MiSans' });

/**
 * 生成签到图片
 * 源代码来自：https://github.com/SamuNatsu/nonebot-plugin-deer-pipe/blob/main/src/nonebot_plugin_deer_pipe/image.py
 * @param now
 * @param name
 * @param deer
 * @returns {Promise<*>}
 */
export async function generateImage(now, name, deer) {
    // 获取当前月份的日历，并去除所有为0的行（表示没有日期的那一行）
    let cal = Array.from({ length: 6 }, (_, i) => {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        monthStart.setDate(monthStart.getDate() + (i * 7));
        return Array.from({ length: 7 }, (_, j) => {
            const day = monthStart.getDate();
            const isCurrentMonth = monthStart.getMonth() === now.getMonth();
            monthStart.setDate(day + 1);
            return isCurrentMonth ? day : 0;
        });
    }).filter(week => week.some(day => day !== 0)); // 过滤掉全是 0 的周

    const IMG_W = 700;
    const IMG_H = 100 * (cal.length + 1); // 计算实际需要的高度，基于有效的周数
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
            if (day !== 0) {
                // 画出日历和图像
                ctx.drawImage(deerpipeImage, x0, y0);
                ctx.fillStyle = 'black';
                ctx.font = MISANS_FONT;
                ctx.fillText(day.toString(), x0 + 5, y0 + BOX_H - 35);

                if (deer[day]) {
                    ctx.drawImage(checkImage, x0, y0);
                    if (deer[day] > 1) {
                        const txt = deer[day] > 99 ? 'x99+' : `x${deer[day]}`;
                        const tlen = ctx.measureText(txt).width;
                        ctx.fillStyle = 'red';
                        ctx.font = '20px MiSans';
                        ctx.fillText(txt, x0 + BOX_W - tlen - 15, y0 + BOX_H - 20);
                    }
                }
            }
        }
    }

    // 设置签名的字体大小并显示
    ctx.font = `30px MiSans`;
    ctx.fillText(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')} 签到`, 5, 35);

    ctx.font = `40px MiSans`; // 名字的字体可以更大一些
    ctx.fillText(name, 5, 85);

    const imgPath = path.join(PLUGIN_PATH, `${crypto.randomBytes(16).toString('hex')}.png`);
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
