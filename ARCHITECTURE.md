# 八字命理软件 - 架构需求文档

## 一、整体架构

```
┌─────────────────────────────────────────┐
│           排盘（独立前置步骤）           │
│  输入：出生日期时间 → 输出：命盘JSON     │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│          数据层（面向对象）← 当前阶段    │
│  五行 → 天干 → 十神/日元                │
│  地支（冲害破刑）                       │
│  四柱数据组装                           │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│          逻辑层（分析计算）              │
│  身强身弱、用神喜忌、大运流年等          │
└─────────────────────────────────────────┘
```

---

## 二、数据层架构

### 2.1 核心继承关系

```
Element（五行基类）
    │
    ├── Gan（天干）
    │       │
    │       └── Shishen（十神/日元）继承 Gan
    │
    └── Zhi（地支）继承 Element
            │
            └── 冲/害/破/刑关系判断
```

### 2.2 类定义

#### 2.2.0 常量定义

```javascript
// 五行常量
const WX = { JIN: '金', MU: '木', SHUI: '水', HUO: '火', TU: '土' };

// 五行顺序（用于旺相休囚死）：木 → 火 → 土 → 金 → 水 → 木
const WX_ORDER = ['木', '火', '土', '金', '水'];

// 五行相生顺序：金 → 水 → 木 → 火 → 土 → 金
const WX_SHENG_ORDER = ['金', '水', '木', '火', '土'];

// 五行相克顺序：金 → 木 → 土 → 水 → 火 → 金
const WX_KE_ORDER = ['金', '木', '土', '水', '火'];

// 天干映射表
const GAN_MAP = {
    '甲': { wx: '木', yinyang: '阳', order: 1 },
    '乙': { wx: '木', yinyang: '阴', order: 2 },
    '丙': { wx: '火', yinyang: '阳', order: 3 },
    '丁': { wx: '火', yinyang: '阴', order: 4 },
    '戊': { wx: '土', yinyang: '阳', order: 5 },
    '己': { wx: '土', yinyang: '阴', order: 6 },
    '庚': { wx: '金', yinyang: '阳', order: 7 },
    '辛': { wx: '金', yinyang: '阴', order: 8 },
    '壬': { wx: '水', yinyang: '阳', order: 9 },
    '癸': { wx: '水', yinyang: '阴', order: 10 }
};

// 地支映射表（含藏干）
const ZHI_MAP = {
    '子': { wx: '水', yinyang: '阳', hiddenStems: ['癸'] },
    '丑': { wx: '土', yinyang: '阴', hiddenStems: ['己', '癸', '辛'] },
    '寅': { wx: '木', yinyang: '阳', hiddenStems: ['甲', '丙', '戊'] },
    '卯': { wx: '木', yinyang: '阴', hiddenStems: ['乙'] },
    '辰': { wx: '土', yinyang: '阳', hiddenStems: ['戊', '乙', '癸'] },
    '巳': { wx: '火', yinyang: '阴', hiddenStems: ['丙', '庚', '戊'] },
    '午': { wx: '火', yinyang: '阳', hiddenStems: ['丁', '己'] },
    '未': { wx: '土', yinyang: '阴', hiddenStems: ['己', '丁', '乙'] },
    '申': { wx: '金', yinyang: '阳', hiddenStems: ['庚', '壬', '戊'] },
    '酉': { wx: '金', yinyang: '阴', hiddenStems: ['辛'] },
    '戌': { wx: '土', yinyang: '阳', hiddenStems: ['戊', '辛', '丁'] },
    '亥': { wx: '水', yinyang: '阴', hiddenStems: ['壬', '甲'] }
};

// 十神名称常量
const SHISHEN = {
    SHOU: '食神',   // 我生阳
    SHANG: '伤官',  // 我生阴
    PIAN_CAI: '偏财', // 我克阳
    ZHENG_CAI: '正财', // 我克阴
    QI_SHA: '七杀',  // 克我阳
    ZHENG_GUAN: '正官', // 克我阴
    PIAN_YIN: '偏印',  // 生我阳
    ZHENG_YIN: '正印',  // 生我阴
    BI_JIAN: '比肩',  // 比和阳
    JIE_CAI: '劫财'   // 比和阴
};
```

#### 2.2.1 Element（五行基类）

```javascript
class Element {
    constructor(name, wx, yinyang) {
        this.name = name;          // 名称
        this.wx = wx;             // 五行：木/火/土/金/水
        this.yinyang = yinyang;   // 阴阳：阳/阴
    }

    // 获取五行属性
    getElement() { return this.wx; }

    // 获取阴阳
    isYang() { return this.yinyang === '阳'; }
    isYin() { return this.yinyang === '阴'; }

    // 与另一个Element的五行生克关系
    // 返回: '生'（我生它）、'克'（我克它）、'被生'（它生我）、'被克'（它克我）、'同'（同类）、null（相同）
    getRelationTo(other) {
        if (this.wx === other.wx) return '同';

        // 五行相生顺序：金→水→木→火→土→金
        const shengIdx = WX_SHENG_ORDER.indexOf(this.wx);
        if (WX_SHENG_ORDER[(shengIdx + 1) % 5] === other.wx) return '生';
        if (WX_SHENG_ORDER[(shengIdx + 2) % 5] === other.wx) return '生'; // 隔一位也算生

        // 五行相克顺序：金→木→土→水→火→金
        const keIdx = WX_KE_ORDER.indexOf(this.wx);
        if (WX_KE_ORDER[(keIdx + 1) % 5] === other.wx) return '克';

        return null;
    }

    // 获取五行在WX_ORDER中的索引（0木1火2土3金4水）
    static getWxIndex(wx) {
        return WX_ORDER.indexOf(wx);
    }

    // 判断该五行相对于月令的旺相休囚死
    // yueLingWx: 月令五行（木/火/土/金/水）
    // 月令=火: 旺=火, 相=土, 休=木, 囚=水, 死=金
    getWangRelation(yueLingWx) {
        if (this.wx === yueLingWx) return '旺';  // 同类 = 旺

        const myIdx = WX_ORDER.indexOf(this.wx);
        const yueIdx = WX_ORDER.indexOf(yueLingWx);

        // diff: 1=相, 2=死, 3=囚, 4=休
        const diff = (myIdx - yueIdx + 5) % 5;
        const relations = { 1: '相', 2: '死', 3: '囚', 4: '休' };
        return relations[diff];
    }
}
```

#### 2.2.2 Gan（天干类）

**天干列表：**
| 名称 | 五行 | 阴阳 | 序号 |
|------|------|------|------|
| 甲 | 木 | 阳 | 1 |
| 乙 | 木 | 阴 | 2 |
| 丙 | 火 | 阳 | 3 |
| 丁 | 火 | 阴 | 4 |
| 戊 | 土 | 阳 | 5 |
| 己 | 土 | 阴 | 6 |
| 庚 | 金 | 阳 | 7 |
| 辛 | 金 | 阴 | 8 |
| 壬 | 水 | 阳 | 9 |
| 癸 | 水 | 阴 | 10 |

```javascript
class Gan extends Element {
    constructor(name, pillarIndex) {
        const data = GAN_MAP[name];
        if (!data) throw new Error(`未知天干: ${name}`);
        super(name, data.wx, data.yinyang);
        this.order = data.order;
        this.type = '天干';
        this.pillarIndex = pillarIndex;  // 位置索引：0=年干, 2=月干, 4=日干, 6=时干
        this._shishen = null;  // 关联属性：藏干的十神（由BaziContext设置）
        this._hiddenRole = null;  // 关联属性：藏干角色 '本气'、'中气'、'余气'

        // 大运/流年柱开关（用于临柱判断）
        this.isDaYun = 0;    // 1=大运柱，与原局所有柱相邻
        this.isLiuNian = 0;  // 1=流年柱，与原局所有柱相邻
    }

    // 获取天干序号（1-10）
    getOrder() { return this.order; }

    // 获取十神（关联属性）
    getShishen() { return this._shishen; }

    // 获取藏干角色（关联属性）：'本气'、'中气'、'余气'
    getHiddenRole() { return this._hiddenRole; }

    // 判断与另一天干是否同性
    isSameYinYang(other) {
        return this.yinyang === other.yinyang;
    }

    // 获取柱位名称：年/月/日/时
    getPillarName() {
        const names = ['年', '月', '日', '时'];
        return names[this.pillarIndex / 2];
    }

    // 判断与另一位置是否相邻（临柱）
    // otherPillarIndex: 0-7
    isAdjacent(otherPillarIndex) {
        // 如果自己是大运/流年柱（开关为1），与原局所有柱都相邻
        if (this.isDaYun === 1 || this.isLiuNian === 1) {
            return otherPillarIndex >= 0 && otherPillarIndex <= 7;
        }

        // 中气和余气没有临柱判断
        const role = this._hiddenRole;
        if (role === '中气' || role === '余气') {
            return false;
        }

        if (this.pillarIndex === otherPillarIndex) return false;

        const thisPair = Math.floor(this.pillarIndex / 2);
        const otherPair = Math.floor(otherPillarIndex / 2);

        // 同一柱内：年干(0)-年支(1), 月干(2)-月支(3), 日干(4)-日支(5), 时干(6)-时支(7)
        if (thisPair === otherPair) {
            // 同柱内，差1就是相邻
            return Math.abs(this.pillarIndex - otherPillarIndex) === 1;
        }

        // 隔柱相邻（同一行但不同柱）
        // 天干之间：年干(0)-月干(2), 月干(2)-日干(4), 日干(4)-时干(6)
        const adjacentPairs = [[0,2], [2,0], [2,4], [4,2], [4,6], [6,4]];
        return adjacentPairs.some(([a, b]) => a === this.pillarIndex && b === otherPillarIndex);
    }

    // 获取相邻的所有位置索引
    getAdjacentPositions() {
        const adjacent = [];
        for (let i = 0; i < 8; i++) {
            if (i !== this.pillarIndex && this.isAdjacent(i)) {
                adjacent.push(i);
            }
        }
        return adjacent;
    }
}
```

**说明：** 天干的位置属性 `pillarIndex` 在 BaziContext 创建 pillars 时传入（0=年干, 2=月干, 4=日干, 6=时干）。`_shishen` 是关联属性，用于存储藏干对应的十神（由BaziContext在初始化时从排盘数据填充）。

#### 2.2.3 Zhi（地支类）

**地支列表：**
| 名称 | 五行 | 阴阳 | 藏干 |
|------|------|------|------|
| 子 | 水 | 阳 | 癸 |
| 丑 | 土 | 阴 | 己、癸、辛 |
| 寅 | 木 | 阳 | 甲、丙、戊 |
| 卯 | 木 | 阴 | 乙 |
| 辰 | 土 | 阳 | 戊、乙、癸 |
| 巳 | 火 | 阴 | 丙、庚、戊 |
| 午 | 火 | 阳 | 丁、己 |
| 未 | 土 | 阴 | 己、丁、乙 |
| 申 | 金 | 阳 | 庚、壬、戊 |
| 酉 | 金 | 阴 | 辛 |
| 戌 | 土 | 阳 | 戊、辛、丁 |
| 亥 | 水 | 阴 | 壬、甲 |

```javascript
class Zhi extends Element {
    constructor(name, pillarIndex) {
        const data = ZHI_MAP[name];
        if (!data) throw new Error(`未知地支: ${name}`);
        super(name, data.wx, data.yinyang);
        this.type = '地支';
        this.pillarIndex = pillarIndex;  // 位置索引：1=年支, 3=月支, 5=日支, 7=时支

        // 藏干 = 天干数组（关联属性模式：十神通过 _shishen 动态关联，角色通过 _hiddenRole 动态关联）
        this.hiddenGans = data.hiddenStems.map((s, i) => {
            const gan = new Gan(s, -1);
            gan._hiddenRole = i === 0 ? '本气' : (i === 1 ? '中气' : '余气');
            return gan;
        });

        // === 排盘数据搬运（空亡、纳音、神煞）===
        // 由BaziContext在初始化时从排盘数据填充
        this.naYin = '';        // 纳音：如"城头土"
        this.kongWang = [];     // 空亡：如["申", "酉"]
        this.shenSha = [];      // 神煞：如["将星", "血刃", "咸池"]

        // === 地支关系判断 ===
        this.chongWith = null;  // 相冲的地支
        this.heWith = null;     // 相合的地支
        this.haiWith = null;    // 相害的地支
        this.poWith = null;     // 相破的地支
        this.xingWith = null;    // 相刑的地支

        // === 属性开关（由分析层在判断时设置）===
        this.isKongWang = 0;  // 空亡开关：1=空亡

        // === 大运/流年柱开关（用于临柱判断）===
        this.isDaYun = 0;    // 1=大运柱，与原局所有柱相邻
        this.isLiuNian = 0;  // 1=流年柱，与原局所有柱相邻
    }

    // 获取本气（本五行藏干）
    getMainStem() { return this.hiddenGans[0]; }

    // 获取中气（如果不是本气则返回null）
    getMiddleStem() { return this.hiddenGans[1] || null; }

    // 获取余气
    getRemainderStem() { return this.hiddenGans[2] || null; }

    // 获取所有藏干（天干数组）
    getAllHiddenGans() { return this.hiddenGans; }

    // 获取藏干及其十神（关联属性）
    getAllHiddenGansWithShishen() {
        return this.hiddenGans.map(gan => ({
            gan: gan.name,
            shishen: gan.getShishen()
        }));
    }

    // 获取柱位名称：年/月/日/时
    getPillarName() {
        const names = ['年', '月', '日', '时'];
        return names[(this.pillarIndex - 1) / 2];
    }

    // 判断与另一位置是否相邻（临柱）
    isAdjacent(otherPillarIndex) {
        // 如果自己是大运/流年柱（开关为1），与原局所有柱都相邻
        if (this.isDaYun === 1 || this.isLiuNian === 1) {
            return otherPillarIndex >= 0 && otherPillarIndex <= 7;
        }

        if (this.pillarIndex === otherPillarIndex) return false;

        const thisPair = Math.floor(this.pillarIndex / 2);
        const otherPair = Math.floor(otherPillarIndex / 2);

        // 同一柱内：年支(1)-年干(0), 月支(3)-月干(2), 日支(5)-日干(4), 时支(7)-时干(6)
        if (thisPair === otherPair) {
            return Math.abs(this.pillarIndex - otherPillarIndex) === 1;
        }

        // 隔柱相邻（同一行但不同柱）
        // 地支之间：年支(1)-月支(3), 月支(3)-日支(5), 日支(5)-时支(7)
        const adjacentPairs = [[1,3], [3,1], [3,5], [5,3], [5,7], [7,5]];
        return adjacentPairs.some(([a, b]) => a === this.pillarIndex && b === otherPillarIndex);
    }

    // 获取相邻的所有位置索引
    getAdjacentPositions() {
        const adjacent = [];
        for (let i = 0; i < 8; i++) {
            if (i !== this.pillarIndex && this.isAdjacent(i)) {
                adjacent.push(i);
            }
        }
        return adjacent;
    }

    // === 地支关系判断 ===
    isChong(other) { /* 冲：子午、丑未... */ }
    isHe(other) { /* 合：子丑、寅亥... */ }
    isHai(other) { /* 害：子未、丑午... */ }
    isPo(other) { /* 破：子卯... */ }
    isXing(other) { /* 刑：寅巳申... */ }
}
```

**说明：**
- 地支的位置属性 `pillarIndex` 在 BaziContext 创建 pillars 时传入（1=年支, 3=月支, 5=日支, 7=时支）
- `naYin`、`kongWang`、`shenSha` 由排盘数据填充，存放在地支
- 藏干 `hiddenGans` 是 `Gan` 对象数组，十神通过 `gan.getShishen()` 获取（关联属性模式）
- 地支关系（冲害破刑）存放在地支本身

#### 2.2.4 Shishen（十神/日元类）继承 Gan

**十神关系表：**

| 关系 | 同性（阳vs阳/阴vs阴） | 异性（阳vs阴） |
|------|----------------------|----------------|
| 我生 | 食神 | 伤官 |
| 我克 | 偏财 | 正财 |
| 克我 | 七杀 | 正官 |
| 生我 | 偏印 | 正印 |
| 比和 | 比肩 | 劫财 |

```javascript
class Shishen extends Gan {
    constructor(name, relationToDayMaster) {
        super(name);
        this.type = '十神';
        this.relationToDayMaster = relationToDayMaster; // 食神/伤官/正财/偏财/...
    }

    // 获取十神名称
    getName() { return this.relationToDayMaster; }

    // 是否为日元（元男/元女）
    isDayMaster() {
        return this.relationToDayMaster === '元男' || this.relationToDayMaster === '元女';
    }
}

// 十神计算器
class ShishenCalculator {
    // 计算另一个天干相对于日主的十神
    static calculate(dayMaster, otherGan) {
        // 如果是自己对自己的关系
        if (dayMaster.name === otherGan.name) {
            return dayMaster.isYang() ? '元男' : '元女';
        }

        const sameYin = dayMaster.isYang() === otherGan.isYang();
        const relation = dayMaster.getRelationTo(otherGan);

        if (!relation) return null;

        // 根据生克关系和阴阳判断十神
        switch (relation) {
            case '生':  // 我生者
                return sameYin ? '食神' : '伤官';
            case '克':  // 我克者
                return sameYin ? '偏财' : '正财';
            case '被生': // 生我者
                return sameYin ? '偏印' : '正印';
            case '被克': // 克我者
                return sameYin ? '七杀' : '正官';
            case '同':  // 比和者
                return sameYin ? '比肩' : '劫财';
            default:
                return null;
        }
    }

    // 为命盘中的所有天干计算十神
    static calculateAll(ctx) {
        const dayMaster = ctx.dayMaster;
        const results = [];

        ctx.getAllGans().forEach((gan, idx) => {
            const relation = ShishenCalculator.calculate(dayMaster, gan);
            const shishen = new Shishen(gan.name, relation);
            results.push({
                index: idx,
                gan: gan,
                shishen: shishen,
                pillar: Math.floor(idx / 2), // 0=年,1=月,2=日,3=时
                isDayMaster: idx === 2 // 日干索引是2
            });
        });

        return results;
    }
}
```

---

### 2.3 数据结构

#### 2.3.1 pillars 数组

从排盘JS获取的原始数据，直接映射为对象数组：

```javascript
// 数组索引对应关系
// [0] 年天干  [1] 年地支
// [2] 月天干  [3] 月地支
// [4] 日天干  [5] 日地支  ← 日主是 pillars[4]
// [6] 时天干  [7] 时地支

pillars = [
    new Gan('庚'),  // [0] 年天干
    new Zhi('辰'),  // [1] 年地支
    new Gan('丙'),  // [2] 月天干
    new Zhi('子'),  // [3] 月地支
    new Gan('辛'),  // [4] 日天干（日主）
    new Zhi('丑'),  // [5] 日地支
    new Gan('壬'),  // [6] 时天干
    new Zhi('午')   // [7] 时地支
];
```

**快捷访问：**
```javascript
// 日主（用于计算十神关系的基准）
const dayMaster = pillars[4];  // Gan对象

// 快捷获取各柱
const yearGan = pillars[0];
const yearZhi = pillars[1];
const monthGan = pillars[2];
const monthZhi = pillars[3];
const dayGan = pillars[4];   // 日主
const dayZhi = pillars[5];
const hourGan = pillars[6];
const hourZhi = pillars[7];
```

#### 2.3.2 BaziContext（命盘上下文）

```javascript
class BaziContext {
    constructor(pillarData) {
        // 输入的原始数据
        this.raw = pillarData;

        // === 创建pillars数组 ===
        // 0=年干, 1=年支, 2=月干, 3=月支, 4=日干, 5=日支, 6=时干, 7=时支
        this.pillars = [
            new Gan(pillarData.yearGan, 0),   // [0] 年天干
            new Zhi(pillarData.yearZhi, 1),   // [1] 年地支
            new Gan(pillarData.monthGan, 2),  // [2] 月天干
            new Zhi(pillarData.monthZhi, 3),  // [3] 月地支
            new Gan(pillarData.dayGan, 4),    // [4] 日天干
            new Zhi(pillarData.dayZhi, 5),    // [5] 日地支
            new Gan(pillarData.hourGan, 6),   // [6] 时天干
            new Zhi(pillarData.hourZhi, 7)    // [7] 时地支
        ];

        // === 从排盘数据搬运到地支 ===
        // 年柱
        this.pillars[1].naYin = pillarData.yearNaYin;       // 年柱纳音
        this.pillars[1].kongWang = pillarData.yearKongWang;  // 年柱空亡
        this.pillars[1].shenSha = pillarData.yearShenSha;    // 年柱神煞
        // 月柱
        this.pillars[3].naYin = pillarData.monthNaYin;
        this.pillars[3].kongWang = pillarData.monthKongWang;
        this.pillars[3].shenSha = pillarData.monthShenSha;
        // 日柱
        this.pillars[5].naYin = pillarData.dayNaYin;
        this.pillars[5].kongWang = pillarData.dayKongWang;
        this.pillars[5].shenSha = pillarData.dayShenSha;
        // 时柱
        this.pillars[7].naYin = pillarData.hourNaYin;
        this.pillars[7].kongWang = pillarData.hourKongWang;
        this.pillars[7].shenSha = pillarData.hourShenSha;

        // === 设置藏干十神（关联属性模式）===
        this._setupHiddenGansShishen();

        // === 设置地支关系 ===
        this._setupZhiRelations();

        // === 日主 ===
        this.dayMaster = this.pillars[4];

        // === 性别 ===
        this.gender = pillarData.gender;

        // === 计算十神 ===
        this.shishenResults = ShishenCalculator.calculateAll(this);

        // === 快捷访问 ===
        this.yearGan = this.pillars[0];
        this.yearZhi = this.pillars[1];
        this.monthGan = this.pillars[2];
        this.monthZhi = this.pillars[3];
        this.dayZhi = this.pillars[5];
        this.hourGan = this.pillars[6];
        this.hourZhi = this.pillars[7];
    }

    // 设置地支关系（冲害破刑）
    _setupZhiRelations() {
        const zhis = [this.pillars[1], this.pillars[3], this.pillars[5], this.pillars[7]];
        for (let i = 0; i < zhis.length; i++) {
            for (let j = i + 1; j < zhis.length; j++) {
                const zi = zhis[i], zj = zhis[j];
                if (zi.isChong(zj)) { zi.chongWith = zj.name; zj.chongWith = zi.name; }
                if (zi.isHe(zj)) { zi.heWith = zj.name; zj.heWith = zi.name; }
                if (zi.isHai(zj)) { zi.haiWith = zj.name; zj.haiWith = zi.name; }
                if (zi.isPo(zj)) { zi.poWith = zj.name; zj.poWith = zi.name; }
                if (zi.isXing(zj)) { zi.xingWith = zj.name; zj.xingWith = zi.name; }
            }
        }
    }

    // 设置藏干的十神（关联属性模式）
    _setupHiddenGansShishen() {
        const zhiIndices = [1, 3, 5, 7];  // 年支、月支、日支、时支
        zhiIndices.forEach((zhiIdx, pillarIdx) => {
            const hiddenData = this.raw.pillars[pillarIdx].hidden || [];
            hiddenData.forEach((h, i) => {
                if (this.pillars[zhiIdx].hiddenGans[i]) {
                    this.pillars[zhiIdx].hiddenGans[i]._shishen = h.god || '';
                }
            });
        });
    }

    // 获取所有天干
    getAllGans() {
        return [this.pillars[0], this.pillars[2], this.pillars[4], this.pillars[6]];
    }

    // 获取所有地支
    getAllZhis() {
        return [this.pillars[1], this.pillars[3], this.pillars[5], this.pillars[7]];
    }

    // === 大运/流年相关 ===

    /**
     * 创建大运柱（天干或地支），设置 isDaYun=1
     * @param {string} name - 天干或地支名称
     * @param {number} pillarIndex - 位置索引
     * @param {string} type - '天干' 或 '地支'
     * @returns {Gan|Zhi}
     */
    createDaYunPillar(name, pillarIndex, type) {
        const pillar = type === '天干' ? new Gan(name, pillarIndex) : new Zhi(name, pillarIndex);
        pillar.isDaYun = 1;
        return pillar;
    }

    /**
     * 创建流年柱（天干或地支），设置 isLiuNian=1
     * @param {string} name - 天干或地支名称
     * @param {number} pillarIndex - 位置索引
     * @param {string} type - '天干' 或 '地支'
     * @returns {Gan|Zhi}
     */
    createLiuNianPillar(name, pillarIndex, type) {
        const pillar = type === '天干' ? new Gan(name, pillarIndex) : new Zhi(name, pillarIndex);
        pillar.isLiuNian = 1;
        return pillar;
    }

    /**
     * 获取大运柱的相邻位置
     * @returns {number[]} 相邻位置数组
     */
    getDaYunAdjacentPositions() {
        // 大运柱与原局所有柱(0-7)都相邻
        return [0, 1, 2, 3, 4, 5, 6, 7];
    }

    /**
     * 获取流年柱的相邻位置
     * @returns {number[]} 相邻位置数组
     */
    getLiuNianAdjacentPositions() {
        // 流年柱与原局所有柱(0-7)都相邻
        return [0, 1, 2, 3, 4, 5, 6, 7];
    }

    // 获取四柱（用于大运流年）
    getPillarAt(index) {
        return {
            gan: this.pillars[index * 2],
            zhi: this.pillars[index * 2 + 1]
        };
    }

    // 获取某柱的十神信息
    getShishenAt(index) {
        return this.shishenResults.find(r => r.index === index);
    }

    // 转为可序列化对象
    toJSON() {
        return {
            pillars: this.pillars.map((p, i) => ({
                name: p.name,
                type: p.type,
                wx: p.wx,
                yinyang: p.yinyang,
                ...(p instanceof Zhi && {
                    hiddenGans: p.hiddenGans.map(h => ({name: h.name, wx: h.wx, yinyang: h.yinyang, shishen: h.getShishen()})),
                    naYin: p.naYin,
                    kongWang: p.kongWang,
                    shenSha: p.shenSha
                })
            })),
            dayMaster: { name: this.dayMaster.name, wx: this.dayMaster.wx, yinyang: this.dayMaster.yinyang },
            gender: this.gender,
            shishen: this.shishenResults.map(r => ({
                pillar: ['年', '月', '日', '时'][r.pillar],
                gan: r.gan.name,
                shishen: r.shishen.getName()
            }))
        };
    }
}
```

---

### 2.4 地支关系（冲害破刑）

仅用于地支之间的关系判断，不参与核心分析。

```javascript
class ZhiRelation {
    // 六合
    static getHePairs() {
        return [
            ['子', '丑'], ['寅', '亥'], ['卯', '戌'],
            ['辰', '酉'], ['巳', '申'], ['午', '未']
        ];
    }

    // 六冲
    static getChongPairs() {
        return [
            ['子', '午'], ['丑', '未'], ['寅', '申'],
            ['卯', '酉'], ['辰', '戌'], ['巳', '亥']
        ];
    }

    // 三合局
    static getSanHeGroups() {
        return [
            ['申', '子', '辰'], // 水局
            ['亥', '卯', '未'], // 木局
            ['寅', '午', '戌'], // 火局
            ['巳', '酉', '丑']  // 金局
        ];
    }

    // 判断两地支是否相冲
    static isChong(zhi1, zhi2) {
        const pair = [zhi1, zhi2].sort().join('');
        return ZhiRelation.getChongPairs().some(p => p.sort().join('') === pair);
    }

    // 判断两地支是否相合
    static isHe(zhi1, zhi2) {
        const pair = [zhi1, zhi2].sort().join('');
        return ZhiRelation.getHePairs().some(p => p.sort().join('') === pair);
    }
}
```

---

## 三、排盘数据接口

### 3.1 输入数据格式

从排盘JS获取的原始数据：

```javascript
const pillarData = {
    yearGan: '庚',    // 年干
    yearZhi: '辰',    // 年支
    monthGan: '丙',   // 月干
    monthZhi: '子',   // 月支
    dayGan: '辛',     // 日干（日元）
    dayZhi: '丑',     // 日支
    hourGan: '壬',    // 时干
    hourZhi: '午',    // 时支
    gender: 'M'       // 性别：M男 F女
};
```

### 3.2 初始化命盘上下文

```javascript
// 创建命盘上下文
const ctx = new BaziContext(pillarData);

// 验证数据
console.log(ctx.pillar.year.gan.name);  // '庚'
console.log(ctx.pillar.day.gan.wx);     // '金'
console.log(ctx.dayMaster.isYang());     // false (辛为阴金)
```

---

## 四、待续（逻辑层）

- [ ] 身强身弱分析
- [ ] 用神喜神忌神分析
- [ ] 十神旺衰分析
- [ ] 性格分析
- [ ] 大运流年排演
- [ ] 断语生成与扩写

---

## 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| v0.1 | 2026-03-19 | 初始架构文档 - 数据层 |
