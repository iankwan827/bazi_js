/**
 * paipan_node_input.js - 数据输入与排盘执行脚本
 * 纯 Node.js 环境运行，演示如何调用计算逻辑并输出结果。
 */

const paipan = require('./paipan_node_core.js');

// =============================================
// 数据输入部分 (用户可以修改以下参数)
// =============================================

// 模式 1: 使用公历日期
const inputData = {
    year: 1990,
    month: 8,
    day: 27,
    hour: 12,
    minute: 0,
    gender: '男', // '男' 或 '女'
    isUnknownHour: false
};

// 模式 2: 手动输入八字 (反推模式)
// 只有在没有提供日期时才会执行
// manualGZ: [年干, 年支, 月干, 月支, 日干, 日支, 时干, 时支]
const manualGZ = ["甲子", "丙寅", "己巳", "甲午"]; // 示例

// =============================================
// 执行排盘计算
// =============================================

function run() {
    console.log('--- 八字排盘 (Node.js 版) ---\n');

    let result = null;

    if (inputData.year) {
        // 创建 JS Date 对象
        const dateObj = new Date(inputData.year, inputData.month - 1, inputData.day, inputData.hour, inputData.minute);
        console.log(`输入日期: ${inputData.year}-${inputData.month}-${inputData.day} ${inputData.hour}:${inputData.minute}`);
        console.log(`性别: ${inputData.gender}\n`);

        result = paipan.calculateBazi(dateObj, inputData.gender, null, inputData.isUnknownHour);
    } else if (manualGZ && manualGZ.length >= 4) {
        // 解析手动输入的[年柱, 月柱, 日柱, 时柱]到单字数组
        const gzArray = [];
        manualGZ.forEach(pair => {
            gzArray.push(pair[0], pair[1]);
        });
        
        console.log(`输入八字: ${manualGZ.join(' ')}`);
        console.log(`性别: ${inputData.gender}\n`);

        result = paipan.calculateBazi(null, inputData.gender, gzArray, inputData.isUnknownHour);
    }

    if (!result) {
        console.error('错误: 无法根据输入数据进行排盘。');
        return;
    }

    // =============================================
    // 输出结果 (用户可以根据需要提取数据)
    // =============================================

    console.log('--- 基本信息 ---');
    console.log(`公历: ${result.solarDate}`);
    console.log(`农历: ${result.lunarDate}`);
    console.log(`性别: ${result.gender}`);
    console.log(`身强身弱: ${result.bodyStrength.status} (得分: ${result.bodyStrength.score})`);
    console.log('');

    console.log('--- 四柱排盘 ---');
    const labels = ['年柱', '月柱', '日柱', '时柱'];
    result.pillars.forEach((p, i) => {
        console.log(`${labels[i]}: ${p.gan}${p.zhi} (${p.tenGod}) - 纳音: ${p.naYin}`);
        if (p.hidden && p.hidden.length > 0) {
            const hiddenStr = p.hidden.map(h => `${h.stem}(${h.god})`).join(', ');
            console.log(`      藏干: ${hiddenStr}`);
        }
        if (p.shenSha && p.shenSha.length > 0) {
            console.log(`      神煞: ${p.shenSha.join(', ')}`);
        }
    });

    console.log('\n--- 大运流程 ---');
    if (result.daYunList && result.daYunList.length > 0) {
        result.daYunList.forEach(dy => {
            console.log(`${dy.startAge}岁 (${dy.startYear}年): ${dy.gan}${dy.zhi} - ${dy.tenGod}`);
        });
    } else {
        console.log('未通过日期计算，无法生成精确大运列表。');
    }

    console.log('\n--- 核心逻辑处理完毕 ---');
}

// 自动执行
run();
