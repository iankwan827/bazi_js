window.AnalysisEngine = (function () {
    const GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
    const ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
    const WU_XING = {
        "甲": "木", "乙": "木", "丙": "火", "丁": "火", "戊": "土", "己": "土", "庚": "金", "辛": "金", "壬": "水", "癸": "水",
        "寅": "木", "卯": "木", "巳": "火", "午": "火", "申": "金", "酉": "金", "亥": "水", "子": "水",
        "辰": "土", "戌": "土", "丑": "土", "未": "土"
    };

    const SHENG = { "木": "火", "火": "土", "土": "金", "金": "水", "水": "木" };
    const KE = { "木": "土", "土": "水", "水": "火", "火": "金", "金": "木" };

    const WANG_XIANG = {
        "木": { "旺": "木", "相": "火", "休": "水", "囚": "金", "死": "土" },
        "火": { "旺": "火", "相": "土", "休": "木", "囚": "水", "死": "金" },
        "金": { "旺": "金", "相": "水", "休": "土", "囚": "火", "死": "木" },
        "水": { "旺": "水", "相": "木", "休": "金", "囚": "土", "死": "火" },
        "土": { "旺": "土", "相": "金", "休": "火", "囚": "木", "死": "水" }
    };

    const LU_REN = {
        "甲": { "禄": "寅", "刃": "卯" },
        "乙": { "禄": "卯", "刃": "寅" },
        "丙": { "禄": "巳", "刃": "午" },
        "丁": { "禄": "午", "刃": "巳" },
        "戊": { "禄": "巳", "刃": "午" },
        "己": { "禄": "午", "刃": "巳" },
        "庚": { "禄": "申", "刃": "酉" },
        "辛": { "禄": "酉", "刃": "申" },
        "壬": { "禄": "亥", "刃": "子" },
        "癸": { "禄": "子", "刃": "亥" }
    };

    function calculateKW(stem, branch) {
        const sIdx = GAN.indexOf(stem);
        const bIdx = ZHI.indexOf(branch);
        if (sIdx === -1 || bIdx === -1) return [];
        let startBIdx = (bIdx - sIdx + 12) % 12;
        let kw1 = (startBIdx + 10) % 12;
        let kw2 = (startBIdx + 11) % 12;
        return [ZHI[kw1], ZHI[kw2]];
    }

    function getInternalChain(branch, hiddenStems, targetStem, dm) {
        if (!hiddenStems || hiddenStems.length < 2) return null;
        let sequence = "";
        let impact = "";
        let stemSeq = [];
        if (branch === '巳') stemSeq = ['丙', '戊', '庚'];
        else if (branch === '申') stemSeq = ['戊', '庚', '壬'];
        else if (branch === '寅') stemSeq = ['甲', '丙', '戊'];
        else if (branch === '亥') stemSeq = ['壬', '甲'];
        else return null;
        const seqDisplay = stemSeq.map(s => {
            const god = window.getTenGod(dm, s);
            return `${god}(${WU_XING[s]})`;
        });
        sequence = seqDisplay.join(' -> ');
        const targetWX = WU_XING[targetStem];
        const seqElements = stemSeq.map(s => WU_XING[s]);
        const targetIdx = seqElements.indexOf(targetWX);
        if (targetIdx === -1) return null;
        if (targetIdx === 0 && seqElements.length > 1) impact = " (源头被耗)";
        else if (targetIdx === seqElements.length - 1) impact = " (最终受益)";
        else impact = " (流通转换)";
        return `${sequence}${impact}`;
    }

    const checkGod = (g, cat) => {
        if (!g) return false;
        const s = String(g);
        if (cat === '官杀') return s.includes('正官') || s.includes('七杀') || s.includes('偏官') || s === '杀' || s === '官';
        if (cat === '食伤') return s.includes('食神') || s.includes('伤官') || s === '食' || s === '伤';
        if (cat === '财星') return (s.includes('正财') || s.includes('偏财') || s === '才' || s === '财') && !s.includes('劫');
        if (cat === '印星') return s.includes('正印') || s.includes('偏印') || s.includes('枭神') || s === '印' || s === '枭';
        if (cat === '比劫') return s.includes('比肩') || s.includes('劫财') || s === '比' || s === '劫';
        return false;
    };

    function getNeighborFacts(inst, full, pillars, targetElement) {
        const facts = [];
        if (inst.pIdx >= 4 || inst.pIdx === 2) return facts;
        const neighborIndices = [inst.pIdx - 1, inst.pIdx + 1];
        neighborIndices.forEach(nIdx => {
            if (nIdx >= 0 && nIdx < 4 && nIdx !== 2) {
                const n = pillars[nIdx];
                const nTenGod = n.tenGod;
                const nWX = WU_XING[n.gan];
                const bMainGod = (n.hidden && n.hidden.length > 0) ? n.hidden[0].god : "";
                const bWX_src = WU_XING[n.zhi];
                const nName = ["年", "月", "日", "时"][nIdx];
                if (inst.type === 'STEM') {
                    const tName = `${inst.pillar.replace('柱', '干')}[${inst.val}]`;
                    const rel = getRelationLabel(targetElement, nWX);
                    if (rel === "生扶") facts.push(`${tName}受邻柱${nName}干[${n.gan}]${nTenGod}生助`);
                    else if (rel === "受制") facts.push(`${tName}受邻柱${nName}干[${n.gan}]${nTenGod}制约`);
                } else if (inst.type === 'BRANCH' && inst.subType === '本气') {
                    const tName = `${inst.pillar.replace('柱', '支')}[${inst.branch}]`;
                    const rel = getRelationLabel(targetElement, bWX_src);
                    if (rel === "生扶") facts.push(`${tName}受邻柱${nName}支[${n.zhi}]${bMainGod}生助`);
                    else if (rel === "受制") facts.push(`${tName}受邻柱${nName}支[${n.zhi}]${bMainGod}制约`);
                }
            }
        });
        return facts;
    }

    function getRelationLabel(subjectEl, objectEl) {
        if (!subjectEl || !objectEl) return "";
        if (subjectEl === objectEl) return "同气";
        if (SHENG[objectEl] === subjectEl) return "生扶";
        if (SHENG[subjectEl] === objectEl) return "被泄";
        if (KE[objectEl] === subjectEl) return "受制";
        if (KE[subjectEl] === objectEl) return "克位";
        return "";
    }

    function getAnheEffect(subjectEl, branch1, branch2) {
        const el1 = WU_XING[branch1];
        const el2 = WU_XING[branch2];
        const otherEl = (el1 === subjectEl) ? el2 : el1;
        if ((branch1 === '子' && branch2 === '戌') || (branch1 === '戌' && branch2 === '子')) {
            if (subjectEl === '水') return "(受制)";
            if (subjectEl === '土') return "(合财)";
        }
        if ((branch1 === '子' && branch2 === '寅') || (branch1 === '寅' && branch2 === '子')) {
            if (subjectEl === '水') return "(被泄)";
            if (subjectEl === '木') return "(生扶)";
            if (subjectEl === '土') return "SKIP";
        }
        const label = getRelationLabel(subjectEl, otherEl);
        if (label === "受制" || label === "被泄") return `(${label})`;
        if (label === "生扶" || label === "同气" || label === "克位") return `(${label})`;
        return "";
    }

    function getBranchRelation(z1, z2) {
        const CLASHES = { '子': '午', '午': '子', '丑': '未', '未': '丑', '寅': '申', '申': '寅', '卯': '酉', '酉': '卯', '辰': '戌', '戌': '辰', '巳': '亥', '亥': '巳' };
        const PUNISHMENTS = { '子': '卯', '卯': '子', '寅': '巳', '巳': '申', '申': '寅', '丑': '戌', '戌': '未', '未': '丑', '辰': '辰', '午': '午', '酉': '酉', '亥': '亥' };
        const HARM = { '子': '未', '未': '子', '丑': '午', '午': '丑', '寅': '巳', '巳': '寅', '卯': '辰', '辰': '卯', '申': '亥', '亥': '申', '酉': '戌', '戌': '酉' };
        const SIX_HE = { '子': '丑', '丑': '子', '寅': '亥', '亥': '寅', '卯': '戌', '戌': '卯', '辰': '酉', '酉': '辰', '巳': '申', '申': '巳', '午': '未', '未': '午' };
        if (CLASHES[z1] === z2) return `${z1}${z2}冲`;
        if (PUNISHMENTS[z1] === z2) return '相刑';
        if (HARM[z1] === z2) return '相害';
        if (SIX_HE[z1] === z2) return '六合';
        return window.checkInteraction ? window.checkInteraction(z1, z2) : null;
    }

    function getExpertReport(targetGod, data, isSubstitution = false) {
        if (!data) return null;

        // Ensure we have a BaziContext
        if (!data.ctx && data.pillars && window.BaziProcessor) {
            data.ctx = window.BaziProcessor.createContext(data);
        }
        const ctx = data.ctx;
        if (!ctx || !ctx.pillars) return null;

        const pillars = ctx.pillars.slice(0, 4);
        const full = ctx.pillars; // Already contains DaYun/LiuNian if contextualized

        const dayKW = calculateKW(pillars[2].gan, pillars[2].zhi);
        const yearKW = calculateKW(pillars[0].gan, pillars[0].zhi);
        const monthKW = calculateKW(pillars[1].gan, pillars[1].zhi);
        const hourKW = calculateKW(pillars[3].gan, pillars[3].zhi);
        const allOtherKW = Array.from(new Set([...yearKW, ...monthKW, ...hourKW]));

        function isBranchVoid(idx, zhi) {
            if (idx < 0 || idx > 3) return false;
            if (idx === 2) return yearKW.includes(zhi) || monthKW.includes(zhi) || hourKW.includes(zhi);
            return dayKW.includes(zhi);
        }

        const natalRevealed = pillars.map((fp, idx) => (idx !== 2) ? fp.tenGod : null).filter(g => g);
        const natalMainQi = pillars.map(fp => (fp.hidden && fp.hidden.length > 0) ? fp.hidden[0].god : null).filter(g => g);

        let decisionResult = { results: [], paths: [], trace: [] };
        let patternResults = [];
        const isMale = (data.gender === '男' || data.gender === '1' || data.gender === 1);
        const dm = pillars[2].gan;

        // Use pre-calculated star details
        let starDetails = [];
        try {
            starDetails = getGodStrengthDetails(ctx);
        } catch (e) {
            console.error("getGodStrengthDetails Error:", e);
        }

        if (window.DecisionEngine) {
            try {
                if (ctx) {
                    // Execute Wealth
                    const wealthResult = window.DecisionEngine.Engine.execute('wealth', ctx);
                    if (wealthResult && wealthResult.results) {
                        decisionResult.results.push(...wealthResult.results.map(r => ({ ...r, category: 'wealth' })));
                        decisionResult.trace.push(...(wealthResult.trace?.map(t => ({ ...t, category: 'wealth' })) || []));
                    }

                    // Execute Marriage
                    ['MARRIAGE_TIME', 'MARRIAGE_REL_HAPPY', 'MARRIAGE_REL_DIVORCE', 'MARRIAGE_REL_AFFAIR', 'MARRIAGE_TRAIT', 'MARRIAGE_APPEARANCE'].forEach(tree => {
                        const res = window.DecisionEngine.Engine.execute(tree, ctx);
                        if (res && res.results) {
                            decisionResult.results.push(...res.results.map(r => ({ ...r, category: 'marriage' })));
                            decisionResult.trace.push(...(res.trace?.map(t => ({ ...t, category: 'marriage' })) || []));
                        }
                    });

                }
            } catch (e) { console.error("Expert Pre-calc Error:", e); }
        }

        const isMasterMode = targetGod === 'MASTER';
        const gods = isMasterMode ?
            ctx.gods.filter(g => checkGod(g.godName, '财星') || checkGod(g.godName, '官杀')) :
            ctx.getGods(targetGod);

        if (gods.length === 0) {
            // Check for substitution if not master mode
            if (!isSubstitution && !isMasterMode) {
                const standardToPartial = { "正财": "偏财", "正官": "七杀", "正印": "偏印", "食神": "伤官", "比肩": "劫财" };
                const substitute = standardToPartial[targetGod];
                if (substitute) {
                    const subGods = ctx.getGods(substitute);
                    if (subGods.length > 0) {
                        const subReport = getExpertReport(substitute, data, true);
                        if (subReport) {
                            subReport.substitution = `(以偏当正)`;
                            return subReport;
                        }
                    }
                }
            }
            return { natal: [], suiYun: [], target: targetGod, summary: `${targetGod}全无。`, patternResults: patternResults, decisionResult: decisionResult };
        }

        const instances = gods.map(g => ({
            type: g.isStem ? 'STEM' : 'BRANCH',
            pillar: ["年柱", "月柱", "日柱", "时柱", "大运", "流年"][g.pillarIndex],
            pIdx: g.pillarIndex,
            val: g.char,
            subType: g.isStem ? null : (g.isSecondary ? "中气/余气" : "本气"),
            branch: ctx.pillars[g.pillarIndex]?.zhi,
            allHidden: ctx.pillars[g.pillarIndex]?.hidden,
            node: g // Keep the reference to the node
        }));

        const natalReports = [], suiYunReports = [], pillarGroups = {};
        instances.forEach(inst => {
            if (!pillarGroups[inst.pillar]) pillarGroups[inst.pillar] = { name: inst.pillar, pIdx: inst.pIdx, facts: new Set(), stemFacts: new Set(), branchFacts: new Set(), isStem: false, isBranch: false };
            const group = pillarGroups[inst.pillar];
            const p = full[inst.pIdx];

            if (!p) return; // Skip if pillar data is missing

            const element = inst.node.wx,
                sWX = WU_XING[p.gan],
                bMainWX = (p.hidden && p.hidden.length > 0) ? WU_XING[p.hidden[0].stem] : "",
                bMainGod = (p.hidden && p.hidden.length > 0) ? p.hidden[0].god : "";

            let isKW = (inst.pIdx === 2 && allOtherKW.includes(p.zhi)) || (inst.pIdx < 4 && dayKW.includes(p.zhi));
            if (isKW) { if (inst.type === 'BRANCH') group.branchFacts.add("逢空亡 (能量消散)"); else group.stemFacts.add("同柱坐空亡 (能量亦空)"); }

            getNeighborFacts(inst, full, pillars, element).forEach(f => group.facts.add(f));

            if (inst.type === 'STEM') {
                group.isStem = true;
                if (inst.pIdx !== 2) {
                    group.facts.add(`${targetGod}透干 (动态发力)`);
                    if (p.hidden?.some(h => h.god === targetGod)) group.facts.add(`本尊通根于地支 (有根)`);
                }
                if (bMainWX) {
                    const tName = `${inst.pillar.replace('柱', '干')}[${inst.val}]`;
                    if (SHENG[bMainWX] === element) group.facts.add(`${tName}得同柱支[${p.zhi}]${bMainGod}生助`);
                    if (KE[bMainWX] === element) group.facts.add(`${tName}受同柱支[${p.zhi}]${bMainGod}截脚`);
                }
            } else {
                group.isBranch = true;
                const chain = getInternalChain(p.zhi, p.hidden.map(h => h.stem), inst.val, dm);
                if (chain) group.facts.add(`地支内部流通生助 (厚积)`);

                const revealedMatch = full.slice(0, (inst.pIdx < 4 ? 4 : 6)).find((fp, idx) => fp.tenGod === targetGod && idx !== 2);
                if (revealedMatch) group.facts.add(`${targetGod}透干 (动态发力)`);
                else if (full.slice(0, (inst.pIdx < 4 ? 4 : 6)).find((fp, idx) => WU_XING[fp.gan] === element && fp.tenGod !== targetGod && idx !== 2)) group.facts.add(`同类引动 (同气)`);

                if (inst.subType === '本气' && sWX) {
                    const tName = `${inst.pillar.replace('柱', '支')}[${p.zhi}]`;
                    if (SHENG[sWX] === element) group.facts.add(`${tName}得同柱干[${p.gan}]${p.tenGod}生扶`);
                    if (KE[sWX] === element && group.pIdx !== 2) group.facts.add(`${tName}受同柱干[${p.gan}]${p.tenGod}盖头制约`);
                }
            }
        });

        const processGroup = (group) => {
            const branchInteractions = [], hostZhi = full[group.pIdx].zhi, groupZhiName = group.name.replace('柱', '支');
            if (hostZhi) { full.forEach((otherP, idx) => { if (idx === group.pIdx || idx >= 6) return; const otherZhi = otherP.zhi; if (!otherZhi) return; const rel = getBranchRelation(hostZhi, otherZhi); if (rel && (rel.includes('冲') || rel.includes('刑') || rel.includes('害') || rel.includes('破') || rel.includes('合'))) { let effect = ""; if (rel.includes('冲') || rel.includes('刑')) effect = "(根基动摇)"; else if (rel.includes('害') || rel.includes('破')) effect = "(内部受损)"; else if (rel.includes('暗合')) effect = getAnheEffect(WU_XING[hostZhi], rel.replace('暗合', '').split('')[0], rel.replace('暗合', '').split('')[1]); if (effect === "SKIP") return; let isNeighbor = (group.pIdx < 4 && idx < 4 && Math.abs(idx - group.pIdx) === 1); branchInteractions.push(`${groupZhiName}[${hostZhi}]与${["年", "月", "日", "时", "大运", "流年"][idx]}支[${otherZhi}]${isNeighbor ? "相邻" : ""}${rel}${effect || ""}`); } }); }
            const allFacts = [...Array.from(group.facts), ...(group.isStem ? Array.from(group.stemFacts) : []), ...(group.isBranch ? Array.from(group.branchFacts) : []), ...branchInteractions];
            allFacts.sort((a, b) => { const priorityTags = ["透干", "引动", "得生", "生扶", "空亡", "支撑", "受克", "截脚", "盖头", "动摇", "受损", "通根"]; const getPrio = (s) => { const idx = priorityTags.findIndex(tag => s.includes(tag)); return idx === -1 ? 99 : idx; }; return getPrio(a) - getPrio(b); });
            return { pillar: group.name, pos: group.isStem && group.isBranch ? "干支同现" : (group.isStem ? "天干" : "地支藏干"), facts: allFacts, hasPriority: allFacts.some(f => f.includes("透干") || f.includes("引动")) };
        };

        Object.values(pillarGroups).forEach(group => { const report = processGroup(group); if (group.pIdx < 4) natalReports.push(report); else suiYunReports.push(report); });
        natalReports.sort((a, b) => (b.hasPriority ? 1 : 0) - (a.hasPriority ? 1 : 0)); suiYunReports.sort((a, b) => (b.hasPriority ? 1 : 0) - (a.hasPriority ? 1 : 0));
        const allFactsArr = [...natalReports, ...suiYunReports].flatMap(r => r.facts), syRevealed = full.slice(4).map(fp => fp.tenGod).filter(g => g), syMainQi = full.slice(4).map(fp => (fp.hidden?.length > 0) ? fp.hidden[0].god : null).filter(g => g), natalParts = [], suiYunParts = [];

        // --- PHASE 2 INTEGRATION: Personality, Academic, Career, etc. ---
        if (window.DecisionEngine && data.ctx) {
            try {
                const ctx = data.ctx;

                // 1. Personality
                const personalityResult = window.DecisionEngine.Engine.execute('personality_tree', ctx);
                if (personalityResult && personalityResult.results) {
                    decisionResult.personality = personalityResult.results;
                    decisionResult.results.push(...personalityResult.results.map(r => ({ ...r, category: 'personality' })));
                }

                // 2. Academic (Enhanced)
                const academicResult = window.DecisionEngine.Engine.execute('academic', ctx);
                if (academicResult && academicResult.results) {
                    academicResult.results.forEach(r => {
                        r.category = 'academic';
                        // Add Void Diagnosis
                        const voidNotes = [];
                        pillars.slice(0, 4).forEach((p, i) => { if (isBranchVoid(i, p.zhi)) voidNotes.push(`${["年", "月", "日", "时"][i]}支[${p.zhi}]空亡`); });
                        if (voidNotes.length > 0 && r.desc && !r.desc.includes('空亡诊断')) r.desc += `\n\n> [!NOTE]\n> **空亡诊断**：${voidNotes.join('、')}`;
                    });
                    decisionResult.results.push(...academicResult.results);
                }

                // 3. Career
                const careerResult = window.DecisionEngine.Engine.execute('career', ctx);
                if (careerResult?.results?.length > 0) {
                    decisionResult.results.push(...careerResult.results.map(r => ({ ...r, category: 'career' })));
                }

                // 4. Sex Life
                const sexResult = window.DecisionEngine.Engine.execute('sexlife', ctx);
                if (sexResult?.results?.length > 0) {
                    decisionResult.results.push(...sexResult.results.map(r => ({ ...r, category: 'sexlife' })));
                }

                // 5. Children
                const childResult = window.DecisionEngine.Engine.execute('children', ctx);
                if (childResult?.results?.length > 0) {
                    decisionResult.results.push(...childResult.results.map(r => ({ ...r, category: 'children' })));
                }

                // 6. Legal (官非)
                const legalResult = window.DecisionEngine.Engine.execute('legal', ctx);
                if (legalResult?.results?.length > 0) {
                    decisionResult.results.push(...legalResult.results.map(r => ({ ...r, category: 'legal' })));
                }

                // [NOTE] Attitude and others can be added similarly if needed.
            } catch (e) { console.error("Expert Phase 2 Error:", e); }
        }
        if (targetGod !== 'MASTER') {
            if (instances.some(i => i.pIdx < 4 && i.type === 'STEM')) natalParts.push(`${targetGod}显露`); else if (instances.some(i => i.pIdx < 4 && i.type === 'BRANCH' && i.subType === '本气')) natalParts.push(`${targetGod}深藏`); else natalParts.push(`${targetGod}不显`);
        }
        const seenInteractions = new Set();
        allFactsArr.forEach(f => { if (f.includes('冲') || f.includes('刑') || f.includes('害') || f.includes('破') || f.includes('合')) { const match = f.match(/\[(.*?)\]与.*?支\[(.*?)\]/); if (match) { const key = [match[1], match[2]].sort().join('_'); if (seenInteractions.has(key)) return; seenInteractions.add(key); } let effect = ""; if (f.includes('冲') || f.includes('刑')) effect = "致根基动摇"; else if (f.includes('害') || f.includes('破')) effect = "致内部受损"; else if (f.includes('暗合')) effect = f.includes('受制') ? "致能量受损" : (f.includes('被泄') ? "致能量耗泄" : ""); natalParts.push(f.replace(/ \(.*?\)/, '').replace('致根基动摇', '').replace('致内部受损', '').trim() + (effect ? effect : "")); } else if (f.includes('受邻') || f.includes('同柱') || f.includes('越级') || f.includes('坐下') || f.includes('支[') || f.includes('干[')) natalParts.push(f.replace(/ \(.*?\)/, '').replace('贴身', '').replace('正面', '')); });
        if (syRevealed.includes(targetGod)) suiYunParts.push(`${targetGod}在岁运显露 (动态发力)`);
        const allCombined = [...natalRevealed, ...syRevealed, ...natalMainQi, ...syMainQi];
        if (checkGod(targetGod, '财星') && (syRevealed.concat(syMainQi).some(g => checkGod(g, '比劫')))) suiYunParts.push("岁运见比劫夺财" + (allCombined.some(g => checkGod(g, '食伤')) ? "，幸有食伤通关护助" : ""));
        else if (checkGod(targetGod, '官杀') && (syRevealed.concat(syMainQi).some(g => checkGod(g, '食伤')))) suiYunParts.push("岁运伤官见官" + (allCombined.some(g => checkGod(g, '印星')) ? "，得印星化泄护卫" : ""));
        else if (checkGod(targetGod, '印星') && (syRevealed.concat(syMainQi).some(g => checkGod(g, '财星')))) suiYunParts.push("岁运财星坏印" + (allCombined.some(g => checkGod(g, '官杀')) ? "，得官杀化泄生助" : ""));
        else if (checkGod(targetGod, '食伤') && (syRevealed.concat(syMainQi).some(g => checkGod(g, '印星')))) suiYunParts.push("岁运枭神夺食" + (allCombined.some(g => checkGod(g, '比劫')) ? "，得比劫生助抗衡" : ""));
        else if (checkGod(targetGod, '比劫') && (syRevealed.concat(syMainQi).some(g => checkGod(g, '官杀')))) suiYunParts.push("岁运官杀克身" + (allCombined.some(g => checkGod(g, '食伤')) ? "，得食伤合制护卫" : ""));
        let dtSummary = "";
        if (decisionResult && decisionResult.results && decisionResult.results.length > 0) {
            const isAcademicTab = checkGod(targetGod, '印星') || checkGod(targetGod, '食伤'), isWealthTab = checkGod(targetGod, '财星'), isOfficerTab = checkGod(targetGod, '官杀');

            // Collect personality results first
            const personalityTitles = decisionResult.results.filter(r => r.category === 'personality').map(r => r.title);

            let bestRes = (isAcademicTab ? (
                decisionResult.results.filter(r => r._specificTrace?.some(t => t.category === 'academic')).pop() ||
                decisionResult.results.find(r => r.title.includes('学') || r.title.includes('聪'))
            ) : (isWealthTab ? decisionResult.results.find(r => r._specificTrace?.some(t => t.category === 'wealth')) : (isOfficerTab ? decisionResult.results.find(r => r._specificTrace?.some(t => t.category === 'marriage')) : null))) || decisionResult.results[0];

            if (personalityTitles.length > 0) {
                dtSummary = personalityTitles.join(' / ');
            } else {
                dtSummary = bestRes.title || "";
            }
        }
        return {
            natal: natalReports,
            suiYun: suiYunReports,
            target: targetGod,
            substitution: isSubstitution ? `(以偏当正)` : "",
            summary: (dtSummary ? dtSummary + "。" : "") + (suiYunParts.length > 0 ? "进入此岁运，" + Array.from(new Set(suiYunParts)).join('，') : "") + "。",
            decisionTree: decisionResult,
            decisionResult: decisionResult, // Compatibility alias
            patternResults,
            natalParts,
            suiYunParts,
            godStrengthDetails: starDetails // RESTORED PROPERTY
        };
    }

    function get12Stage(stem, branch) {
        const STAGES = { "甲": ["长生", "沐浴", "冠带", "临官", "帝旺", "衰", "病", "死", "墓", "绝", "胎", "养"], "乙": ["死", "病", "衰", "帝旺", "临官", "冠带", "沐浴", "长生", "养", "胎", "绝", "墓"], "丙": ["绝", "胎", "养", "长生", "沐浴", "冠带", "临官", "帝旺", "衰", "病", "死", "墓"], "丁": ["胎", "绝", "墓", "死", "病", "衰", "帝旺", "临官", "冠带", "沐浴", "长生", "养"], "戊": ["绝", "胎", "养", "长生", "沐浴", "冠带", "临官", "帝旺", "衰", "病", "死", "墓"], "己": ["胎", "绝", "墓", "死", "病", "衰", "帝旺", "临官", "冠带", "沐浴", "长生", "养"], "庚": ["病", "死", "墓", "绝", "胎", "养", "长生", "沐浴", "冠带", "临官", "帝旺", "衰"], "辛": ["沐浴", "长生", "养", "胎", "绝", "墓", "死", "病", "衰", "帝旺", "临官", "冠带"], "壬": ["临官", "帝旺", "衰", "病", "死", "墓", "绝", "胎", "养", "长生", "沐浴", "冠带"], "癸": ["帝旺", "临官", "冠带", "沐浴", "长生", "养", "胎", "绝", "墓", "死", "病", "衰"] };
        const branchOrder = ["亥", "子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌"], bIdx = branchOrder.indexOf(branch);
        return (bIdx === -1) ? "" : STAGES[stem][bIdx];
    }

    function getGodStrengthDetails(ctx) {
        if (!ctx || !ctx.gods || ctx.gods.length === 0) return [];

        const godsInChart = new Set();
        ctx.gods.forEach(g => {
            if (g && g.godName) godsInChart.add(g.godName);
        });

        const results = [];
        Array.from(godsInChart).forEach(godName => {
            // Find all instances of this god in the context
            const instances = ctx.getGods(godName);
            if (instances.length === 0) return;

            // Representative node (usually the first one found, preferably a stem or main qi)
            const repNode = instances.find(g => g.isStem) || instances[0];
            const gan = repNode.char; // Assuming char represents the heavenly stem equivalent for the god
            const element = repNode.wx;

            const revealedStems = instances.filter(g => g.isStem && g.pillarIndex < 4);

            const details = {
                god: godName,
                gan: gan,
                element: element,
                isRevealed: revealedStems.length > 0,
                revealedCount: revealedStems.length,
                status: "衰", // Default, evaluate later
                reasons: [],
                impacts: [],
                restrictions: [],
                criteria: { yueLing: null, roots: [], luRen: [] }
            };

            // 1. Check YueLing (Month Branch Main Qi)
            const monthZhiNode = ctx.getGodByIndex(3); // Index 3 is Month Branch Main Qi
            const monthElement = monthZhiNode ? monthZhiNode.wx : null;
            let yueLingStatus = "死";
            if (monthElement && WANG_XIANG[monthElement]) {
                yueLingStatus = Object.keys(WANG_XIANG[monthElement]).find(key => WANG_XIANG[monthElement][key] === element) || "死";
            }
            details.criteria.yueLing = yueLingStatus;

            // Simplified Tomb logic (trusting ctx logic if we expand it later, but keeping basics here)
            if (yueLingStatus === "旺" || yueLingStatus === "相") {
                details.status = "旺";
                details.reasons.push(`得月令 (${yueLingStatus})`);
            }

            // 2. Check Roots and Restrictions based on instances
            let mainQiRootCount = 0, midQiRootCount = 0;
            instances.forEach(g => {
                const pName = ["年", "月", "日", "时", "运", "流"][g.pillarIndex] || "";

                if (!g.isStem) {
                    if (g.isSecondary) {
                        midQiRootCount++;
                        details.criteria.roots.push(`${pName}支中气/余气根`);
                    } else {
                        mainQiRootCount++;
                        details.criteria.roots.push(`${pName}支本气根`);
                    }
                }

                // Gather restrictions directly from the node
                if (g.isBroken()) {
                    const rStr = `[${pName}${g.isStem ? '干' : '支'}]受制或逢空`;
                    if (!details.restrictions.includes(rStr)) {
                        details.restrictions.push(rStr);
                        details.impacts.push({ type: '受制', detail: rStr, isNegative: true, scope: g.isStem ? 'STEM' : 'ROOT' });
                    }
                }
            });

            // 3. Status Evaluation
            if (mainQiRootCount >= 1 && !details.reasons.includes("原局有本气根")) { details.status = "旺"; details.reasons.push("原局有本气根"); }
            if (midQiRootCount >= 2 && !details.reasons.includes("原局有两个以上中气根")) { details.status = "旺"; details.reasons.push("原局有两个以上中气根"); }

            if (details.status === "衰") {
                if (details.isRevealed && details.criteria.roots.length === 0) details.reasons.push("天干虚浮，地支无根");
                else if (details.criteria.roots.length === 0) details.reasons.push("地支无根");
                else details.reasons.push("根气不足，不入旺格");
            }

            // 4. Expert Flags Integration (from any instance, they should be synced)
            // Use the representative node's yong/ji status
            details.isYongShen = repNode.isYong;
            details.isJiShen = repNode.isJi;
            details.isXiShen = !repNode.isYong && !repNode.isJi; // Simplified XiShen

            const hasNeg = details.impacts.some(i => i.isNegative);
            const isStrong = details.status === '旺' || details.reasons.some(r => r.includes('旺') || r.includes('根'));

            if (details.isYongShen || details.isXiShen) {
                details.starQuality = hasNeg ? '受损' : (isStrong ? '清粹' : '力弱');
            } else if (details.isJiShen) {
                details.starQuality = hasNeg ? '有制' : (isStrong ? '无制' : '衰减');
            } else {
                details.starQuality = '中性';
            }

            results.push(details);
        });

        return results;
    }

    function getPillarStrengthDetails(arg) {
        const ctx = arg?.ctx || arg;
        if (!ctx || !ctx.gods || ctx.gods.length === 0) {
            console.warn("getPillarStrengthDetails: No context or gods found", arg);
            return [];
        }

        const positions = [
            { pIdx: 0, type: 'gan', label: '年干' },
            { pIdx: 0, type: 'zhi', label: '年支' },
            { pIdx: 1, type: 'gan', label: '月干' },
            { pIdx: 1, type: 'zhi', label: '月支' },
            { pIdx: 2, type: 'zhi', label: '日支' },
            { pIdx: 3, type: 'gan', label: '时干' },
            { pIdx: 3, type: 'zhi', label: '时支' }
        ];

        const pillars = ctx.pillars;
        const dayKW = calculateKW(pillars[2]?.gan, pillars[2]?.zhi) || [];
        const yearKW = calculateKW(pillars[0]?.gan, pillars[0]?.zhi) || [];

        const monthZhi = pillars[1]?.zhi;
        const monthWX = monthZhi ? WU_XING[monthZhi] : null;

        return positions.map(pos => {
            const nodeIdx = (pos.pIdx * 2) + (pos.type === 'gan' ? 0 : 1);
            const mainNode = ctx.getGodByIndex(nodeIdx);

            if (!mainNode || !mainNode.char) return null;

            // 1. Calculate YueLing Status
            let yueLingStatus = null;
            if (monthWX) {
                yueLingStatus = Object.keys(WANG_XIANG[monthWX]).find(k => WANG_XIANG[monthWX][k] === mainNode.wx);
            }

            // 2. Calculate Specific Restrictions (Clashes, Combinations, etc.)
            const interactions = ctx.raw.interactions || { stems: [], branches: [] };
            const myChar = mainNode.char;
            const myZhi = pillars[pos.pIdx]?.zhi;
            const resDetails = [];

            if (pos.type === 'gan') {
                interactions.stems.forEach(s => { if (s.includes(myChar)) resDetails.push(s); });
            } else {
                interactions.branches.forEach(b => { if (b.includes(myZhi)) resDetails.push(b); });
            }

            // Check for KongWang in restrictions too
            const isKW = (pos.pIdx === 2 && yearKW.includes(myZhi)) || (pos.pIdx !== 2 && dayKW.includes(myZhi));
            if (isKW) resDetails.push("逢空亡");

            // Collect all gods for this position
            const godsList = [mainNode];
            if (pos.type === 'zhi') {
                ctx.gods.forEach((g, i) => {
                    // Hidden stems now start at index 12+
                    if (g && i >= 12 && g.pillarIndex === pos.pIdx && !g.isStem && g.isSecondary) {
                        godsList.push(g);
                    }
                });
            }

            // 3. Gai Tou / Jie Jiao Logic (Specific restrictions within the same pillar)
            const samePillarStem = ctx.gods[pos.pIdx * 2];
            const samePillarBranch = ctx.gods[pos.pIdx * 2 + 1];

            if (samePillarStem && samePillarBranch && samePillarStem.wx && samePillarBranch.wx) {
                const sWX = samePillarStem.wx;
                const bWX = samePillarBranch.wx;
                const rel = WX_RELATION[sWX] ? WX_RELATION[sWX][bWX] : null;

                if (pos.type === 'gan' && WX_RELATION[bWX][sWX] === '克') {
                    resDetails.push(`截脚 (${samePillarBranch.char}克${samePillarStem.char})`);
                } else if (pos.type === 'zhi' && rel === '克') {
                    resDetails.push(`盖头 (${samePillarStem.char}克${samePillarBranch.char})`);
                }
            }

            const godsMap = godsList.map((g, i) => {
                let qType = '主气';
                let reason = g.isWang() ? '旺相' : '衰弱';

                if (!g.isStem) {
                    if (i === 0) {
                        qType = '主气';
                        reason = '地支本气';
                    } else if (i === 1) {
                        qType = '中气';
                        reason = g.isWang() ? '中气根足' : '中气微弱';
                    } else {
                        qType = '余气';
                        reason = g.isWang() ? '余气得生' : '余气微弱';
                    }
                } else if (g.isStem) {
                    reason = g.isWang() ? "透干有力" : "天干虚浮";
                }

                return {
                    god: g.godName,
                    char: g.char,
                    type: pos.type === 'gan' ? '主气' : qType,
                    status: g.strength,
                    reason: reason,
                    isYongShen: g.isYong,
                    isXiShen: !g.isYong && !g.isJi,
                    isJiShen: g.isJi
                };
            });

            const item = {
                label: pos.label,
                char: mainNode.char,
                element: mainNode.wx,
                gods: godsMap,
                isRestricted: mainNode.isBroken() || isKW || resDetails.length > 0,
                restrictionDetails: resDetails,
                yueLing: yueLingStatus,
                status: mainNode.strength,
                reasons: [mainNode.isWang() ? '得势' : '失势'],
                isYongShen: mainNode.isYong,
                isJiShen: mainNode.isJi,
                mainGod: mainNode.godName
            };

            if (pos.label === '月支') item.reasons.push('月令当权');

            return item;
        }).filter(Boolean);
    }

    function calculateOOBodyStrength(ctx) {
        if (!ctx || !ctx.gods || ctx.gods.length === 0) return { level: '中和', percentage: 50, score: 50, max: 100, profile: [], isGuanYin: false, logs: [] };

        const dmNode = ctx.dayMasterNode;
        if (!dmNode) return { level: '中和', percentage: 50, score: 50, max: 100, profile: [], isGuanYin: false, logs: [] };

        const dmWx = dmNode.wx;

        // 1. Pre-calculate the base denominator and weights for natal pillars
        const weights = { 0: 10, 1: 45, 2: 20, 3: 15 };
        const stemWeight = 10;
        let natalTotalMax = 0;

        // ONLY loop through natal primary nodes (Indices 0-7)
        for (let i = 0; i < 8; i++) {
            const g = ctx.gods[i];
            if (!g || !g.category) continue;

            let weight = g.isStem ? stemWeight : (weights[g.pillarIndex] || 0);
            if (!g.isStem) {
                if (g.isKongWang) weight *= 0.3;
            } else {
                if (window.isPillarVoid && window.isPillarVoid(g.pillarIndex, ctx.raw.pillars)) {
                    weight *= 0.3;
                }
            }
            natalTotalMax += weight;
        }

        // 2. Evaluation Helper
        const evaluateStrength = (targetWx, includeStructuralBonuses = false) => {
            let totalScore = 0;
            let rawWeight = 0;
            const elementLogs = [];

            // ONLY loop through natal primary nodes (Indices 0-7)
            for (let i = 0; i < 8; i++) {
                const g = ctx.gods[i];
                if (!g || !g.category) continue;

                let weight = g.isStem ? stemWeight : (weights[g.pillarIndex] || 0);
                if (!g.isStem) {
                    if (g.isKongWang) weight *= 0.3;
                } else {
                    if (window.isPillarVoid && window.isPillarVoid(g.pillarIndex, ctx.raw.pillars)) {
                        weight *= 0.3;
                    }
                }

                if (g.wx === targetWx) rawWeight += weight;

                const rel = WX_RELATION[targetWx]?.[g.wx];
                if (rel === '同' || rel === '被生') {
                    totalScore += weight;
                    // Month command double count
                    if (g.pillarIndex === 1 && !g.isStem) {
                        totalScore += weight;
                        if (includeStructuralBonuses) elementLogs.push("月令同党：二次加倍得分 (得令强势)");
                    }
                }
            }


            // Day Master specific structural bonuses
            let dmBonusActive = false;
            if (includeStructuralBonuses) {
                const monthZhiNode = ctx.getGodByIndex(3);
                const dayZhiNode = ctx.getGodByIndex(5);
                if (monthZhiNode && dayZhiNode) {
                    const mRel = WX_RELATION[targetWx]?.[monthZhiNode.wx];
                    const dRel = WX_RELATION[targetWx]?.[dayZhiNode.wx];
                    if (mRel === '被克' && dRel === '被生') {
                        dmBonusActive = true;
                        const bonus = natalTotalMax * 0.16;
                        totalScore += bonus;
                        elementLogs.push(`触发“官印相生”结构加分: +${bonus.toFixed(1)}`);
                    }
                }
            }

            const percentage = natalTotalMax > 0 ? Math.round((totalScore / natalTotalMax) * 1000) / 10 : 50;
            return {
                totalScore,
                rawWeight,
                percentage,
                isStrong: percentage > 51.5,
                isGuanYin: dmBonusActive,
                logs: elementLogs
            };
        };

        // 3. Main Result
        const dmResult = evaluateStrength(dmWx, true);
        const level = dmResult.percentage > 51.5 ? '身强' : (dmResult.percentage < 48.5 ? '身弱' : '中和');

        const profile = ['木', '火', '土', '金', '水'].map(el => {
            const res = evaluateStrength(el, false);
            const relToGod = { '同': '比劫', '生': '食伤', '克': '财星', '被克': '官杀', '被生': '印星' };
            return {
                element: el,
                score: res.rawWeight,
                strengthScore: res.totalScore,
                percentage: res.percentage,
                isStrong: res.isStrong,
                tenGod: relToGod[WX_RELATION[dmWx]?.[el]] || ''
            };
        });

        return {
            score: dmResult.totalScore,
            max: natalTotalMax,
            percentage: dmResult.percentage,
            status: level.replace('身', ''),
            level: level.includes('身') ? level : '身' + level,
            profile: profile,
            isGuanYin: dmResult.isGuanYin,
            logs: dmResult.logs
        };
    }


    function calculateOOYongXiJi(ctx, bsResult) {
        if (!ctx) return { mode: '扶抑', yong: '木', xi: '火', ji: '金', reason: '默认' };

        const m = { '木': 0, '火': 1, '土': 2, '金': 3, '水': 4 };
        const rev = Object.keys(m);
        const dmWx = ctx.dayMasterNode?.wx || '木';
        const di = m[dmWx];

        const same = dmWx, output = rev[(di + 1) % 5], wealth = rev[(di + 2) % 5], official = rev[(di + 3) % 5], seal = rev[(di + 4) % 5];
        const profile = bsResult.profile || [];
        const scores = {};
        profile.forEach(p => scores[p.element] = p.score);

        const mz = ctx.getGodByIndex(3)?.char;

        if (['巳', '午', '未'].includes(mz) && (scores['水'] || 0) < 30) return { mode: '调候', yong: '水', xi: '金', ji: '火', reason: '夏生调候取水' };
        if (['亥', '子', '丑'].includes(mz) && (scores['火'] || 0) < 30) return { mode: '调候', yong: '火', xi: '木', ji: '水', reason: '冬生调候取火' };

        const statusLabel = bsResult.status || '';
        if (statusLabel.includes('强')) return { mode: '扶抑', yong: output, xi: wealth, ji: seal, reason: '身强取食伤财星' };
        if (statusLabel.includes('弱')) {
            if ((scores[official] || 0) > ((scores[wealth] || 0) + (scores[output] || 0))) {
                return { mode: '扶抑', yong: seal, xi: same, ji: wealth, reason: '身弱杀重取印化煞' };
            }
            return { mode: '扶抑', yong: seal, xi: same, ji: wealth, reason: '身弱优先取印绶生身' };
        }
        return { mode: '扶抑', yong: output, xi: wealth, ji: seal, reason: '平和取泄耗' };
    }

    return {
        getExpertReport,
        getGodStrengthDetails,
        getPillarStrengthDetails,
        calculateOOBodyStrength,
        calculateOOYongXiJi
    };
})();
