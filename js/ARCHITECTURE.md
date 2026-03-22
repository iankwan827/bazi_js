# 八字命理软件 - 架构需求文档

---

## 速查表（必读）

### 索引对照表

| 名称 | 含义 | 取值范围 |
|------|------|----------|
| **pillars数组索引** | pillars[0-7]，定位具体天干或地支 | 0=年干, 1=年支, 2=月干, 3=月支, 4=日干, 5=日支, 6=时干, 7=时支 |
| **pillar（occurrences）** | occurrences里的pillar值，含义同pillars数组索引 | 0-7 |
| **柱索引（四柱编号）** | 四柱的编号，用于getPillarAt()等 | 0=年柱, 1=月柱, 2=日柱, 3=时柱 |

### 相邻关系（pillars数组索引）

| 类型 | 相邻对 |
|------|--------|
| 同柱相邻 | 0-1, 2-3, 4-5, 6-7 |
| 隔柱相邻(地支与地支) | 1-3, 3-5, 5-7 |

### 十神occurrences结构

```javascript
{
    pillar: 0-7,        // pillars数组索引：0=年干,1=年支,2=月干,3=月支,4=日干,5=日支,6=时干,7=时支
    occurs: [1,0],     // [天干存在?, 藏干存在?]
    role: null/'本气'/'中气'/'余气'  // null表示天干
}
```

> ⚠️ **修改代码前必查此表！**

---

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
        this._zhiName = null;  // 关联属性：藏干所在的地支名称（由BaziContext设置）

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

    // 获取藏干所在的地支名称（关联属性）：'子'、'丑'、'寅'...
    getZhiName() { return this._zhiName; }

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

        // 藏干 = 天干数组（关联属性模式：十神通过 _shishen 动态关联，角色通过 _hiddenRole 动态关联，地支通过 _zhiName 动态关联）
        this.hiddenGans = data.hiddenStems.map((s, i) => {
            const gan = new Gan(s, -1);
            gan._hiddenRole = i === 0 ? '本气' : (i === 1 ? '中气' : '余气');
            gan._zhiName = name;  // 藏干所在的地支名称
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
        super(name, -1);  // pillarIndex 固定为 -1，因为十神可能出现在多个位置
        this.relationToDayMaster = relationToDayMaster; // 食神/伤官/正财/偏财/...

        // === 存在状态 ===
        this.exists = [0, 0];  // [天干存在, 藏干存在]
        // 判断：[1,0]=虚浮, [0,1]=藏着不透, [1,1]=透干

        // === 出现位置数组 ===
        this.occurrences = [];
        // 每个元素: { pillar: 0/1/2/3, occurs: [天干存在, 藏干存在], role: '本气'/'中气'/'余气' }
        // pillar: 0=年, 1=月, 2=日, 3=时
        // occurs: [1,0]=天干, [0,1]=藏干

        // === 旺衰和受制状态 ===
        this.isWang = 0;     // 0=衰, 1=旺
        this.isShouZhi = 0;  // 0=不受制, 1=受制

        // === 喜用忌闲 ===
        // 由分析层逻辑判断后赋值：'喜'/'用'/'忌'/'闲'，初始为 null
        this.xiYong = null;
    }

    // 获取十神名称
    getName() { return this.relationToDayMaster; }

    // 是否为日元（元男/元女）
    isDayMaster() {
        return this.relationToDayMaster === '元男' || this.relationToDayMaster === '元女';
    }

    // 获取透干状态
    // 返回：0=虚浮(只有天干), 1=藏着不透(只有藏干), 2=透干, -1=不存在
    getTouGanStatus() {
        if (this.exists[0] === 1 && this.exists[1] === 0) return 0;  // 虚浮
        if (this.exists[0] === 0 && this.exists[1] === 1) return 1;  // 藏着不透
        if (this.exists[0] === 1 && this.exists[1] === 1) return 2;  // 透干
        return -1;  // 不存在
    }

    // 根据月令五行计算旺衰
    // yueLingWx: 月令五行（木/火/土/金/水）
    // 旺相休囚死中，旺和相算旺(isWang=1)，休囚死算衰(isWang=0)
    calculateWang(yueLingWx) {
        const relation = this.getWangRelation(yueLingWx);
        this.isWang = (relation === '旺' || relation === '相') ? 1 : 0;
        return this.isWang;
    }
}

// =============================================
// ShishenWangShuaiCalculator（十神旺衰计算器）
// 独立模块：shishen_wangshuai.js
// =============================================

class ShishenWangShuaiCalculator {
    /**
     * 计算所有十神的旺衰
     * @param {BaziContext} ctx - 命盘上下文
     * @param {Object} bodyStrength - 身强身弱结果 { level, score, percentage }
     *
     * 【输出属性 - 赋值到 shishen 对象】
     * 此方法计算以下属性，后续分析模块可直接使用：
     * - shishen.isWang: 0=衰, 1=旺（通过月令、通根、本气根、中气根判断）
     * - shishen.isShouZhi: 0=不受制, 1=受制（通过克、冲、刑、合判断）
     * - shishen.xiYong: '用'/'忌'/'闲'（根据身强身弱判断）
     */
    static calculateAll(ctx, bodyStrength) {
        const yueLingWx = ctx.pillars[3].wx;  // 月令五行

        ctx.shishenResults.forEach(result => {
            const shishen = result.shishen;

            // 1. 得月令（旺相休囚死）
            const yueLingWang = shishen.calculateWang(yueLingWx);

            // 2. 本柱通根/禄/刃
            const benTongGen = this._hasBenTongGen(shishen.name, ctx);

            // 3. 原局本气根数量
            const benQiRoots = this._countBenQiRoots(shishen.name, ctx);

            // 4. 原局中气根数量
            const zhongQiRoots = this._countZhongQiRoots(shishen.name, ctx);

            // 综合判断旺衰
            // 旺的条件：得月令 OR 本柱通根 OR 至少一个本气根 OR 至少两个中气根
            const isWang = yueLingWang || benTongGen || benQiRoots >= 1 || zhongQiRoots >= 2;
            shishen.isWang = isWang ? 1 : 0;

            // 计算受制状态
            shishen.isShouZhi = this._calculateShouZhi(shishen, ctx);

            // 计算喜用忌闲
            shishen.xiYong = this._calculateXiYong(shishen, bodyStrength);
        });
    }

    /**
     * 判断是否有本柱通根
     * 本柱通根 = 天干作为本气出现在任何地支的藏干中
     * @param {string} ganName - 天干名
     * @param {BaziContext} ctx
     * @returns {boolean}
     */
    static _hasBenTongGen(ganName, ctx) {
        // 检查原局所有地支的藏干
        const zhis = ctx.getAllZhis();
        for (const zhi of zhis) {
            const mainGan = zhi.getMainStem();
            if (mainGan && mainGan.name === ganName) return true;
            const middleGan = zhi.getMiddleStem();
            if (middleGan && middleGan.name === ganName) return true;
            const remainderGan = zhi.getRemainderStem();
            if (remainderGan && remainderGan.name === ganName) return true;
        }
        return false;
    }

    /**
     * 统计本气根数量
     * 统计该天干作为本气出现在地支藏干中的次数
     */
    static _countBenQiRoots(ganName, ctx) {
        let count = 0;
        const zhis = ctx.getAllZhis();
        for (const zhi of zhis) {
            const mainGan = zhi.getMainStem();
            if (mainGan && mainGan.name === ganName) count++;
        }
        return count;
    }

    /**
     * 统计中气根数量
     * 统计该天干作为中气出现在地支藏干中的次数
     */
    static _countZhongQiRoots(ganName, ctx) {
        let count = 0;
        const zhis = ctx.getAllZhis();
        for (const zhi of zhis) {
            const middleGan = zhi.getMiddleStem();
            if (middleGan && middleGan.name === ganName) count++;
            const remainderGan = zhi.getRemainderStem();
            if (remainderGan && remainderGan.name === ganName) count++;
        }
        return count;
    }

    /**
     * 计算受制状态
     * 制：克、冲、刑、合伴、合化
     * 受制的逻辑：
     * - 制：克、冲、刑、合伴、合化
     * - 情况1：同柱天干克地支（如时干乙木克时支未土）
     * - 情况2：地支之间的冲、刑、合关系（如年支卯木冲月支酉金）
     * - 例如：未（土）被时干乙木克，所以未中所有藏干（己、丁、乙）都受制
     * - 例如：酉（金）被年支卯木冲，所以酉中藏干（辛）受制
     */
    static _calculateShouZhi(shishen, ctx) {
        const shishenName = shishen.name;
        const zhis = ctx.getAllZhis();

        for (const zhi of zhis) {
            const hiddenNames = zhi.hiddenGans.map(h => h.name);
            if (!hiddenNames.includes(shishenName)) continue;

            // 情况1：检查同柱天干是否克该地支
            const ganPosition = zhi.pillarIndex - 1;
            if (ganPosition >= 0 && ctx.pillars[ganPosition]) {
                const gan = ctx.pillars[ganPosition];
                if (this._isKe(gan.wx, zhi.wx)) return 1;
            }

            // 情况2：检查其他地支与该地支的冲、刑、合关系
            for (const otherZhi of zhis) {
                if (otherZhi.name === zhi.name) continue;
                if (this._isChong(otherZhi.name, zhi.name)) return 1;
                if (this._isXing(otherZhi.name, zhi.name)) return 1;
                if (this._isHe(otherZhi.name, zhi.name)) return 1;
            }
        }
        return 0;
    }

    static _isKe(keWx, beiWx) {
        if (keWx === '木' && beiWx === '土') return true;
        if (keWx === '火' && beiWx === '金') return true;
        if (keWx === '土' && beiWx === '水') return true;
        if (keWx === '金' && beiWx === '木') return true;
        if (keWx === '水' && beiWx === '火') return true;
        return false;
    }

    static _isChong(zhi1, zhi2) {
        const ZHICHONG_TABLE = [['子','午'],['丑','未'],['寅','申'],['卯','酉'],['辰','戌'],['巳','亥']];
        for (const [a, b] of ZHICHONG_TABLE) {
            if ((zhi1 === a && zhi2 === b) || (zhi1 === b && zhi2 === a)) return true;
        }
        return false;
    }

    static _isXing(zhi1, zhi2) {
        const XING_TABLE = [['寅','巳','申'],['丑','戌'],['子','卯']];
        for (const group of XING_TABLE) {
            if (group.includes(zhi1) && group.includes(zhi2)) return true;
        }
        return false;
    }

    static _isHe(zhi1, zhi2) {
        const HE_TABLE = [['子','丑'],['寅','亥'],['卯','戌'],['辰','酉'],['巳','申'],['午','未']];
        for (const [a, b] of HE_TABLE) {
            if ((zhi1 === a && zhi2 === b) || (zhi1 === b && zhi2 === a)) return true;
        }
        return false;
    }

    /**
     * 计算喜用忌闲
     * 身强：官财食伤为用，印比劫为忌
     * 身弱：印比劫为用，官财食伤为忌
     */
    static _calculateXiYong(shishen, bodyStrength) {
        const shishenName = shishen.getName();
        const isShenQiang = bodyStrength.level.includes('强');
        const guanCaiShiShang = ['七杀', '正官', '偏财', '正财', '食神', '伤官'];
        const yinBiJie = ['偏印', '正印', '比肩', '劫财'];

        if (guanCaiShiShang.includes(shishenName)) return isShenQiang ? '用' : '忌';
        if (yinBiJie.includes(shishenName)) return isShenQiang ? '忌' : '用';
        return '闲';
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

// =============================================
// ShishenPingKeCalculator（十神性格计算器）
// 独立模块：shishen_pingke.js
// =============================================

/**
 * 十神性格特征详细表
 * 根据文档《八字用神与性格特征.md》逐行实现
 * 每个分类(category)有4种条件组合：
 * - 用神旺而逢生 → 正面特征
 * - 忌神弱而受制 → 正面特征
 * - 用神弱而受制 → 负面特征
 * - 忌神旺而逢生 → 负面特征
 */
const PINGKE_TABLE = {
    guanSha: {
        name: '官星',
        trait: '守法',
        conditions: [
            // 用神旺而逢生 → 正面
            { xiYong: '用', isWang: true, isFengSheng: true, description: '刚直不阿、秉公执法、责任心强、锐意进取、具有君子之风' },
            // 忌神弱而受制 → 正面
            { xiYong: '忌', isWang: false, isShouZhi: true, description: '刚直不阿、秉公执法、责任心强、锐意进取、具有君子之风' },
            // 用神弱而受制 → 负面
            { xiYong: '用', isWang: false, isShouZhi: true, description: '行为不轨、违法之徒、不思进取、顶撞领导、当为小人' },
            // 忌神旺而逢生 → 负面
            { xiYong: '忌', isWang: true, isFengSheng: true, description: '行为不轨、违法之徒、不思进取、顶撞领导、当为小人' }
        ]
    },
    yin: {
        name: '印星',
        trait: '仁慈',
        conditions: [
            { xiYong: '用', isWang: true, isFengSheng: true, description: '仁慈宽厚、宽以待人、体恤亲朋、智力超群、文才卓然' },
            { xiYong: '忌', isWang: false, isShouZhi: true, description: '仁慈宽厚、宽以待人、体恤亲朋、智力超群、文才卓然' },
            { xiYong: '用', isWang: false, isShouZhi: true, description: '心胸狭窄、做事狠毒、目光短浅、性格多疑、感情用事、傻大粗黑' },
            { xiYong: '忌', isWang: true, isFengSheng: true, description: '心胸狭窄、做事狠毒、目光短浅、性格多疑、感情用事、傻大粗黑' }
        ]
    },
    cai: {
        name: '财星',
        trait: '勤勉',
        conditions: [
            { xiYong: '用', isWang: true, isFengSheng: true, description: '勤勉能干、性格温和、古道热肠、仗义疏财、思想纯正' },
            { xiYong: '忌', isWang: false, isShouZhi: true, description: '勤勉能干、性格温和、古道热肠、仗义疏财、思想纯正' },
            { xiYong: '用', isWang: false, isShouZhi: true, description: '懒惰、小气吝啬、头脑僵化、性格暴躁、喜信谗言' },
            { xiYong: '忌', isWang: true, isFengSheng: true, description: '懒惰、小气吝啬、头脑僵化、性格暴躁、喜信谗言' }
        ]
    },
    shiShang: {
        name: '食伤',
        trait: '才华',
        conditions: [
            { xiYong: '用', isWang: true, isFengSheng: true, description: '气质高雅、思想脱俗、反应灵敏、风流潇洒、才华横溢、聪明伶俐、能言善道、多才多艺、适应力强、有艺术天赋' },
            { xiYong: '忌', isWang: false, isShouZhi: true, description: '气质高雅、思想脱俗、反应灵敏、风流潇洒、才华横溢、聪明伶俐、能言善道、多才多艺、适应力强、有艺术天赋' },
            { xiYong: '用', isWang: false, isShouZhi: true, description: '自命不凡、郁郁寡欢、喜欢空想、行为诡秘、易遭挫折' },
            { xiYong: '忌', isWang: true, isFengSheng: true, description: '自命不凡、郁郁寡欢、喜欢空想、行为诡秘、易遭挫折' }
        ]
    },
    biJie: {
        name: '比劫',
        trait: '义气',
        conditions: [
            { xiYong: '用', isWang: true, isFengSheng: true, description: '意志坚定、为人豪惠、事直自重、邻里友好、内外团结' },
            { xiYong: '忌', isWang: false, isShouZhi: true, description: '意志坚定、为人豪惠、事直自重、邻里友好、内外团结' },
            { xiYong: '用', isWang: false, isShouZhi: true, description: '刻板固执、自以为是、兄弟失合、一生操劳' },
            { xiYong: '忌', isWang: true, isFengSheng: true, description: '刻板固执、自以为是、兄弟失合、一生操劳' }
        ]
    }
};

// 十神分类映射
const SHISHEN_CATEGORY = {
    guanSha: ['七杀', '正官'],
    yin: ['偏印', '正印'],
    cai: ['偏财', '正财'],
    shiShang: ['食神', '伤官'],
    biJie: ['比肩', '劫财']
};

class ShishenPingKeCalculator {
    /**
     * 计算所有十神的性格特征
     * @param {BaziContext} ctx - 命盘上下文
     * @returns {Array} 性格特征数组
     *
     * 【依赖属性 - 由 ShishenWangShuaiCalculator.calculateAll() 预先赋值】
     * - shishen.xiYong: '用'/'忌' - 用神/忌神
     * - shishen.isWang: 0/1 - 旺/衰
     * - shishen.isShouZhi: 0/1 - 受制/不受制
     *
     * 【本方法计算】
     * - isFengSheng: 通过 _checkFengSheng() 判断是否逢生
     */
    static calculateAll(ctx) {
        const results = [];

        ctx.shishenResults.forEach(result => {
            const shishen = result.shishen;
            const shishenName = shishen.getName();
            // 直接使用 WangShuaiCalculator 已计算好的属性
            const xiYong = shishen.xiYong;
            const isWang = shishen.isWang === 1;
            const isShouZhi = shishen.isShouZhi === 1;

            // 获取十神所在的天干位置，计算逢生
            const ganPosition = this._getGanPosition(result);
            const isFengSheng = this._checkFengSheng(ganPosition, ctx);

            // 判断性格特征
            const category = this._getCategory(shishenName);
            if (category) {
                const pingKe = this._determinePingKe(category, xiYong, isWang, isShouZhi, isFengSheng);
                results.push({
                    shishen: shishenName,
                    category: PINGKE_TABLE[category].name,
                    trait: PINGKE_TABLE[category].trait,
                    isWang: isWang,
                    isShouZhi: isShouZhi,
                    isFengSheng: isFengSheng,
                    pingKe: pingKe
                });
            }
        });

        return results;
    }

    /**
     * 从 shishenResult 获取天干位置
     * @param {Object} result - shishenResult 条目
     * @returns {number} 天干位置 (0-7)
     */
    static _getGanPosition(result) {
        // 找到第一个在天干中出现的 occurrence
        for (const occ of result.occurrences) {
            if (occ.occurs[0] === 1) {
                // pillar: 0=年, 1=月, 2=日, 3=时
                // 对应的天干位置: pillar * 2
                return occ.pillar * 2;
            }
        }
        // 如果没有天干出现，返回第一个藏干的位置
        if (result.occurrences.length > 0) {
            const occ = result.occurrences[0];
            // pillar: 0=年, 1=月, 2=日, 3=时
            // 对应的地支位置: pillar * 2 + 1
            return occ.pillar * 2 + 1;
        }
        return -1;
    }

    /**
     * 检查十神是否逢生
     * 逢生：相邻天干中有相生的关系（木生火、火生土等通过五行生克判断）
     * @param {number} ganIndex - 天干索引
     * @param {BaziContext} ctx
     * @returns {boolean}
     */
    static _checkFengSheng(ganIndex, ctx) {
        // 获取该十神所在的所有位置（天干位置 + 藏干所在的地支位置）
        const positions = this._getShishenPositions(ganIndex, ctx);
        if (positions.length === 0) return false;

        // 检查所有位置是否有逢生关系
        for (const pos of positions) {
            const pillar = ctx.pillars[pos];
            if (!pillar) continue;

            // 获取该位置的相邻位置
            const adjacentPositions = pillar.getAdjacentPositions();

            for (const adjPos of adjacentPositions) {
                const other = ctx.pillars[adjPos];
                if (!other || other.type !== '天干') continue;

                // 检查 other 是否生 pillar（相生关系）
                const relation = other.getRelationTo(pillar);
                if (relation === '生' || relation === '被生') {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * 获取十神所在的所有位置
     * @param {number} ganIndex - 天干索引
     * @param {BaziContext} ctx
     * @returns {Array} 位置数组
     */
    static _getShishenPositions(ganIndex, ctx) {
        const ganName = ctx.pillars[ganIndex]?.name;
        if (!ganName) return [ganIndex];

        const positions = [ganIndex];

        // 检查该天干是否作为藏干出现在某个地支中
        for (let i = 0; i < ctx.pillars.length; i++) {
            const pillar = ctx.pillars[i];
            if (pillar.type !== '地支') continue;

            for (const hiddenGan of pillar.hiddenGans) {
                if (hiddenGan.name === ganName) {
                    // 藏干所在的位置是该地支的 pillarIndex
                    positions.push(pillar.pillarIndex);
                }
            }
        }

        return positions;
    }

    /**
     * 获取十神分类
     * @param {string} shishenName
     * @returns {string|null}
     */
    static _getCategory(shishenName) {
        for (const [key, names] of Object.entries(SHISHEN_CATEGORY)) {
            if (names.includes(shishenName)) {
                return key;
            }
        }
        return null;
    }

    /**
     * 判断性格特征
     * 只匹配条件中明确指定的字段，忽略其他字段
     * 例如："旺而逢生"只检查isWang和isFengSheng，不检查isShouZhi
     * @param {string} category - 十神分类
     * @param {string} xiYong - '用'/'忌'
     * @param {boolean} isWang - 是否旺
     * @param {boolean} isShouZhi - 是否受制
     * @param {boolean} isFengSheng - 是否逢生
     * @returns {Object} { isPositive: boolean, description: string }
     */
    static _determinePingKe(category, xiYong, isWang, isShouZhi, isFengSheng) {
        const info = PINGKE_TABLE[category];
        if (!info || !info.conditions) {
            return { isPositive: null, description: '' };
        }

        // 只匹配条件中明确指定的字段
        for (const cond of info.conditions) {
            // xiYong 必须匹配
            if (cond.xiYong !== xiYong) continue;

            // 检查条件中定义的其他字段
            if (cond.hasOwnProperty('isWang') && cond.isWang !== isWang) continue;
            if (cond.hasOwnProperty('isShouZhi') && cond.isShouZhi !== isShouZhi) continue;
            if (cond.hasOwnProperty('isFengSheng') && cond.isFengSheng !== isFengSheng) continue;

            // 所有条件中定义的字段都匹配
            return { isPositive: cond.isPositive, description: cond.description };
        }

        return { isPositive: null, description: '' };
    }
```

// =============================================
// ShishenGeshiCalculator（十神格局计算器）
// 独立模块：shishen_geshi.js
// =============================================

/**
 * 十神格局分析
 * 计算财官印相生、比肩食伤生财等格局
 */
class ShishenGeshiCalculator {
    /**
     * 计算十神格局
     * @param {BaziContext} ctx - 命盘上下文
     * @returns {Object} 格局分析结果
     *
     * 【输出属性】
     * - patterns: 存在的格局列表 ['财官印相生', '比肩食伤生财']
     * - caiGuanYin: 财官印相生结果 { matched, s1, s2, s3, reason }
     * - biJieShiShangCai: 比肩食伤生财结果 { matched, s1, s2, s3, reason }
     *
     * 【依赖属性 - 无需预先计算，直接使用 shishen.name 和 shishen.wx】
     */
    static calculate(ctx) {
        const result = {
            patterns: [],
            caiGuanYin: null,
            biJieShiShangCai: null,
            details: []
        };

        // 查找各类十神
        const cai = this._findShishen(ctx, ['偏财', '正财']);
        const guan = this._findShishen(ctx, ['七杀', '正官']);
        const yin = this._findShishen(ctx, ['偏印', '正印']);
        const biJie = this._findShishen(ctx, ['比肩', '劫财']);
        const shiShang = this._findShishen(ctx, ['食神', '伤官']);

        // 判断财官印相生：财→官→印
        const caiGuanYinChain = this._checkXiangShengChain(cai, guan, yin);
        if (caiGuanYinChain.matched) {
            result.patterns.push('财官印相生');
            result.caiGuanYin = caiGuanYinChain;
        }

        // 判断比肩食伤生财：比劫→食伤→财
        const biJieShiShangCaiChain = this._checkXiangShengChain(biJie, shiShang, cai);
        if (biJieShiShangCaiChain.matched) {
            result.patterns.push('比肩食伤生财');
            result.biJieShiShangCai = biJieShiShangCaiChain;
        }

        result.details.push(caiGuanYinChain);
        result.details.push(biJieShiShangCaiChain);

        return result;
    }

    /**
     * 查找指定类型的十神
     */
    static _findShishen(ctx, names) {
        return ctx.shishenResults.find(r => names.includes(r.shishen.name)) || null;
    }

    /**
     * 检查三神是否形成相生链条
     * 相生关系：s1生s2，s2生s3
     * @param {Object} s1 - 生者
     * @param {Object} s2 - 被生者
     * @param {Object} s3 - 被生者
     * @returns {Object} { matched: boolean, s1, s2, s3, reason }
     */
    static _checkXiangShengChain(s1, s2, s3) {
        if (!s1 || !s2 || !s3) {
            return { matched: false, s1: null, s2: null, s3: null, reason: '缺少必要十神' };
        }

        const shishen1 = s1.shishen;
        const shishen2 = s2.shishen;
        const shishen3 = s3.shishen;

        // 检查 s1 → s2 相生
        const relation1to2 = shishen1.getRelationTo(shishen2);
        // 检查 s2 → s3 相生
        const relation2to3 = shishen2.getRelationTo(shishen3);

        // 相生：'生' 或 '被生' 都可以
        const s1ToS2 = relation1to2 === '生' || relation1to2 === '被生';
        const s2ToS3 = relation2to3 === '生' || relation2to3 === '被生';

        if (s1ToS2 && s2ToS3) {
            const chain = `${shishen1.name}→${shishen2.name}→${shishen3.name}`;
            return {
                matched: true,
                s1: shishen1,
                s2: shishen2,
                s3: shishen3,
                reason: `形成${chain}相生链条`
            };
        }

        let reason = '';
        if (!s1ToS2) {
            reason = `${shishen1.name}不生${shishen2.name}（关系：${relation1to2 || '无'}）`;
        } else {
            reason = `${shishen2.name}不生${shishen3.name}（关系：${relation2to3 || '无'}）`;
        }

        return { matched: false, s1: shishen1, s2: shishen2, s3: shishen3, reason };
    }

    // =============================================
    // 六柱格局计算（大运+流年）
    // =============================================

    /**
     * 计算六柱格局（原局四柱 + 当前大运 + 当前流年）
     * 大运和流年作为独立柱加入，与原局所有柱都相邻
     * @param {BaziContext} ctx - 命盘上下文
     * @param {Object} currentDaYun - 当前大运数据（来自daYunList）
     * @param {Object} currentLiuNian - 当前流年数据（来自daYun.liuNian）
     * @returns {Object} 格局分析结果（格式同calculate）
     */
    static calculateSixPillars(ctx, currentDaYun, currentLiuNian) { ... }

    /**
     * 在六柱中查找指定十神（包含大运和流年天干）
     * @param {Array} sixPillars - 六柱数组
     * @param {Array} names - 十神名称数组
     * @param {Array} shishenResults - 原局shishenResults
     * @returns {Object|null}
     */
    static _findShishenInSixPillars(sixPillars, names, shishenResults) { ... }

    /**
     * 检查六柱中的三神是否形成相生链条
     * @param {Object} s1 - 生者
     * @param {Object} s2 - 被生者
     * @param {Object} s3 - 被生者
     * @param {Array} sixPillars - 六柱数组
     * @returns {Object}
     */
    static _checkSixPillarChain(s1, s2, s3, sixPillars) { ... }

    /**
     * 判断六柱中两个位置是否相邻
     * 大运(8,9)和流年(10,11)与原局所有柱(0-7)都相邻
     * @param {number} p1 - 位置索引
     * @param {number} p2 - 位置索引
     * @param {Array} sixPillars - 六柱数组
     * @returns {boolean}
     */
    static _isAdjacentInSixPillars(p1, p2, sixPillars) { ... }
}

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

## 五、输出规范

test/test_bazi_classes.js 测试输出规范如下：

### 1. 四柱排盘

```
┌───────────────────────────────────────────────────────────────┐
│ 【四柱排盘】                                                  │
├───────────────────────────────────────────────────────────────┤
│ 年柱: {gan}{zhi} ({十神名称})
│         藏干: {藏干1}({十神1}), {藏干2}({十神2}), {藏干3}({十神3})
│ 月柱: {gan}{zhi} ({十神名称})
│         藏干: ...
│ 日柱: {gan}{zhi} ({十神名称})  ← 日干为日元则十神为空
│         藏干: ...
│ 时柱: {gan}{zhi} ({十神名称})
│         藏干: ...
└───────────────────────────────────────────────────────────────┘
```

**字段说明：**
- `{十神名称}`：主天干的十神，通过 `ctx.getShishenAt(i)` 获取
- `藏干`：地支藏干列表，每条格式 `{藏干名}({十神名})`
  - 十神名通过 `hiddenGan.getShishen()` 获取
- 日柱的十神为空是正确行为（日干是日元，不是十神）

### 2. 大运流年

```
┌───────────────────────────────────────────────────────────────┐
│ 【大运流年】                                                  │
├───────────────────────────────────────────────────────────────┤
│ 当前大运: {ganZhi} ({十神})
│ 年龄: {startAge}-{endAge}岁
│ 起始年: {startYear}年
│ 当前流年: {year}年({age}岁) {ganZhi} ({十神})
│ 共 {count} 步大运
└───────────────────────────────────────────────────────────────┘
```

### 3. 基本信息

```
┌───────────────────────────────────────────────────────────────┐
│ 【基本信息】                                                  │
├───────────────────────────────────────────────────────────────┤
│ 日主: {gan} ({wx}, {yy}性)
│ 身强身弱: {level} ({percentage}%)
└───────────────────────────────────────────────────────────────┘
```

**字段说明：**
- `{gan}`：日干名称
- `{wx}`：日干五行
- `{yy}`：阴阳性（阳/阴）
- `{level}`：身强/身弱/中和
- `{percentage}`：身强比例（0-100%）

### 4. 十神旺衰受制

```
┌───────────────────────────────────────────────────────────────┐
│ 【十神旺衰受制】                                              │
├───────────────────────────────────────────────────────────────┤
│ {gan}: {shishen} | 旺衰={旺衰} | {受制} | 喜忌={喜忌}
│ ...
└───────────────────────────────────────────────────────────────┘
```

**字段说明：**
- `旺衰`：旺=isWang===1，衰=isWang===0
- `受制`：受制=isShouZhi===1，不受制=isShouZhi===0
- `喜忌`：用/忌/喜/闲（xiYong字段值）

### 5. 性格特征

```
┌───────────────────────────────────────────────────────────────┐
│ 【性格特征】                                                  │
├───────────────────────────────────────────────────────────────┤
│ {十神}（{分类}）: {✓正面/✗负面/○中性}
│   {描述}
│ ...
└───────────────────────────────────────────────────────────────┘
```

**字段说明：**
- `{分类}`：官星/印星/财星/食伤/比劫
- `✓正面`：isPositive===true
- `✗负面`：isPositive===false
- `○中性`：isPositive===null
- `{描述}`：PINGKE_TABLE中matched条件的description字段

### 6. 十神格局

```
┌───────────────────────────────────────────────────────────────┐
│ 【十神格局】                                                  │
├───────────────────────────────────────────────────────────────┤
│ [四柱格局]
│ ★ {格局名1}
│ ★ {格局名2}
│ ...
│
│ 格局明细:
│ 1. 财官印相生（财→官→印）:
│    ★ 匹配! {s1}→{s2}→{s3}
│    {reason}
│ 或
│    ✗ 未形成 - {reason}
│
│ 2. 比肩食伤生财（比劫→食伤→财）:
│    ★ 匹配! {s1}→{s2}→{s3}
│    {reason}
│ 或
│    ✗ 未形成 - {reason}
│
│ [六柱格局] (四柱+大运+流年)
│ ★ {格局名1}
│ ★ {格局名2}
│ ...
│
│ 格局明细:
│ 1. 财官印相生（财→官→印）:
│    ★ 匹配! {s1}→{s2}→{s3}
│    {reason}（六柱相邻）
│ 或
│    ✗ 未形成 - {reason}
│
│ 2. 比肩食伤生财（比劫→食伤→财）:
│    ★ 匹配! {s1}→{s2}→{s3}
│    {reason}（六柱相邻）
│ 或
│    ✗ 未形成 - {reason}
└───────────────────────────────────────────────────────────────┘
```

**字段说明：**
- **四柱格局**：原局四柱的格局分析
- **六柱格局**：四柱+当前大运+当前流年的格局分析
- 格局列表：所有matched的格局
- 每种格局明细：匹配时显示★+十神链+原因，未匹配时显示✗+原因
- 六柱格局原因中会标注"（六柱相邻）"以区分四柱格局的"（位置相邻）"

### 验证要点

1. **四柱排盘**：
   - 年/月/时柱的十神不应为空（日柱可以为空）
   - 藏干十神应正确显示（如乙(偏财)）
   - 同一十神在不同柱出现只显示一次

2. **十神旺衰受制**：
   - 每个十神应出现一次
   - 旺衰、受制、喜忌应有明确值

3. **性格特征**：
   - 应有4种十神类型（官/印/财/食伤/比劫中实际存在的）
   - 每种应有正面/负面/中性判定和描述

4. **十神格局**：
   - 财官印相生和比肩食伤生财应至少有一个匹配或不匹配的原因
   - 六柱格局可能与四柱格局不同（大运/流年引入新十神可能形成新格局）

---

## 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| v0.1 | 2026-03-19 | 初始架构文档 - 数据层 |
| v0.2 | 2026-03-21 | 新增 ShishenWangShuaiCalculator 类，实现十神旺衰判断逻辑（isWang、isShouZhi、xiYong） |
| v0.3 | 2026-03-21 | 新增 ShishenPingKeCalculator 类，实现十神性格特征判断 |
| v0.4 | 2026-03-21 | 完善 ShishenPingKeCalculator 文档，更新 PINGKE_TABLE 结构（5分类×4条件），添加逢生判断逻辑(_checkFengSheng)、受制判断调用说明 |
| v0.5 | 2026-03-21 | 明确 ShishenWangShuaiCalculator 与 ShishenPingKeCalculator 的属性复用关系（xiYong/isWang/isShouZhi 由前者计算，PingKe只计算isFengSheng） |
| v0.6 | 2026-03-21 | 新增 ShishenGeshiCalculator 类，计算财官印相生、比肩食伤生财格局 |
| v0.7 | 2026-03-21 | 添加速查表（pillar索引对照、相邻关系、occurrences结构）；修复相邻判断逻辑（pillar是pillars数组索引0-7，非柱索引0-3）；只计算天干和本气判断格局 |
| v0.8 | 2026-03-21 | 修复性格匹配逻辑：PINGKE_TABLE中"旺而逢生"等条件不检测isShouZhi；_determinePingKe改用hasOwnProperty只匹配条件中定义的字段 |
| v0.9 | 2026-03-21 | 新增输出规范文档（五），定义test_bazi_classes.js完整输出格式及验证要点 |
| v0.10 | 2026-03-21 | 新增六柱格局计算（calculateSixPillars）：四柱+大运+流年，大运/流年与原局所有柱相邻 |
| v0.11 | 2026-03-21 | 修复occurrences.pillar记录错误：藏干的pillar原错误记录为柱索引(0-3)，应改为pillars数组索引(1,3,5,7)；相邻关系恢复为同柱相邻(0-1,2-3,4-5,6-7)和隔柱相邻(1-3,3-5,5-7) |
| v0.12 | 2026-03-21 | 修复常量定义：将WX_SHENG_ORDER、WX_KE_ORDER、WX_ORDER从全局常量移至Element类作为静态属性，符合面向对象设计 |
