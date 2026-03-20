// test_bazi_classes.js - 测试八字类
// 使用 paipan_node_core.js 的 calculateBazi 验证 bazi_classes.js

// 加载排盘模块
const paipan = require('./paipan_node_core.js');
const { BaziContext, createBaziContext, Gan, Zhi, Shishen, Element } = require('./bazi_classes.js');

// 测试日期: 1990-8-27 12:0 男
const inputDate = new Date(1990, 7, 27, 12, 0, 0);
console.log('=== 测试日期:', inputDate.toISOString(), '===\n');

// 调用 paipan_node_core.js 的 calculateBazi
const paipanResult = paipan.calculateBazi(inputDate, '男', null, false);

if (!paipanResult) {
    console.error('排盘失败！');
    process.exit(1);
}

console.log('=== paipan_result 数据 ===');
console.log('公历:', paipanResult.solarDate);
console.log('农历:', paipanResult.lunarDate);
console.log('性别:', paipanResult.gender);
console.log('身强身弱:', paipanResult.bodyStrength);
console.log();

// 创建 BaziContext
const ctx = createBaziContext(paipanResult);

console.log('=== BaziContext 验证 ===');
console.log('日期:', ctx.dateStr);
console.log('农历:', ctx.lunarStr);
console.log('性别:', ctx.gender);
console.log('日主:', ctx.dayMaster.name, '-', ctx.dayMaster.wx, '-', ctx.dayMaster.yinyang);
console.log();

// 验证天干pillars
console.log('=== 四柱天干地支 ===');
for (let i = 0; i < 4; i++) {
    const pillar = ctx.getPillarAt(i);
    console.log(`第${i+1}柱: ${pillar.gan.name}${pillar.zhi.name}`);
}
console.log();

// 验证十神
console.log('=== 十神 ===');
ctx.shishenResults.forEach(r => {
    console.log(`${r.gan.name}: ${r.shishen.getName()}`);
});
console.log();

// 验证地支属性
console.log('=== 地支属性 ===');
ctx.getAllZhis().forEach(z => {
    console.log(`${z.name}支: 纳音=${z.naYin}, 空亡=${Array.isArray(z.kongWang) ? z.kongWang.join(',') : z.kongWang || '无'}, 神煞=${Array.isArray(z.shenSha) ? z.shenSha.join(',') : z.shenSha || '无'}`);
    console.log(`  藏干: ${z.hiddenGans.map(h => h.name).join(',')}`);
    console.log(`  本气: ${z.getMainStem().name}`);
    console.log(`  藏干十神: ${z.getAllHiddenGansWithShishen().map(h => `${h.gan}→${h.shishen}`).join(', ')}`);
});
console.log();

// 验证身强身弱
console.log('=== 身强身弱 ===');
console.log(JSON.stringify(ctx.bodyStrength, null, 2));
console.log();

// 验证相邻判断
console.log('=== 相邻判断测试 ===');
const gan0 = ctx.pillars[0];  // 年干
console.log(`年干${gan0.name}相邻位置:`, gan0.getAdjacentPositions());

const zhi1 = ctx.pillars[1];  // 年支
console.log(`年支${zhi1.name}相邻位置:`, zhi1.getAdjacentPositions());

console.log(`年干(0)与年支(1)相邻:`, gan0.isAdjacent(1));  // 应为 true
console.log(`年干(0)与月干(2)相邻:`, gan0.isAdjacent(2));  // 应为 true
console.log(`年干(0)与日干(4)相邻:`, gan0.isAdjacent(4)); // 应为 false
console.log();

// 验证 toJSON
console.log('=== toJSON 输出 ===');
console.log(JSON.stringify(ctx.toJSON(), null, 2));
console.log();

// === 大运/流年相邻判断测试 ===
console.log('=== 大运/流年相邻判断测试 ===');

// 创建大运柱（设置 isDaYun=1）
const daYunGan = ctx.createDaYunPillar('戊', 0, '天干');
const daYunZhi = ctx.createDaYunPillar('子', 1, '地支');

console.log('大运天干戊 (isDaYun=1) 相邻原局所有柱:');
for (let i = 0; i < 8; i++) {
    console.log(`  与位置${i}相邻:`, daYunGan.isAdjacent(i));
}

console.log('\n大运地支子 (isDaYun=1) 相邻原局所有柱:');
for (let i = 0; i < 8; i++) {
    console.log(`  与位置${i}相邻:`, daYunZhi.isAdjacent(i));
}

// 创建流年柱（设置 isLiuNian=1）
const liuNianGan = ctx.createLiuNianPillar('辛', 0, '天干');

console.log('\n流年天干辛 (isLiuNian=1) 相邻原局所有柱:');
for (let i = 0; i < 8; i++) {
    console.log(`  与位置${i}相邻:`, liuNianGan.isAdjacent(i));
}

// 验证原局柱的相邻判断不变
console.log('\n原局年干(0)相邻判断（不受影响）:');
console.log(`  与位置1相邻:`, gan0.isAdjacent(1), '(应为 true)');
console.log(`  与位置2相邻:`, gan0.isAdjacent(2), '(应为 true)');
console.log(`  与位置4相邻:`, gan0.isAdjacent(4), '(应为 false)');

// 大运辅助方法测试
console.log('\n大运相邻位置辅助方法:');
console.log('  getDaYunAdjacentPositions():', ctx.getDaYunAdjacentPositions());
console.log('  getLiuNianAdjacentPositions():', ctx.getLiuNianAdjacentPositions());
