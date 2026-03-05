// import { analyzeRisks, getFutureRiskYears } from './life_death_logic.js';
// import { Lunar, Solar, LunarYear } from 'lunar-javascript';

// === Dynamic Logic State ===
// Globals are now window.*
// let calculateBazi...

// GAN, ZHI provided by bazi_logic.js or window scope

// === State ===
// === State ===
let currentData = null;

// === Constants ===
// === Constants ===
// GAN, ZHI provided by bazi_logic.js
// const GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
// const ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

function div(className) {
    const d = document.createElement('div');
    if (className) d.className = className;
    return d;
}

window.logDebug = function (msg, obj = null) {
    if (obj) {
        console.log(msg, obj);
    } else {
        console.log(msg);
    }
};

// === DOM Elements (Initialized in initUI) ===
let navTabs, viewSections, inputModeSelect, dateModeContainer, manualModeContainer;
let calTypeSelect, leapContainer, chkLeap, btnOpenPicker, lblDateTitle, btnCalc;
let hYear, hMonth, hDay, hHour, hMin;
let pickerModal, pickerCancel, pickerClose, pickerConfirm;
let wheelYear, wheelMonth, wheelDay, wheelHour, wheelMin;
let headerDate, chartGrid, interStems, interBranches, dayunList;
let btnSave, btnLoad, loadModal, loadCancel, recordList;
let saveModal, saveModalCancel, saveModalConfirm, saveNameInput;

// === Picker Logic ===
const ITEM_HEIGHT = 40;

function createWheel(container, start, end, pad = false, suffix = '') {
    if (!container) return;
    container.innerHTML = '';
    // ... (rest of createWheel is fine, just needs container check)
    const topSpacer = document.createElement('div');
    topSpacer.className = 'picker-spacer';
    container.appendChild(topSpacer);

    const onScroll = () => {
        const idx = Math.round(container.scrollTop / ITEM_HEIGHT);
        const items = container.querySelectorAll('.picker-item');
        items.forEach((it, i) => {
            if (i === idx) it.classList.add('selected');
            else it.classList.remove('selected');
        });
    };
    container.onscroll = onScroll;

    for (let i = start; i <= end; i++) {
        const item = document.createElement('div');
        item.className = 'picker-item';
        let txt = pad && i < 10 ? '0' + i : i;
        item.textContent = txt + suffix;
        item.dataset.val = i;

        item.addEventListener('click', () => {
            container.scrollTo({
                top: (i - start) * ITEM_HEIGHT,
                behavior: 'smooth'
            });
        });

        container.appendChild(item);
    }

    const botSpacer = document.createElement('div');
    botSpacer.className = 'picker-spacer';
    container.appendChild(botSpacer);
}

function scrollToVal(container, val, start) {
    if (!container) return;
    const idx = val - start;
    container.scrollTop = idx * ITEM_HEIGHT;
    setTimeout(() => {
        if (container.onscroll) container.onscroll();
    }, 10);
}

function getScrollVal(container, start) {
    if (!container) return start;
    const idx = Math.round(container.scrollTop / ITEM_HEIGHT);
    return start + idx;
}

// === Init ===
window.initUI = function () {
    console.log("Initializing UI: Start...");

    // 1. Initialize DOM Elements
    console.log("Initializing UI: Step 1 (DOM Elements)...");
    navTabs = document.querySelectorAll('.nav-tab');
    viewSections = document.querySelectorAll('.view-section');

    inputModeSelect = document.getElementById('input-mode');
    dateModeContainer = document.getElementById('date-mode-container');
    manualModeContainer = document.getElementById('manual-mode-container');

    calTypeSelect = document.getElementById('cal-type');
    leapContainer = document.getElementById('leap-container');
    chkLeap = document.getElementById('chk-leap');
    btnOpenPicker = document.getElementById('btn-open-picker');
    lblDateTitle = document.getElementById('lbl-date-title');
    btnCalc = document.getElementById('btn-calc');

    hYear = document.getElementById('h-year');
    hMonth = document.getElementById('h-month');
    hDay = document.getElementById('h-day');
    hHour = document.getElementById('h-hour');
    hMin = document.getElementById('h-min');

    pickerModal = document.getElementById('picker-modal');
    pickerCancel = document.getElementById('picker-cancel');
    pickerClose = document.getElementById('picker-close');
    pickerConfirm = document.getElementById('picker-confirm');

    wheelYear = document.getElementById('wheel-year');
    wheelMonth = document.getElementById('wheel-month');
    wheelDay = document.getElementById('wheel-day');
    wheelHour = document.getElementById('wheel-hour');
    wheelMin = document.getElementById('wheel-min');

    headerDate = document.getElementById('header-date');
    chartGrid = document.getElementById('chart-grid');
    interStems = document.getElementById('inter-stems');
    interBranches = document.getElementById('inter-branches');
    dayunList = document.getElementById('dayun-list');

    btnSave = document.getElementById('btn-save');
    btnLoad = document.getElementById('btn-load');
    loadModal = document.getElementById('load-modal');
    loadCancel = document.getElementById('load-cancel');
    recordList = document.getElementById('record-list');

    // Save Modal Elements
    saveModal = document.getElementById('save-modal');
    saveModalCancel = document.getElementById('save-modal-cancel');
    saveModalConfirm = document.getElementById('save-modal-confirm');
    saveNameInput = document.getElementById('save-name-input');

    if (!btnOpenPicker) {
        console.error("Critical Error: btn-open-picker not found in DOM!");
    } else {
        console.log("btn-open-picker found.");
    }

    if (btnLoad) {
        console.log("btn-load found, attaching listener...");
        btnLoad.onclick = () => {
            console.log("Read Record button clicked.");
            let saved = [];
            try {
                saved = JSON.parse(localStorage.getItem('bazi_records') || '[]');
            } catch (e) {
                console.error("LocalStorage access failed:", e);
            }
            if (saved.length === 0) {
                alert("暂无保存记录");
                return;
            }
            renderRecordList(saved);
            if (loadModal) loadModal.style.display = 'flex';
        };
        console.log("btn-load listener attached.");
    } else {
        console.warn("Warning: btn-load not found in DOM.");
    }

    // 2. Tab Logic
    navTabs.forEach((tab, index) => {
        tab.addEventListener('click', () => {
            switchTab(index);
        });
    });

    // 3. Input Mode Logic
    if (inputModeSelect) {
        inputModeSelect.addEventListener('change', (e) => {
            if (e.target.value == 0) {
                dateModeContainer.style.display = 'block';
                manualModeContainer.style.display = 'none';
            } else {
                dateModeContainer.style.display = 'none';
                manualModeContainer.style.display = 'block';
            }
        });
    }

    // 4. Calendar Type Logic
    if (calTypeSelect) {
        calTypeSelect.addEventListener('change', (e) => {
            if (e.target.value == 1) { // Lunar
                leapContainer.style.display = 'flex';
                lblDateTitle.textContent = '农历日期:';
            } else {
                leapContainer.style.display = 'none';
                lblDateTitle.textContent = '公历日期:';
            }
        });
    }

    // 5. Initial Wheels
    const now = new Date();
    createWheel(wheelYear, 1900, 2100, false, '年');
    createWheel(wheelMonth, 1, 12, true, '月');
    createWheel(wheelDay, 1, 31, true, '日');
    createWheel(wheelHour, 0, 23, true, '时');
    createWheel(wheelMin, 0, 59, true, '分');

    // Default Values
    if (hYear && !hYear.value) hYear.value = now.getFullYear();
    if (hMonth && !hMonth.value) hMonth.value = now.getMonth() + 1;
    if (hDay && !hDay.value) hDay.value = now.getDate();
    if (hHour && !hHour.value) hHour.value = now.getHours();
    if (hMin && !hMin.value) hMin.value = now.getMinutes();

    // 4.1 Unknown Hour Logic
    const chkUnknownHour = document.getElementById('chk-unknown-hour');
    if (chkUnknownHour) {
        chkUnknownHour.addEventListener('change', () => {
            updateButtonText();
        });
    }

    updateButtonText();

    // 6. Picker Modal Logic
    if (btnOpenPicker) {
        btnOpenPicker.addEventListener('click', () => {
            console.log("Opening Picker Modal");
            if (pickerModal) pickerModal.style.display = 'flex';

            setTimeout(() => {
                if (hYear) scrollToVal(wheelYear, parseInt(hYear.value), 1900);
                if (hMonth) scrollToVal(wheelMonth, parseInt(hMonth.value), 1);
                if (hDay) scrollToVal(wheelDay, parseInt(hDay.value), 1);
                if (hHour) scrollToVal(wheelHour, parseInt(hHour.value), 0);
                if (hMin) scrollToVal(wheelMin, parseInt(hMin.value), 0);
            }, 10);
        });
    }

    if (pickerCancel) {
        pickerCancel.addEventListener('click', () => {
            pickerModal.style.display = 'none';
        });
    }

    // Closer for X button
    if (pickerClose) {
        pickerClose.addEventListener('click', () => {
            pickerModal.style.display = 'none';
        });
    }

    if (pickerConfirm) {
        pickerConfirm.addEventListener('click', () => {
            if (hYear) hYear.value = getScrollVal(wheelYear, 1900);
            if (hMonth) hMonth.value = getScrollVal(wheelMonth, 1);
            if (hDay) hDay.value = getScrollVal(wheelDay, 1);
            if (hHour) hHour.value = getScrollVal(wheelHour, 0);
            if (hMin) hMin.value = getScrollVal(wheelMin, 0);
            updateButtonText();
            pickerModal.style.display = 'none';
        });
    }

    // 7. Select Modal Logic & Manual Selects
    const selectModal = document.getElementById('select-modal');
    const selectCancel = document.getElementById('select-cancel');

    if (selectCancel) {
        selectCancel.addEventListener('click', () => {
            selectModal.style.display = 'none';
        });
    }
    if (selectModal) {
        selectModal.addEventListener('click', (e) => {
            if (e.target === selectModal) selectModal.style.display = 'none';
        });
    }

    if (btnCalc) {
        btnCalc.addEventListener('click', startCalculation);
    }

    initManualSelectors();
    initActivationLogic();
    setupSaveLoad();
};

function initActivationLogic() {
    const btnOpenActivation = document.getElementById('btn-open-activation');
    const activationModal = document.getElementById('activation-modal');
    const activationCancel = document.getElementById('activation-cancel');
    const btnVerify = document.getElementById('btn-verify-activation');
    const activationInput = document.getElementById('activation-input');
    const activationStatus = document.getElementById('activation-status');

    if (btnOpenActivation) {
        btnOpenActivation.onclick = () => {
            activationModal.style.display = 'flex';
            activationStatus.textContent = '';
            activationStatus.style.color = '';
        };
    }

    if (activationCancel) {
        activationCancel.onclick = () => {
            activationModal.style.display = 'none';
        };
    }

    if (btnVerify) {
        btnVerify.onclick = async () => {
            const code = activationInput.value.trim();
            if (!code) return;

            btnVerify.disabled = true;
            btnVerify.textContent = '验证中...';
            activationStatus.textContent = '正在联机验证...';
            activationStatus.style.color = '#aaa';

            try {
                const res = await fetch('/api/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code })
                });
                const data = await res.json();

                if (data.success) {
                    localStorage.setItem('sanbanfu_activated', 'true');
                    localStorage.setItem('sanbanfu_token', data.token);
                    activationStatus.textContent = '激活成功！已解锁高级功能。';
                    activationStatus.style.color = '#2ecc71';
                    setTimeout(() => {
                        activationModal.style.display = 'none';
                    }, 1500);
                } else {
                    activationStatus.textContent = '验证失败：' + (data.error || '无效的校验码');
                    activationStatus.style.color = '#e74c3c';
                }
            } catch (err) {
                activationStatus.textContent = '连接服务器失败，请检查网络';
                activationStatus.style.color = '#e74c3c';
            } finally {
                btnVerify.disabled = false;
                btnVerify.textContent = '验证激活';
            }
        };
    }

    console.log("Initializing UI: Complete.");
}

// Auto Start
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.initUI);
} else {
    window.initUI();
}

function initManualSelectors() {
    // Populate Manual Mode Selects
    const pairs = [
        ['mz-y-gan', 'mz-y-zhi'],
        ['mz-m-gan', 'mz-m-zhi'],
        ['mz-d-gan', 'mz-d-zhi'],
        ['mz-t-gan', 'mz-t-zhi']
    ];

    pairs.forEach(pair => {
        const selGan = document.getElementById(pair[0]);
        const selZhi = document.getElementById(pair[1]);
        const isHour = pair[0] === 'mz-t-gan';

        if (selGan && selZhi) {
            selGan.innerHTML = '';

            // Add "Unknown" option for Hour Pillar
            if (isHour) {
                const opt = document.createElement('option');
                opt.value = 'unknown';
                opt.textContent = '不详';
                selGan.appendChild(opt);
            }

            GAN.forEach(g => {
                const opt = document.createElement('option');
                opt.value = g;
                opt.textContent = g;
                selGan.appendChild(opt);
            });

            const updateZhi = () => {
                // SPECIAL CHECK: Unknown
                if (isHour && selGan.value === 'unknown') {
                    selZhi.innerHTML = '';
                    const opt = document.createElement('option');
                    opt.value = 'unknown';
                    opt.textContent = '不详';
                    selZhi.appendChild(opt);
                    selZhi.disabled = true;
                    selZhi.style.backgroundColor = '#333';
                    selZhi.style.color = '#777';
                    return;
                } else {
                    selZhi.disabled = false;
                    selZhi.style.backgroundColor = '';
                    selZhi.style.color = '';
                }

                const gIdx = GAN.indexOf(selGan.value);
                const gParity = gIdx % 2;
                const oldVal = selZhi.value;
                selZhi.innerHTML = '';
                ZHI.forEach((z, zIdx) => {
                    if (zIdx % 2 === gParity) {
                        const opt = document.createElement('option');
                        opt.value = z;
                        opt.textContent = z;
                        selZhi.appendChild(opt);
                    }
                });
                // Try to restore old value if it still exists
                if (Array.from(selZhi.options).some(o => o.value === oldVal)) {
                    selZhi.value = oldVal;
                }
            };

            selGan.addEventListener('change', updateZhi);
            updateZhi(); // Initialize
        }
    });
}

function switchTab(index) {
    if (!navTabs[index] || !viewSections[index]) return;

    navTabs.forEach(t => t.classList.remove('active'));
    viewSections.forEach(v => v.style.display = 'none');

    navTabs[index].classList.add('active');
    const view = viewSections[index];

    // Handle Date Header Bar
    const dateBar = document.getElementById('date-bar');
    if (dateBar) {
        if (index === 0) {
            dateBar.style.display = 'none';
        } else {
            if (currentData) {
                dateBar.style.display = 'block';
            } else {
                dateBar.style.display = 'none';
            }
        }
    }

    if (index === 1 || index === 2 || index === 3 || index === 4) {
        view.style.display = 'flex';
        view.style.flexDirection = 'column';
        view.style.alignItems = 'stretch';
    } else {
        view.style.display = 'flex';
    }

    if (index === 4) {
        if (!window.TreeViewerInitialized) {
            if (window.TreeViewer) {
                window.TreeViewer.init();
                window.TreeViewerInitialized = true;
                // Ensure auto-navigation starts after initialization
                if (window.TreeViewer.autoSelectNodes) {
                    window.TreeViewer.autoSelectNodes();
                }
            }
        } else {
            // Already initialized, just refresh selection
            if (window.TreeViewer && window.TreeViewer.autoSelectNodes) {
                window.TreeViewer.autoSelectNodes();
            }
        }
    }
}

function updateButtonText() {
    const y = hYear.value;
    const m = String(hMonth.value).padStart(2, '0');
    const d = String(hDay.value).padStart(2, '0');
    const h = String(hHour.value).padStart(2, '0');
    const mi = String(hMin.value).padStart(2, '0');

    if (btnOpenPicker) {
        const isUnknown = document.getElementById('chk-unknown-hour')?.checked;
        if (isUnknown) {
            btnOpenPicker.textContent = `${y}-${m}-${d} (时辰未知)`;
        } else {
            btnOpenPicker.textContent = `${y}-${m}-${d} ${h}:${mi}`;
        }
    }
}

function startCalculation() {
    const gender = document.getElementById('gender-input').value; // '1' male, '0' female

    if (inputModeSelect.value == 1) {
        // Manual Mode
        const selects = document.querySelectorAll('#manual-mode-container select');
        const gz = Array.from(selects).map(s => s.value);
        // gz: [yg, yz, mg, mz, dg, dz, hg, hz]

        // Search for Date
        const searchGz = gz.map(v => v === 'unknown' ? '' : v);
        const isManualUnknown = gz[6] === 'unknown';

        const found = findDateFromBazi(
            searchGz[0], searchGz[1], searchGz[2], searchGz[3],
            searchGz[4], searchGz[5], searchGz[6], searchGz[7],
            2000 // Ref Year
        );

        if (found && found.length > 1) {
            // Multiple Matches -> Show Modal
            const modal = document.getElementById('select-modal');
            const list = document.getElementById('select-list');
            list.innerHTML = '';

            found.forEach(f => {
                const item = document.createElement('div');
                item.style.padding = '15px';
                item.style.borderBottom = '1px solid #333';
                item.style.cursor = 'pointer';
                item.style.color = '#fff';
                // item.textContent = `${f.year}年${f.month}月${f.day}日 ${f.hour}点`;
                // Add Weekday?
                const d = new Date(f.year, f.month - 1, f.day);
                const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
                item.textContent = `${f.year}-${String(f.month).padStart(2, '0')}-${String(f.day).padStart(2, '0')} (${week}) ${String(f.hour).padStart(2, '0')}:00`;

                item.addEventListener('click', () => {
                    modal.style.display = 'none';
                    const dateObj = new Date(f.year, f.month - 1, f.day, f.hour, 0);
                    finishCalculation(dateObj, gender, null, isManualUnknown);
                });

                list.appendChild(item);
            });

            modal.style.display = 'flex';
            return; // Wait for user selection

        } else if (found && found.length === 1) {
            // Single Match -> Auto Use
            const f = found[0];
            const dateObj = new Date(f.year, f.month - 1, f.day, f.hour, 0);
            finishCalculation(dateObj, gender, null, isManualUnknown);
        } else {
            // 0 matches found
            // User requested simple logic: Just error if no date found. No complex validation needed.
            showModalError("未找到匹配日期 (1900-2100年)\n请确认输入的八字是否真实存在。\n\n(提示：某些特殊的干支组合在一百年内可能确实不存在)");
            return;
        }

    } else {
        // ... Date Mode (Existing) ...
        const y = parseInt(hYear.value);
        const m = parseInt(hMonth.value);
        const day = parseInt(hDay.value);
        const h = parseInt(hHour.value);
        const min = parseInt(hMin.value);

        let finalDate;
        if (calTypeSelect.value == 1) { // Lunar
            try {
                const lunar = Lunar.fromYmdHms(y, m, day, h, min, 0);
                if (chkLeap.checked) {
                    // Logic to find leap month if any.
                    // For now assume if user checked leap, it's correct.
                }
                const solar = lunar.getSolar();
                finalDate = new Date(solar.getYear(), solar.getMonth() - 1, solar.getDay(), solar.getHour(), solar.getMinute());
            } catch (e) {
                alert("农历日期非法");
                return;
            }
        } else {
            finalDate = new Date(y, m - 1, day, h, min);
        }
        finishCalculation(finalDate, gender);
    }
}

function finishCalculation(finalDate, gender, manualGZ = null, unknownOverride = null) {
    const isUnknown = unknownOverride !== null ? unknownOverride : (document.getElementById('chk-unknown-hour')?.checked || false);
    currentData = calculateBazi(finalDate, gender, manualGZ, isUnknown);
    if (!currentData) {
        alert("排盘失败，请检查输入");
        return;
    }
    if (typeof BaziProcessor !== 'undefined') {
        currentData.ctx = BaziProcessor.createContext(currentData);
    }
    window.currentData = currentData;
    window.TreeViewerInitialized = false; // Force Tree reset on next tab switch
    renderResult(currentData);
    switchTab(1);
}

// === Rendering ===
function renderResult(data) {
    headerDate.textContent = `${data.solarDate} | ${data.lunarDate}`;
    renderPillars(data);

    // Split Interactions Logic
    const dy = data.currentDaYun;
    const ln = data.selectedLiuNian || (dy ? dy.liuNian.find(l => l.year === getSpecificBaziYear(new Date())) : null);

    // Ensure data has these for View 3
    data.currentDaYun = dy;
    data.selectedLiuNian = ln;

    renderInteractionsSplit(data.interactions, [dy, ln]);
    renderDaYun(data);
    renderDetailedView(data);
    renderView3(data);

    // Auto-select Tree Nodes
    if (window.TreeViewer) {
        window.TreeViewerInitialized = false; // Reset flag to force fresh setup
        if (typeof window.TreeViewer.reset === 'function') {
            window.TreeViewer.reset();
        }
        if (typeof window.TreeViewer.autoSelectNodes === 'function') {
            window.TreeViewer.autoSelectNodes();
        }
    }
}

function renderDetailedView(data) {
    const container = document.getElementById('view-2');
    if (!container) return;
    container.innerHTML = '';
    container.style.display = 'none'; // Controlled by tab switch
    container.style.flexDirection = 'column';
    container.style.alignItems = 'stretch';
    container.style.padding = '20px';
    container.style.justifyContent = 'flex-start'; // Override 'center'
    container.style.overflowY = 'auto'; // Enable scroll

    // --- Expert Mode: Interactive Diagnostic ---
    const expertBox = document.createElement('div');
    expertBox.className = 'expert-container';

    const title = document.createElement('div');
    title.textContent = "专家模式：动态要素诊断";
    title.style.fontWeight = 'bold';
    title.style.color = '#fff';
    title.style.textAlign = 'center';
    expertBox.appendChild(title);

    // Toggle Row
    const toggleRow = document.createElement('div');
    toggleRow.className = 'expert-toggle-row';

    const iosSwitch = document.createElement('div');
    iosSwitch.className = 'ios-switch';
    iosSwitch.dataset.state = "正";
    iosSwitch.innerHTML = `
        <div class="switch-option active" data-val="正">正</div>
        <div class="switch-option" data-val="偏">偏</div>
        <div class="switch-handle"></div>
    `;

    toggleRow.appendChild(iosSwitch);
    expertBox.appendChild(toggleRow);

    // Chips Row
    const chipsContainer = document.createElement('div');
    chipsContainer.className = 'expert-chips-container';
    const categories = ["财星", "官杀", "印星", "食伤", "比劫"];
    const catMap = {
        "财星": ["正财", "偏财"],
        "官杀": ["正官", "七杀"],
        "印星": ["正印", "偏印"],
        "食伤": ["食神", "伤官"],
        "比劫": ["比肩", "劫财"]
    };

    let activeCat = "财星";

    categories.forEach(cat => {
        const chip = document.createElement('div');
        chip.className = 'expert-chip';
        if (cat === activeCat) chip.classList.add('active');
        chip.textContent = cat;
        chip.onclick = () => {
            chipsContainer.querySelectorAll('.expert-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            activeCat = cat;
            updateReport();
        };
        chipsContainer.appendChild(chip);
    });
    expertBox.appendChild(chipsContainer);

    // Report Area
    const reportArea = document.createElement('div');
    reportArea.className = 'expert-report';
    expertBox.appendChild(reportArea);

    const updateReport = () => {
        const isPian = iosSwitch.dataset.state === "偏";
        const god = catMap[activeCat][isPian ? 1 : 0];

        const result = window.AnalysisEngine.getExpertReport(god, data); // Corrected order: god, then context-holding data
        if (!result) {
            reportArea.innerHTML = '<div style="color:#666; font-size:12px; text-align:center;">暂无分析数据</div>';
            return;
        }

        reportArea.innerHTML = '';

        if (result.summary) {
            const sumBox = document.createElement('div');
            sumBox.className = 'expert-summary';
            sumBox.style = "background: rgba(255, 107, 0, 0.1); color: #ff6b00; border-left: 3px solid #ff6b00; padding: 10px; margin-bottom: 12px; font-size: 14px; font-weight: bold; border-radius: 4px;";
            sumBox.textContent = `核心格局：${result.summary}`;
            reportArea.appendChild(sumBox);
        }

        // [NEW] Render Decision Tree Path
        if (result.decisionTree) {
            const treeBox = document.createElement('div');
            treeBox.className = 'decision-tree-container';
            treeBox.style = "background: rgba(0,0,0,0.3); padding: 10px; margin-bottom: 12px; border-radius: 4px; border: 1px dashed #555;";

            const treeTitle = document.createElement('div');
            treeTitle.textContent = "逻辑推导路径：";
            treeTitle.style = "color: #bbb; font-size: 12px; margin-bottom: 5px;";
            treeBox.appendChild(treeTitle);

            const steps = document.createElement('div');
            steps.style = "color: #ddd; font-size: 13px; line-height: 1.6; display: none; margin-top: 10px; border-top: 1px solid #444; padding-top: 8px;";

            const toggleBtn = document.createElement('div');
            toggleBtn.innerHTML = '展开逻辑推导过程 <span style="font-size:10px;">▼</span>';
            toggleBtn.style = "color: #ff6b00; font-size: 12px; cursor: pointer; text-align: center; padding: 4px; background: rgba(255,107,0,0.05); border-radius: 4px;";
            toggleBtn.onclick = () => {
                if (steps.style.display === 'none') {
                    steps.style.display = 'block';
                    toggleBtn.innerHTML = '收起逻辑推导过程 <span style="font-size:10px;">▲</span>';
                } else {
                    steps.style.display = 'none';
                    toggleBtn.innerHTML = '展开逻辑推导过程 <span style="font-size:10px;">▼</span>';
                }
            };
            treeBox.appendChild(toggleBtn);

            // Filter traces by active category (Gender-aware mapping)
            const genderRaw = data.gender || '男';
            const isMale = (genderRaw === '1' || genderRaw === 1 || genderRaw === '男');

            let displayCategories = ["personality"];
            if (activeCat === "财星") {
                displayCategories.push("wealth", "academic");
                if (isMale) displayCategories.push("marriage"); // 男命婚姻也是财
            } else if (activeCat === "官杀") {
                displayCategories.push("academic");
                if (!isMale) displayCategories.push("marriage"); // 女命官杀为夫
            } else if (activeCat === "印星") {
                displayCategories.push("academic"); // 学业逻辑主要在印星/食伤
            } else if (activeCat === "食伤") {
                displayCategories.push("academic");
            }

            let displaySteps = result.decisionTree.trace;
            // Only filter if NOT in master synthesis mode
            if (result.target !== 'MASTER') {
                displaySteps = displaySteps.filter(t => displayCategories.some(cat => t.category === cat));
            }

            displaySteps.forEach((step, idx) => {
                const stepLine = document.createElement('div');
                let icon = '✅';
                if (step.decision === false) icon = '✖️';
                if (step.type === 'result') icon = '🏁';

                stepLine.textContent = `${idx + 1}. ${step.text || step.id} ${icon}`;

                if (step.type === 'result') {
                    stepLine.style.color = '#f1c40f'; // Gold for result
                    stepLine.style.marginTop = '5px';
                    stepLine.style.fontWeight = 'bold';
                } else if (step.decision === false) {
                    stepLine.style.color = '#777';
                }

                steps.appendChild(stepLine);
            });

            treeBox.appendChild(steps);
            reportArea.appendChild(treeBox);
        }

        if (result.substitution) {
            const subs = document.createElement('div');
            subs.className = 'subs-note';
            subs.textContent = result.substitution;
            reportArea.appendChild(subs);
        }

        const renderSection = (titleTxt, items) => {
            const sec = document.createElement('div');
            sec.className = 'report-section';
            const t = document.createElement('div');
            t.className = 'report-title';
            t.textContent = titleTxt;
            sec.appendChild(t);

            if (items.length === 0) {
                const empty = document.createElement('div');
                empty.style.color = '#555';
                empty.style.fontSize = '12px';
                empty.textContent = "未发现对应要素";
                sec.appendChild(empty);
            } else {
                items.forEach(inst => {
                    const line = document.createElement('div');
                    line.className = 'report-item';
                    line.textContent = `${inst.pillar}(${inst.pos}): ${inst.facts.join('，')}`;
                    sec.appendChild(line);
                });
            }
            reportArea.appendChild(sec);
        };

        renderSection("第一部分：原局诊断", result.natal);
        renderSection("第二部分：岁运交互", result.suiYun);
    };

    iosSwitch.onclick = () => {
        const newState = iosSwitch.dataset.state === "正" ? "偏" : "正";
        iosSwitch.dataset.state = newState;
        iosSwitch.querySelectorAll('.switch-option').forEach(opt => {
            if (opt.dataset.val === newState) opt.classList.add('active');
            else opt.classList.remove('active');
        });
        updateReport();
    };

    container.appendChild(expertBox);
    updateReport(); // Init

    // --- [NEW] Ten God Strength Details Section ---
    const strengthBox = document.createElement('div');
    strengthBox.className = 'expert-container';
    strengthBox.style.marginTop = '20px';
    strengthBox.style.padding = '15px';

    const sTitle = document.createElement('div');
    sTitle.textContent = "十神旺衰判定详情 (逻辑分析)";
    sTitle.style.fontWeight = 'bold';
    sTitle.style.color = '#fff';
    sTitle.style.textAlign = 'center';
    sTitle.style.marginBottom = '15px';
    strengthBox.appendChild(sTitle);

    const sGrid = document.createElement('div');
    sGrid.style.display = 'grid';
    sGrid.style.gridTemplateColumns = 'repeat(2, 1fr)';
    sGrid.style.gap = '10px';

    let strengthDetails = [];
    try {
        strengthDetails = window.AnalysisEngine.getPillarStrengthDetails(data);
    } catch (e) {
        console.error("Strength Details Render Error:", e);
    }
    if (strengthDetails && strengthDetails.length > 0) {
        strengthDetails.forEach(item => {
            const itemCard = document.createElement('div');
            itemCard.style.background = 'rgba(255, 255, 255, 0.05)';
            itemCard.style.border = '1px solid #444';
            itemCard.style.borderRadius = '6px';
            itemCard.style.padding = '10px';
            itemCard.style.fontSize = '12px';

            const head = document.createElement('div');
            head.style.display = 'flex';
            head.style.justifyContent = 'space-between';
            head.style.marginBottom = '8px';
            head.style.borderBottom = '1px solid #555';
            head.style.paddingBottom = '5px';

            const nameSpan = document.createElement('span');
            nameSpan.innerHTML = `<b style="color:#fff; font-size:14px;">${item.label} [${item.char}]</b>`;

            // Yong/Xi/Ji Shen Badges (Main)
            if (item.isYongShen) {
                const b = document.createElement('span'); b.textContent = "用神"; b.style = "background:#c0392b; color:#fff; font-size:10px; padding:1px 4px; border-radius:3px; margin-left:5px; vertical-align:middle;"; nameSpan.appendChild(b);
            } else if (item.isXiShen) {
                const b = document.createElement('span'); b.textContent = "喜神"; b.style = "background:#e67e22; color:#fff; font-size:10px; padding:1px 4px; border-radius:3px; margin-left:5px; vertical-align:middle;"; nameSpan.appendChild(b);
            } else if (item.isJiShen) {
                const b = document.createElement('span'); b.textContent = "忌神"; b.style = "background:#7f8c8d; color:#fff; font-size:10px; padding:1px 4px; border-radius:3px; margin-left:5px; vertical-align:middle;"; nameSpan.appendChild(b);
            }

            // Restricted Badge
            if (item.isRestricted) {
                const szBadge = document.createElement('span');
                szBadge.textContent = "受制";
                szBadge.style = "background:#e74c3c; color:#fff; font-size:10px; padding:1px 4px; border-radius:3px; margin-left:5px; vertical-align:middle;";
                nameSpan.appendChild(szBadge);
            }

            const statusSpan = document.createElement('span');
            statusSpan.textContent = item.status;
            statusSpan.style.color = item.status === '旺' ? '#2ecc71' : '#e74c3c';
            statusSpan.style.fontWeight = 'bold';
            statusSpan.style.padding = '1px 5px';
            statusSpan.style.borderRadius = '3px';
            statusSpan.style.background = item.status === '旺' ? 'rgba(46, 204, 113, 0.2)' : 'rgba(231, 76, 60, 0.2)';

            head.appendChild(nameSpan);
            head.appendChild(statusSpan);
            itemCard.appendChild(head);

            const list = document.createElement('div');
            list.style.color = '#aaa';
            list.style.lineHeight = '1.6';

            const godsList = document.createElement('div');
            godsList.style.display = 'flex';
            godsList.style.flexDirection = 'column';
            godsList.style.gap = '2px';
            godsList.style.marginBottom = '8px';
            godsList.style.fontSize = '12px';

            item.gods.forEach(g => {
                const gRow = document.createElement('div');
                gRow.style.display = 'flex';
                gRow.style.justifyContent = 'space-between';
                const left = document.createElement('span');
                left.style.color = g.type === '主气' ? '#e67e22' : '#888';
                left.innerText = `${g.god} [${g.char}]`;

                const right = document.createElement('span');
                right.style.color = g.status === '旺' ? '#2ecc71' : '#95a5a6';
                right.style.opacity = '0.8';
                right.innerText = `${g.status} · ${g.reason}`;

                gRow.appendChild(left);

                // Yong/Xi/Ji Badges for Hidden Stems
                if (g.isYongShen) {
                    const b = document.createElement('span'); b.textContent = "用"; b.title = "用神"; b.style = "background:#c0392b; color:#fff; font-size:10px; padding:0px 3px; border-radius:3px; margin-left:4px; vertical-align:middle; cursor:help;"; left.appendChild(b);
                } else if (g.isXiShen) {
                    const b = document.createElement('span'); b.textContent = "喜"; b.title = "喜神"; b.style = "background:#e67e22; color:#fff; font-size:10px; padding:0px 3px; border-radius:3px; margin-left:4px; vertical-align:middle; cursor:help;"; left.appendChild(b);
                } else if (g.isJiShen) {
                    const b = document.createElement('span'); b.textContent = "忌"; b.title = "忌神"; b.style = "background:#7f8c8d; color:#fff; font-size:10px; padding:0px 3px; border-radius:3px; margin-left:4px; vertical-align:middle; cursor:help;"; left.appendChild(b);
                }

                gRow.appendChild(right);
                godsList.appendChild(gRow);
            });
            list.appendChild(godsList);

            if (item.yueLing) {
                list.innerHTML += `<div style="border-top: 1px dotted #444; padding-top:4px;">• 月令: <span style="color:#ddd;">${item.yueLing}</span></div>`;
            }

            if (item.restrictionDetails.length > 0) {
                list.innerHTML += `<div style="color: #e74c3c; margin-top:2px;">• 受制: <span>${item.restrictionDetails.join('，')}</span></div>`;
            }

            if (item.label === '月支') {
                list.innerHTML += `<div style="margin-top:2px; color:#bbb; font-style:italic;">• 特性: 月令当权</div>`;
            }

            itemCard.appendChild(list);
            sGrid.appendChild(itemCard);
        });

        strengthBox.appendChild(sGrid);
        container.appendChild(strengthBox);

        // Spacer
        container.appendChild(document.createElement('br'));

        // 1. Prepare Full Pillars (6 Pillars: Y M D H DY LN)
        const pillars4 = data.pillars;
        let dy = data.currentDaYun;
        let ln = data.selectedLiuNian;
        const nowYear = getSpecificBaziYear(new Date());

        if (!dy) {
            dy = data.daYunList.find(d => nowYear >= d.startYear && nowYear < d.endYear);
        }
        if (dy && !ln) {
            ln = dy.liuNian.find(l => l.year === nowYear);
        }

        const fullPillars = [...pillars4];
        if (dy) fullPillars.push(dy);
        if (ln) fullPillars.push(ln);

        // 2. Analyze Risks (Static / Current Slice)
        const risks = analyzeRisks(fullPillars, data);

        // 3. Forecast Timeline
        const forecast = getFutureRiskYears(data);

        // Group Forecast
        const groupedForecast = {};
        forecast.forEach(f => {
            if (!groupedForecast[f.risk]) groupedForecast[f.risk] = [];
            groupedForecast[f.risk].push(f);
        });

        if (risks.length === 0 && Object.keys(groupedForecast).length === 0) {
            const pan = document.createElement('div');
            pan.textContent = "无显著生死灾祸风险";
            pan.style.textAlign = 'center';
            pan.style.color = '#888';
            container.appendChild(pan);
            return;
        }

        /*
        const warn = document.createElement('div');
        warn.textContent = "⚠️ 检测到以下高危风险 (含未来年份预测)，可能会有生命危险：";
        warn.style.color = '#c0392b';
        warn.style.fontWeight = 'bold';
        warn.style.marginBottom = '10px';
        container.appendChild(warn);
        */

        // Helper: Create Card
        const createCard = (title, desc, prob, category = 'RISK') => {
            const card = document.createElement('div');
            card.className = 'risk-card';

            let bgColor = 'rgba(192, 57, 43, 0.1)';
            let borderColor = '#c0392b';
            let titleColor = '#e74c3c';

            if (category === 'GOOD') {
                bgColor = 'rgba(39, 174, 96, 0.1)';
                borderColor = '#27ae60';
                titleColor = '#2ecc71';
            } else if (category === 'INFO') {
                bgColor = 'rgba(41, 128, 185, 0.1)';
                borderColor = '#2980b9';
                titleColor = '#3498db';
            }

            card.style.background = bgColor;
            card.style.border = `1px solid ${borderColor}`;
            card.style.borderRadius = '8px';
            card.style.padding = '10px';
            card.style.marginBottom = '10px';

            const h = document.createElement('div');
            h.style.fontWeight = 'bold';
            h.style.color = titleColor;
            h.style.marginBottom = '5px';
            h.textContent = title;

            const d = document.createElement('div');
            d.style.color = '#ccc';
            d.style.fontSize = '14px';
            d.innerHTML = desc; // Allow HTML

            card.appendChild(h);
            card.appendChild(d);
            return card;
        };

        // Helper: Format Years
        const formatYears = (items) => {
            // Use Gregorian Year for categorization to avoid "Jan 2026 is still 2025" confusion in labels
            const currentYear = new Date().getFullYear();
            items.sort((a, b) => a.year - b.year);

            const past = items.filter(x => x.year < currentYear);
            const current = items.filter(x => x.year === currentYear);
            const future = items.filter(x => x.year > currentYear);

            const buildStr = (list) => {
                const dyMap = {};
                const others = [];
                list.forEach(x => {
                    if (['DY', 'BOTH'].includes(x.trigger_type)) {
                        const k = x.dy_name || '未知运';
                        if (!dyMap[k]) dyMap[k] = [];
                        dyMap[k].push(x);
                    } else {
                        others.push(x);
                    }
                });

                const parts = [];
                for (let k in dyMap) {
                    const sub = dyMap[k].sort((a, b) => a.year - b.year);
                    if (sub.length >= 5) {
                        parts.push(`<b>${k}大运(${sub[0].year}-${sub[sub.length - 1].year})</b>`);
                    } else {
                        const ys = sub.map(y => y.year).join('、');
                        parts.push(`<b>${k}运内(${ys})</b>`);
                    }
                }
                others.forEach(x => parts.push(`${x.year}(${x.ganZhi})`));
                return parts.join('，');
            };

            const resParts = [];
            if (past.length > 0) {
                resParts.push(`<span style='color: #7f8c8d;'>已过年份：${buildStr(past)}</span>`);
            }
            if (current.length > 0) {
                resParts.push(`<span style='color: #c0392b; font-weight: bold;'>当前年份：${buildStr(current)}</span>`);
            }
            if (future.length > 0) {
                resParts.push(`<span style='color: #e67e22;'>未来年份：${buildStr(future)}</span>`);
            }
            return resParts.join('；');
        };

        // Risk Sort Helper
        const getRiskScore = (t) => {
            if (t.includes('羊刃')) return 0;
            if (t.includes('七杀') || t.includes('杀')) return 1; // High priority
            if (t.includes('反吟') || t.includes('伏吟')) return 2;
            if (t.includes('冲') || t.includes('克')) return 3;
            if (t.includes('纳音')) return 4;
            if (t.includes('食神') || t.includes('枭')) return 5;
            return 10;
        };
        const sortRiskFunc = (a, b) => getRiskScore(a) - getRiskScore(b) || a.localeCompare(b);

        // Render Static (Original) - Sorted
        const staticRisks = risks.filter(r => r.trigger_type === 'ORIGINAL');
        staticRisks.sort((a, b) => sortRiskFunc(a.title, b.title));

        /*
        staticRisks.forEach(r => {
            container.appendChild(createCard(r.title, r.description, r.probability, r.category));
        });
        */

        // Render Forecasts (Dynamic) - Sorted
        const dynamicKeys = Object.keys(groupedForecast).sort(sortRiskFunc);

        /*
        for (let riskTitle of dynamicKeys) {
            const items = groupedForecast[riskTitle];
            const yearsHtml = formatYears(items);
            const baseDesc = items[0].desc;
            const fullDesc = `${yearsHtml}。断语：${baseDesc}`;
            container.appendChild(createCard(riskTitle, fullDesc, '极高'));
        }
        */
    }
}

function renderInteractionsSplit(originalInter, dynamicPillars) {
    const container = document.querySelector('.inter-section');
    if (!container) return;
    container.innerHTML = '';
    container.style.display = 'flex';
    container.style.flexDirection = 'row';
    container.style.gap = '15px';
    container.style.alignItems = 'stretch';

    // Left
    const leftCol = div('inter-col');
    leftCol.style.flex = '1';
    const leftTitle = div('inter-title');
    leftTitle.textContent = '原局关系';
    leftTitle.style.fontWeight = 'bold';
    leftTitle.style.marginBottom = '5px';
    leftTitle.style.color = '#ccc';
    leftCol.appendChild(leftTitle);
    leftCol.appendChild(createInterRow('天干:', originalInter.stems.join(' ') || '无'));
    leftCol.appendChild(createInterRow('地支:', originalInter.branches.join(' ') || '无'));



    container.appendChild(leftCol);

    // Divider
    const divider = div('inter-divider');
    divider.style.width = '2px';
    divider.style.backgroundColor = '#d35400';
    divider.style.opacity = '0.7';
    container.appendChild(divider);

    // Right
    const rightCol = div('inter-col');
    rightCol.style.flex = '1';

    let stemsStr = "无";
    let branchesStr = "无";
    let titleStr = "大运/流年关系";

    if (dynamicPillars && dynamicPillars[0] && dynamicPillars[1]) {
        const dy = dynamicPillars[0];
        const ln = dynamicPillars[1];
        if (currentData && currentData.pillars) {
            const allPillars = [...currentData.pillars];
            let dyObj = { gan: dy.gan, zhi: dy.zhi };

            let lnObj = { gan: '', zhi: '' };
            if (ln.gan) {
                lnObj.gan = ln.gan;
                lnObj.zhi = ln.zhi;
            } else if (ln.ganZhi && ln.ganZhi.length >= 2) {
                lnObj.gan = ln.ganZhi[0];
                lnObj.zhi = ln.ganZhi[1];
            }

            allPillars.push(dyObj);
            allPillars.push(lnObj);

            const dynRes = getDynamicInteractions(allPillars, [4, 5]);
            stemsStr = dynRes.stems.join(' ') || "无";
            branchesStr = dynRes.branches.join(' ') || "无";
            titleStr = `大运(${dyObj.gan}${dyObj.zhi}) 流年(${lnObj.gan}${lnObj.zhi}) 关系`;
        }
    }

    const rightTitle = div('inter-title');
    rightTitle.textContent = titleStr;
    rightTitle.style.fontWeight = 'bold';
    rightTitle.style.marginBottom = '5px';
    rightTitle.style.color = '#d35400';
    rightCol.appendChild(rightTitle);
    rightCol.appendChild(createInterRow('天干:', stemsStr));
    rightCol.appendChild(createInterRow('地支:', branchesStr));
    container.appendChild(rightCol);
}

function createInterRow(label, value) {
    const row = div('inter-row');
    row.style.display = 'flex';
    row.style.marginBottom = '4px';
    const lbl = document.createElement('span');
    lbl.className = 'label';
    lbl.textContent = label;
    lbl.style.color = '#888';
    lbl.style.marginRight = '8px';
    lbl.style.minWidth = '35px';
    const val = document.createElement('span');
    val.className = 'value';
    val.textContent = value;
    val.style.wordBreak = 'break-all';
    row.appendChild(lbl);
    row.appendChild(val);
    return row;
}

function renderPillars(data) {
    chartGrid.innerHTML = '';
    chartGrid.className = 'chart-grid';

    const headers = ["年柱", "月柱", "日柱", "时柱", "大运", "流年"];
    let dy = data.currentDaYun;
    let ln = data.selectedLiuNian || (dy ? dy.liuNian.find(l => l.year === getSpecificBaziYear(new Date())) : null);

    const cols = [...data.pillars];
    cols.push(dy || createEmptyPillar());
    cols.push(ln || createEmptyPillar());

    // 1. Header Row
    const headTitle = div('row-header-cell');
    headTitle.textContent = '';
    chartGrid.appendChild(headTitle);

    cols.forEach((_, i) => {
        const cell = div('cell cell-header');
        cell.textContent = headers[i];
        chartGrid.appendChild(cell);
    });

    // 2. Ten God Row
    const tenGodHeader = div('row-header-cell');
    tenGodHeader.textContent = '十神';
    chartGrid.appendChild(tenGodHeader);

    cols.forEach(col => {
        const cell = div('cell');
        if (col.isUnknown) {
            // Empty cell for unknown
        } else {
            const span = div('ten-god');
            span.textContent = col.tenGod;
            if (['才', '财'].includes(col.tenGod)) span.style.color = '#27ae60';
            if (['杀', '官'].includes(col.tenGod)) span.style.color = '#e74c3c';
            cell.appendChild(span);
        }
        chartGrid.appendChild(cell);
    });

    // 3. Gan Row
    const ganHeader = div('row-header-cell');
    ganHeader.textContent = '天干';
    chartGrid.appendChild(ganHeader);

    cols.forEach(col => {
        const cell = div('cell');
        const span = div('pillar-char');
        // Handle Unknown Hour
        if (col.isUnknown) {
            span.textContent = "未知";
            span.style.color = '#7f8c8d';
            span.style.fontSize = '12px';
        } else {
            span.textContent = col.gan;
            span.style.color = col.ganColor;
        }
        cell.appendChild(span);
        chartGrid.appendChild(cell);
    });

    // 4. Zhi Row
    const zhiHeader = div('row-header-cell');
    zhiHeader.textContent = '地支';
    chartGrid.appendChild(zhiHeader);

    cols.forEach(col => {
        const cell = div('cell');
        const span = div('pillar-char');
        if (col.isUnknown) {
            span.textContent = "未知";
            span.style.color = '#7f8c8d';
            span.style.fontSize = '12px';
        } else {
            span.textContent = col.zhi;
            span.style.color = col.zhiColor;
        }
        cell.appendChild(span);
        chartGrid.appendChild(cell);
    });

    // 5. Hidden Stems
    const hiddenHeader = div('row-header-cell');
    hiddenHeader.textContent = '藏干';
    chartGrid.appendChild(hiddenHeader);

    cols.forEach(col => {
        const cell = div('cell');
        const HScontainer = div('hidden-stems');
        if (col.hidden) {
            col.hidden.forEach(h => {
                const row = div('');
                row.textContent = `${h.stem}${h.god}`;
                HScontainer.appendChild(row);
            });
        }
        cell.appendChild(HScontainer);
        chartGrid.appendChild(cell);
    });

    // 6. Na Yin
    const nayinHeader = div('row-header-cell');
    nayinHeader.textContent = '纳音';
    chartGrid.appendChild(nayinHeader);

    cols.forEach(col => {
        const cell = div('cell');
        cell.style.fontSize = '12px';
        cell.textContent = col.naYin;
        chartGrid.appendChild(cell);
    });

    // 7. Kong Wang
    const kwHeader = div('row-header-cell');
    kwHeader.textContent = '空亡';
    chartGrid.appendChild(kwHeader);

    cols.forEach(col => {
        const cell = div('cell');
        cell.style.fontSize = '12px';
        cell.style.color = '#888';
        cell.textContent = col.kongWang || '';
        chartGrid.appendChild(cell);
    });

    // 8. Shen Sha
    const shenShaHeader = div('row-header-cell');
    shenShaHeader.textContent = '神煞';
    chartGrid.appendChild(shenShaHeader);

    cols.forEach(col => {
        const cell = div('cell');
        const container = div('shen-sha');
        if (col.shenSha) {
            col.shenSha.forEach(s => {
                const sDiv = div('');
                sDiv.textContent = s;
                container.appendChild(sDiv);
            });
        }
        cell.appendChild(container);
        chartGrid.appendChild(cell);
    });
}

function renderDaYun(data) {
    dayunList.innerHTML = '';
    dayunList.className = 'dayun-scroll-container';

    const grid = div('dayun-grid');
    const colCount = data.daYunList.length;
    grid.style.gridTemplateColumns = `var(--dayun-header-width) repeat(${colCount}, var(--dayun-col-width))`;

    // HEADER
    const titleCell = div('matrix-cell matrix-title sticky-corner');
    titleCell.textContent = '大运';
    grid.appendChild(titleCell);

    data.daYunList.forEach((dy, i) => {
        const dyCell = div('matrix-cell dayun-header-cell sticky-top');
        if (data.currentDaYun === dy) dyCell.classList.add('active');

        const gz = div('dayun-gz');
        const gSpan = document.createElement('span');
        gSpan.textContent = dy.gan;
        gSpan.style.color = dy.ganColor;
        const zSpan = document.createElement('span');
        zSpan.textContent = dy.zhi;
        zSpan.style.color = dy.zhiColor;
        gz.append(gSpan, zSpan);

        const info = div('dayun-info');
        info.innerHTML = `${dy.startAge}岁<br>${dy.startYear}`;

        dyCell.append(gz, info);
        dyCell.addEventListener('click', () => selectDaYun(dy, data));
        grid.appendChild(dyCell);
    });

    // LIU NIAN ROWS
    for (let r = 0; r < 10; r++) {
        const leftHeader = div('matrix-cell matrix-title sticky-left');
        if (r === 4) leftHeader.textContent = "流年";
        grid.appendChild(leftHeader);

        data.daYunList.forEach(dy => {
            const ln = dy.liuNian[r];
            const cell = div('matrix-cell liunian-cell');
            if (ln) {
                const nowYear = getSpecificBaziYear(new Date());
                if (ln.year === nowYear) cell.classList.add('current-year');
                if (data.selectedLiuNian === ln) cell.classList.add('selected');

                const gz = div('liunian-gz');
                const gSpan = document.createElement('span');
                gSpan.textContent = ln.ganZhi[0];
                gSpan.style.color = ln.ganColor || '#ccc';
                const zSpan = document.createElement('span');
                zSpan.textContent = ln.ganZhi[1];
                zSpan.style.color = ln.zhiColor || '#ccc';
                gz.append(gSpan, zSpan);

                // Calculate Ten God of Branch Main Qi
                const dm = data.pillars[2].gan;
                const zhi = ln.ganZhi[1];
                const MAIN_QI = { '子': '癸', '丑': '己', '寅': '甲', '卯': '乙', '辰': '戊', '巳': '丙', '午': '丁', '未': '己', '申': '庚', '酉': '辛', '戌': '戊', '亥': '壬' };
                const GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];

                const dmIdx = GAN.indexOf(dm);
                const tIdx = GAN.indexOf(MAIN_QI[zhi]);
                let godStr = '';
                let godColor = '#888';

                if (dmIdx >= 0 && tIdx >= 0) {
                    const dmEl = Math.floor(dmIdx / 2);
                    const tEl = Math.floor(tIdx / 2);
                    const dmPol = dmIdx % 2;
                    const tPol = tIdx % 2;

                    // Simple Ten God Map Algo without modulo risk
                    // 0:Friend, 1:Output, 2:Wealth, 3:Officer, 4:Seal
                    const elDiff = (tEl - dmEl + 5) % 5;
                    const samePol = (dmPol === tPol);

                    if (elDiff === 0) godStr = samePol ? '比肩' : '劫财';
                    else if (elDiff === 1) godStr = samePol ? '食神' : '伤官';
                    else if (elDiff === 2) godStr = samePol ? '偏财' : '正财';
                    else if (elDiff === 3) godStr = samePol ? '七杀' : '正官';
                    else if (elDiff === 4) godStr = samePol ? '偏印' : '正印';

                    // Color Logic
                    if (['正财', '偏财', '才', '财'].includes(godStr)) godColor = '#27ae60'; // Green
                    else if (['正官', '七杀', '官', '杀'].includes(godStr)) godColor = '#e74c3c'; // Red
                    else if (['食神', '伤官', '食', '伤'].includes(godStr)) godColor = '#2980b9'; // Blue
                    else if (['正印', '偏印', '印', '枭'].includes(godStr)) godColor = '#9b59b6'; // Purple
                    else if (['比肩', '劫财', '比', '劫'].includes(godStr)) godColor = '#e67e22'; // Orange
                }

                const yearInfo = div('liunian-year');
                yearInfo.innerHTML = `<span style="color:${godColor}; font-weight:bold;">${godStr}</span><br><span style="font-size:10px;color:#888">${ln.year}(${ln.age})</span>`;

                cell.append(gz, yearInfo);
                cell.addEventListener('click', () => selectDaYun(dy, data, ln));
            }
            grid.appendChild(cell);
        });
    }

    dayunList.appendChild(grid);

    if (data.currentDaYun) {
        const colWidth = 75;
        const headerWidth = 45;
        const idx = data.daYunList.indexOf(data.currentDaYun);
        if (idx !== -1) {
            const targetX = headerWidth + (idx * colWidth);
            setTimeout(() => {
                const containerW = dayunList.clientWidth;
                const scrollLeft = targetX - (containerW / 2) + (colWidth / 2);
                dayunList.scrollLeft = scrollLeft;
            }, 0);
        }
    }
}

function selectDaYun(dy, data, ln = null) {
    if (!ln) {
        const nowYear = getSpecificBaziYear(new Date());
        ln = dy.liuNian.find(l => l.year === nowYear);
    }
    const newData = { ...data, currentDaYun: dy };
    if (ln) newData.selectedLiuNian = ln;
    currentData = newData;
    if (typeof BaziProcessor !== 'undefined') {
        currentData.ctx = BaziProcessor.createContext(currentData);
    }
    window.currentData = currentData;

    renderPillars(newData);
    renderInteractionsSplit(newData.interactions, [dy, ln]);
    renderDaYun(newData);
    renderView3(newData);
}

function createEmptyPillar() {
    return {
        gan: '', zhi: '', ganColor: '#333', zhiColor: '#333',
        tenGod: '', hidden: [], naYin: '', shenSha: []
    };
}

// === Save / Load Logic ===
function setupSaveLoad() {
    console.log("Setting up Save/Load logic...");
    if (btnSave) {
        console.log("btn-save found, attaching listener.");
        btnSave.addEventListener('click', () => {
            console.log("Save button clicked (v3 - Modal).");
            const dataToSave = currentData || window.currentData;
            console.log("dataToSave state:", dataToSave ? "Found" : "Missing");

            if (!dataToSave) {
                alert("请先进行排盘后再保存");
                return;
            }

            if (saveModal) {
                console.log("Opening Save Modal...");
                if (saveNameInput) saveNameInput.value = "";
                saveModal.style.display = 'flex';
                if (saveNameInput) {
                    setTimeout(() => saveNameInput.focus(), 100);
                }
            } else {
                console.error("Critical: saveModal not found in DOM.");
                // Fallback to prompt if modal fails for some reason
                const name = prompt("请输入命主姓名:", "");
                if (name && name.trim()) {
                    performSave(name.trim());
                }
            }
        });
    }

    if (saveModalCancel) {
        saveModalCancel.onclick = () => saveModal.style.display = 'none';
    }

    if (saveModalConfirm) {
        saveModalConfirm.onclick = () => {
            const name = saveNameInput ? saveNameInput.value.trim() : "";
            if (!name) {
                alert("请输入姓名");
                return;
            }
            performSave(name);
            saveModal.style.display = 'none';
        };
    }

    // Load Modal Close Logic
    if (loadCancel) {
        console.log("load-cancel button initialized.");
        loadCancel.onclick = (e) => {
            console.log("load-cancel clicked.");
            if (loadModal) loadModal.style.display = 'none';
        };
        // Also support touch for faster response on mobile
        loadCancel.ontouchend = (e) => {
            console.log("load-cancel touched.");
            e.preventDefault();
            if (loadModal) loadModal.style.display = 'none';
        };
    }

    if (loadModal) {
        loadModal.onclick = (e) => {
            if (e.target === loadModal) {
                console.log("loadModal background clicked, closing.");
                loadModal.style.display = 'none';
            }
        };
    }
}

function performSave(name) {
    console.log("Saving record for name:", name);
    const dataToSave = currentData || window.currentData;
    const selects = document.querySelectorAll('#manual-mode-container select');
    const record = {
        id: Date.now(),
        name: name,
        solarDate: (dataToSave.solarDate || "").split(' ')[0],
        fullDate: dataToSave.solarDate,
        intDate: dataToSave.intDate || Date.now(),
        gender: (document.getElementById('gender-input') && document.getElementById('gender-input').value == '0') ? '女' : '男',
        savedAt: new Date().toLocaleString(),
        inputs: {
            mode: inputModeSelect ? inputModeSelect.value : '0',
            calType: calTypeSelect.value,
            isLeap: chkLeap.checked,
            y: hYear.value, m: hMonth.value, d: hDay.value, h: hHour.value, mi: hMin.value,
            yg: selects[0] ? selects[0].value : '',
            yz: selects[1] ? selects[1].value : '',
            mg: selects[2] ? selects[2].value : '',
            mz: selects[3] ? selects[3].value : '',
            dg: selects[4] ? selects[4].value : '',
            dz: selects[5] ? selects[5].value : '',
            tg: selects[6] ? selects[6].value : '',
            tz: selects[7] ? selects[7].value : '',
            genderIdx: document.getElementById('gender-input') ? document.getElementById('gender-input').value : '1'
        }
    };

    let saved = [];
    try {
        saved = JSON.parse(localStorage.getItem('bazi_records') || '[]');
    } catch (e) { }
    saved.push(record);
    localStorage.setItem('bazi_records', JSON.stringify(saved));
    alert("保存成功！");
}

// btnLoad listener handled above in initUI block with logging

// loadCancel and loadModal listeners are now inside setupSaveLoad()

function renderRecordList(list) {
    recordList.innerHTML = '';
    [...list].reverse().forEach((rec, revIdx) => {
        const item = document.createElement('div');
        item.style.padding = '15px';
        item.style.borderBottom = '1px solid #333';
        item.style.cursor = 'pointer';
        item.style.display = 'flex';
        item.style.justifyContent = 'space-between';
        item.style.alignItems = 'center';
        item.style.position = 'relative';
        item.style.overflow = 'hidden';
        item.style.transition = 'transform 0.3s ease';

        const info = document.createElement('div');
        info.style.flex = '1';
        info.innerHTML = `
            <div style="font-size: 18px; color: #fff; font-weight: bold;">${rec.name} <span style="font-size: 14px; font-weight: normal; color: #aaa;">(${rec.gender})</span></div>
            <div style="color: #d35400; margin-top: 5px;">${rec.solarDate}</div>
            <div style="color: #555; font-size: 12px; margin-top: 5px;">保存于: ${rec.savedAt}</div>
        `;

        info.addEventListener('click', () => {
            restoreRecord(rec);
            loadModal.style.display = 'none';
        });

        const btnDel = document.createElement('div');
        btnDel.innerHTML = '✕';
        btnDel.style.color = '#c0392b';
        btnDel.style.fontSize = '24px';
        btnDel.style.padding = '10px 20px';
        btnDel.style.marginLeft = '10px';
        btnDel.style.backgroundColor = '#1a1a1a';

        btnDel.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(`确定删除 ${rec.name} 的记录吗？`)) {
                const realIdx = list.length - 1 - revIdx;
                list.splice(realIdx, 1);
                localStorage.setItem('bazi_records', JSON.stringify(list));
                renderRecordList(list);
            }
        });

        item.appendChild(info);
        item.appendChild(btnDel);
        recordList.appendChild(item);
    });
}

function restoreRecord(rec) {
    const inp = rec.inputs;
    if (!inp) return;

    // Restore UI for display
    inputModeSelect.value = inp.mode;
    inputModeSelect.dispatchEvent(new Event('change'));

    const genderInput = document.getElementById('gender-input');
    if (genderInput && (inp.genderIdx !== undefined && inp.genderIdx !== null)) {
        genderInput.value = inp.genderIdx;
        // genderInput.dispatchEvent(new Event('change')); // Optional if listeners depend on it
    }

    if (inp.mode == 0) {
        calTypeSelect.value = inp.calType;
        chkLeap.checked = inp.isLeap;
        calTypeSelect.dispatchEvent(new Event('change'));
        hYear.value = inp.y; hMonth.value = inp.m; hDay.value = inp.d; hHour.value = inp.h; hMin.value = inp.mi;
        updateButtonText();
    } else {
        const selects = document.querySelectorAll('#manual-mode-container select');
        if (selects.length >= 8) {
            selects[0].value = inp.yg; selects[0].dispatchEvent(new Event('change')); selects[1].value = inp.yz;
            selects[2].value = inp.mg; selects[2].dispatchEvent(new Event('change')); selects[3].value = inp.mz;
            selects[4].value = inp.dg; selects[4].dispatchEvent(new Event('change')); selects[5].value = inp.dz;
            selects[6].value = inp.tg; selects[6].dispatchEvent(new Event('change')); selects[7].value = inp.tz;
        }
    }

    // Direct Restore Logic (Bypassing search)
    if (rec.intDate) {
        const dateObj = new Date(rec.intDate);
        const gender = (inp.genderIdx !== undefined && inp.genderIdx !== null) ? inp.genderIdx : '1';
        finishCalculation(dateObj, gender);
    } else {
        // Fallback for old records without intDate
        if (btnCalc) btnCalc.click();
    }
}

function renderView3(data) {
    const container = document.getElementById('view-3');
    if (!container) return;
    container.innerHTML = '';
    container.style.display = 'none'; // Controlled by tab switch
    container.style.flexDirection = 'column';
    container.style.alignItems = 'stretch';
    container.style.padding = '20px';
    container.style.justifyContent = 'flex-start';
    container.style.overflowY = 'auto';

    // Header
    // Header Removed
    // --- Master Synthesis Button ---
    const btnMaster = document.createElement('button');
    btnMaster.textContent = "🔮 大师综断 (生成话术脚本)";
    btnMaster.style.width = '100%';
    btnMaster.style.padding = '12px';
    btnMaster.style.marginBottom = '15px';
    btnMaster.style.background = 'linear-gradient(to right, #8e44ad, #c0392b)';
    btnMaster.style.color = '#fff';
    btnMaster.style.border = 'none';
    btnMaster.style.borderRadius = '8px';
    btnMaster.style.fontSize = '16px';
    btnMaster.style.fontWeight = 'bold';
    btnMaster.style.cursor = 'pointer';
    btnMaster.style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';

    btnMaster.onclick = () => {
        if (window.BaziNarrative) {
            // Ensure we have a default year for category fallbacks (Master Synthesis requires a year for suiYun logic)
            const defaultYear = (typeof getSpecificBaziYear === 'function') ? getSpecificBaziYear(new Date()) : new Date().getFullYear();
            const ln = data.selectedLiuNian || (data.currentDaYun ? data.currentDaYun.liuNian.find(l => l.year === defaultYear) : null);

            // Calculate Expert Report to get Decision Tree results
            const expertData = window.AnalysisEngine ? window.AnalysisEngine.getExpertReport('MASTER', { ...data, ctx: data.ctx, selectedLiuNian: ln }) : null;

            // Restore Legacy Academic Status for Luck-Supplemented Diagnostics
            let academicLegacy = null;
            if (typeof calculateAcademicStatus === 'function') {
                const dyList = data.daYunList || [];
                // Filter valid da yun
                const validLucks = dyList.filter(l => l.startAge !== undefined || l.isDaYun);
                const earlyLucks = validLucks.slice(0, 2);
                academicLegacy = calculateAcademicStatus(data, earlyLucks, { daYun: data.currentDaYun, liuNian: data.selectedLiuNian }, expertData);
            }

            // [SYNC FIX] Capture Logic Tree Targets
            let logicTargets = {};
            if (window.TreeViewer && window.TreeViewer.getAllLogicTargets) {
                try {

                    // Ensure context exists even if user never visited Tree tab
                    let useCtx = window.currentCtx;
                    if (!useCtx && window.TreeViewer.getChartContext) {
                        useCtx = window.TreeViewer.getChartContext({ ...data, expertData });
                    }

                    if (useCtx) {
                        logicTargets = window.TreeViewer.getAllLogicTargets(useCtx);
                        if (window.logDebug) window.logDebug("✅ [Sync] Captured Logic Targets:", logicTargets);
                    } else {
                        if (window.logDebug) window.logDebug("⚠️ [Sync] No Context available for Logic Targets");
                    }
                } catch (e) {
                    if (window.logDebug) window.logDebug("❌ [Sync] Failed to capture logic targets:", e.message);
                }
            }

            const narrativeReport = { ...data, expertData, academic: academicLegacy, logicTargets };
            if (window.logDebug) window.logDebug("📊 Final Narrative Report Sent:", {
                hasLogicTargets: Array.isArray(logicTargets) ? logicTargets.length : 0,
                hasExpertData: !!expertData,
                hasDecisionResult: expertData && !!expertData.decisionResult
            });

            const lib = window.BaziNarrative.generateScriptLibrary(narrativeReport);
            if (!lib) {
                alert("生成失败，数据不足");
                return;
            }

            const contentDiv = document.getElementById('masterSynthesisContent');
            const modal = document.getElementById('masterSynthesisModal');

            if (contentDiv && modal) {
                contentDiv.innerHTML = ''; // Clear

                // 1. Create Tabs Header
                const tabsContainer = document.createElement('div');
                tabsContainer.style.display = 'flex';
                tabsContainer.style.borderBottom = '1px solid #444';
                tabsContainer.style.marginBottom = '15px';
                tabsContainer.style.overflowX = 'auto'; // Handle mobile width

                const tabNames = [
                    { key: 'horoscope', icon: '📝', label: '综断' },
                    { key: 'opening', icon: '👤', label: '内心' },
                    { key: 'impact', icon: '⚡', label: '互动' },
                    { key: 'wealth', icon: '💰', label: '财富' },
                    { key: 'marriage', icon: '💑', label: '婚姻' },
                    { key: 'academic', icon: '🎓', label: '学业' },
                    { key: 'career', icon: '🚀', label: '事业' },
                    { key: 'sexlife', icon: '❤️', label: '性生活' },
                    { key: 'children', icon: '👶', label: '子女' },
                    { key: 'legal', icon: '⚖️', label: '官非' },
                    { key: 'fengshui', icon: '🔮', label: '风水' }
                ];

                const panes = {};

                tabNames.forEach((t, i) => {
                    const btn = document.createElement('div');
                    btn.textContent = `${t.icon} ${t.label}`;
                    btn.style.padding = '10px 15px';
                    btn.style.cursor = 'pointer';
                    btn.style.color = '#888';
                    btn.style.borderBottom = '2px solid transparent';
                    btn.style.whiteSpace = 'nowrap';

                    if (i === 0) {
                        btn.style.color = '#d35400';
                        btn.style.borderBottom = '2px solid #d35400';
                        btn.style.fontWeight = 'bold';
                    }

                    btn.onclick = () => {
                        // Reset all
                        Object.values(panes).forEach(p => p.style.display = 'none');
                        Array.from(tabsContainer.children).forEach(b => {
                            b.style.color = '#888';
                            b.style.borderBottom = '2px solid transparent';
                            b.style.fontWeight = 'normal';
                        });
                        // Activate current
                        panes[t.key].style.display = 'block';
                        btn.style.color = '#d35400';
                        btn.style.borderBottom = '2px solid #d35400';
                        btn.style.fontWeight = 'bold';
                    };

                    tabsContainer.appendChild(btn);
                });

                contentDiv.appendChild(tabsContainer);

                // 2. Create Panes
                tabNames.forEach((t, i) => {
                    const pane = document.createElement('div');
                    pane.style.display = i === 0 ? 'block' : 'none';
                    pane.style.maxHeight = '400px';
                    pane.style.overflowY = 'auto';

                    if (t.key === 'horoscope') {
                        // Special integrated narrative for Horoscope tab
                        const story = window.BaziNarrative.generateHoroscopeNarrative(lib);
                        const storyDiv = document.createElement('div');
                        storyDiv.style.padding = '20px';
                        storyDiv.style.lineHeight = '1.8';
                        storyDiv.style.color = '#fff';
                        storyDiv.style.fontSize = '15px';
                        storyDiv.style.whiteSpace = 'pre-wrap';
                        storyDiv.style.background = '#1a1a1a';
                        storyDiv.style.borderRadius = '12px';
                        storyDiv.style.border = '1px solid #444';
                        storyDiv.style.boxShadow = 'inset 0 0 20px rgba(0,0,0,0.5)';

                        // Markdown-to-HTML: Headers
                        const formattedStory = story.replace(/### (.*)/g, (match, p1) => {
                            return `<div style="color:#e67e22; font-weight:bold; font-size:16px; margin-top:15px; margin-bottom:10px; border-left:4px solid #e67e22; padding-left:10px; background:rgba(230,126,34,0.1); padding-top:4px; padding-bottom:4px;">${p1}</div>`;
                        });
                        storyDiv.innerHTML = formattedStory;

                        // Add a dedicated copy button for the integrated story
                        const copyStoryBtn = document.createElement('button');
                        copyStoryBtn.textContent = '📖 复制整段综断';
                        copyStoryBtn.style.marginTop = '15px';
                        copyStoryBtn.style.padding = '8px 12px';
                        copyStoryBtn.style.background = '#27ae60';
                        copyStoryBtn.style.color = 'white';
                        copyStoryBtn.style.border = 'none';
                        copyStoryBtn.style.borderRadius = '6px';
                        copyStoryBtn.style.cursor = 'pointer';
                        copyStoryBtn.style.fontSize = '14px';
                        copyStoryBtn.onclick = () => {
                            if (navigator.clipboard) {
                                navigator.clipboard.writeText(story).then(() => {
                                    copyStoryBtn.textContent = '✅ 已复制综断';
                                    setTimeout(() => copyStoryBtn.textContent = '📖 复制整段综断', 2000);
                                });
                            }
                        };

                        pane.appendChild(storyDiv);
                        pane.appendChild(copyStoryBtn);
                    } else {
                        const cards = lib[t.key];
                        if (cards && cards.length > 0) {
                            cards.forEach(card => {
                                const cardDiv = document.createElement('div');
                                cardDiv.style.marginBottom = '12px';
                                cardDiv.style.border = '1px solid #444';
                                cardDiv.style.borderRadius = '6px';
                                cardDiv.style.padding = '12px';
                                cardDiv.style.background = '#222';

                                const headerDiv = document.createElement('div');
                                headerDiv.style.display = 'flex';
                                headerDiv.style.justifyContent = 'space-between';
                                headerDiv.style.alignItems = 'center';
                                headerDiv.style.marginBottom = '8px';
                                headerDiv.style.borderBottom = '1px dashed #555';
                                headerDiv.style.paddingBottom = '5px';

                                const titleSpan = document.createElement('span');
                                titleSpan.textContent = card.title;
                                titleSpan.style.fontWeight = 'bold';
                                titleSpan.style.fontSize = '14px';
                                titleSpan.style.color = '#e67e22';

                                const copyBtnSmall = document.createElement('button');
                                copyBtnSmall.textContent = '复制';
                                copyBtnSmall.style.padding = '2px 8px';
                                copyBtnSmall.style.fontSize = '12px';
                                copyBtnSmall.style.background = '#2980b9';
                                copyBtnSmall.style.color = 'white';
                                copyBtnSmall.style.border = 'none';
                                copyBtnSmall.style.borderRadius = '4px';
                                copyBtnSmall.style.cursor = 'pointer';

                                copyBtnSmall.onclick = () => {
                                    // Pure Copy: Priority on pureContent (just the assertion)
                                    const txt = card.pureContent || card.content;
                                    if (navigator.clipboard) {
                                        navigator.clipboard.writeText(txt).then(() => {
                                            copyBtnSmall.textContent = 'OK';
                                            setTimeout(() => copyBtnSmall.textContent = '复制', 1000);
                                        });
                                    } else {
                                        // Fallback
                                        const ta = document.createElement('textarea');
                                        ta.value = txt;
                                        document.body.appendChild(ta);
                                        ta.select();
                                        document.execCommand('copy');
                                        document.body.removeChild(ta);
                                        copyBtnSmall.textContent = 'OK';
                                        setTimeout(() => copyBtnSmall.textContent = '复制', 1000);
                                    }
                                };

                                headerDiv.appendChild(titleSpan);
                                headerDiv.appendChild(copyBtnSmall);

                                const bodyDiv = document.createElement('div');
                                bodyDiv.textContent = card.content;
                                bodyDiv.style.lineHeight = '1.5';
                                bodyDiv.style.color = '#ccc';
                                bodyDiv.style.fontSize = '13px';
                                bodyDiv.style.whiteSpace = 'pre-line';

                                cardDiv.appendChild(headerDiv);
                                cardDiv.appendChild(bodyDiv);
                                pane.appendChild(cardDiv);
                            });
                        } else {
                            pane.innerHTML = '<div style="color:#666; padding:20px; text-align:center;">暂无相关断语</div>';
                        }
                    }

                    panes[t.key] = pane;
                    contentDiv.appendChild(pane);
                });

                modal.style.display = 'block';

                // Hide global copy button if present
                const globalCopyBtn = document.getElementById('copyMasterScriptBtn');
                if (globalCopyBtn) {
                    globalCopyBtn.style.display = 'inline-block';
                    globalCopyBtn.onclick = () => {
                        let fullScript = "【🔮 大师综合命局综断话术脚本】\n\n";

                        // 1. Add Integrated Horoscope
                        const story = window.BaziNarrative.generateHoroscopeNarrative(lib);
                        fullScript += story + "\n\n" + "=".repeat(20) + "\n\n";

                        // 2. Add Category Details
                        tabNames.forEach(t => {
                            if (t.key === 'horoscope') return;
                            const cards = lib[t.key];
                            if (cards && cards.length > 0) {
                                fullScript += `【${t.label}专项分析】\n`;
                                cards.forEach(c => {
                                    fullScript += `▪ ${c.title}\n${c.content}\n\n`;
                                });
                            }
                        });

                        if (navigator.clipboard) {
                            navigator.clipboard.writeText(fullScript).then(() => {
                                globalCopyBtn.textContent = '✅ 脚本已全部复制';
                                globalCopyBtn.style.background = '#27ae60';
                                setTimeout(() => {
                                    globalCopyBtn.textContent = '一键复制话术';
                                    globalCopyBtn.style.background = '#4CAF50';
                                }, 2000);
                            });
                        }
                    };
                }
            }
        } else {
            alert("话术引擎未加载");
        }
    };
    container.appendChild(btnMaster);

    // --- Body Strength Section ---
    const bs = data.bodyStrength || { level: '中和', profile: [], isGuanYin: false, logs: [] };
    const yxj = data.yongXiJi || { mode: '扶抑', yong: '木', xi: '火', ji: '金' };
    const bsRow = document.createElement('div');
    bsRow.style.padding = '12px 10px';
    bsRow.style.borderBottom = '1px solid #333';
    bsRow.style.fontSize = '15px';
    bsRow.style.display = 'flex';
    bsRow.style.alignItems = 'center';
    bsRow.style.flexWrap = 'wrap';

    let extra = '';
    // if (bs.isGuanYin) extra = '<span style="font-size:13px; color:#aaa; margin-left:8px;">(官印局)</span>';
    let yxjStr = '';
    if (yxj.yong) {
        let modeExtra = yxj.typeDesc ? `-${yxj.typeDesc}` : '';
        yxjStr = ` <span style="font-size:14px; color:#aaa; margin-left:15px; display:inline-flex; align-items:center;">` +
            `[${yxj.mode}${modeExtra}] ` +
            `<span style="color:#27ae60; margin-left:5px;">用:${yxj.yong}</span> ` +
            `<span style="color:#2980b9; margin-left:5px;">喜:${yxj.xi}</span> ` +
            `<span style="color:#c0392b; margin-left:5px;">忌:${yxj.ji}</span></span>`;
    }
    bsRow.innerHTML = `<span style="color: #d35400; font-weight: bold; margin-right: 5px;">身强身旺：</span><span style="color: #e74c3c; font-weight: bold;">${bs.level}</span>` + extra + yxjStr;
    const profile = bs.profile || window.getFiveElementProfile(data.pillars);
    const profileHtml = profile.map(p => {
        const color = p.isStrong ? '#d35400' : '#7f8c8d';
        const weight = p.isStrong ? 'bold' : 'normal';
        const statusLabel = p.score === 0 ? '缺' : (p.isStrong ? '强' : '弱');
        return `<span style="color:${color}; font-weight:${weight}; margin-right:8px;">${p.element}(${p.tenGod || '?'})${statusLabel}</span>`;
    }).join('');
    bsRow.innerHTML += `<div style="width:100%; font-size:14px; margin-top:5px;"><span style="font-weight:bold; color:#ccc;">五行走势: </span>${profileHtml}</div>`;

    // Tomb/Warehouse Status (Display All 4)
    const scores = window.calculateGlobalScores(data.pillars);
    const allEarthStatus = window.getAllEarthStatuses(data.pillars, scores);
    let tombHtml = "";

    const ORDER = ['辰', '戌', '丑', '未'];
    const TYPE_LABELS = {
        '辰': '水',
        '戌': '火土',
        '丑': '金',
        '未': '木'
    };

    ORDER.forEach(zhi => {
        const status = allEarthStatus[zhi];
        if (status) {
            const elemLabel = TYPE_LABELS[zhi] || '';
            const statusText = status.desc;
            const fullLabel = `${zhi}${elemLabel}${statusText}`;

            const color = status.type === 'Warehouse' ? '#27ae60' : '#7f8c8d';
            const weight = status.type === 'Warehouse' ? 'bold' : 'normal';

            tombHtml += `<span style="color:${color}; font-weight:${weight}; margin-right:8px;">[${fullLabel}]</span>`;
        }
    });

    bsRow.innerHTML += `<div style="margin-top:6px; font-size:13px; color:#aaa;">地支状态: ${tombHtml}</div>`;


    container.appendChild(bsRow);


    // --- 6-Pillar Section ---
    if (data.currentDaYun && data.selectedLiuNian) {
        const dyPillar = {
            gan: data.currentDaYun.gan, zhi: data.currentDaYun.zhi,
            stem: { char: data.currentDaYun.gan }, branch: { char: data.currentDaYun.zhi }
        };
        const lnPillar = {
            gan: data.selectedLiuNian.ganZhi[0], zhi: data.selectedLiuNian.ganZhi[1],
            stem: { char: data.selectedLiuNian.ganZhi[0] }, branch: { char: data.selectedLiuNian.ganZhi[1] }
        };
        const pillars6 = [...data.pillars, dyPillar, lnPillar];

        let bs6 = { level: '中和', alerts: [] };
        let yxj6 = { yong: '木', xi: '火', mode: '扶抑' };

        if (window.BaziProcessor && window.AnalysisEngine && window.AnalysisEngine.calculateOOBodyStrength) {
            const ctx6 = window.BaziProcessor.createContext({ pillars: pillars6 });
            bs6 = window.AnalysisEngine.calculateOOBodyStrength(ctx6);
            yxj6 = window.AnalysisEngine.calculateOOYongXiJi(ctx6, bs6);
        }
        const row6 = document.createElement('div');
        row6.style.padding = '12px 10px';
        row6.style.borderBottom = '1px solid #333';
        row6.style.fontSize = '15px';
        row6.style.display = 'flex';
        row6.style.flexDirection = 'column';
        row6.style.gap = '5px';
        const mainLine = document.createElement('div');
        mainLine.style.display = 'flex';
        mainLine.style.alignItems = 'center';
        mainLine.style.flexWrap = 'wrap';
        let alertHtml = '';
        if (bs6.alerts && bs6.alerts.length > 0) alertHtml = bs6.alerts.map(a => `<div style="color:#ff4444; font-weight:bold; margin-top:4px;">${a}</div>`).join('');
        let extra6 = bs6.isGuanYin ? '<span style="font-size:13px; color:#aaa; margin-left:8px;">(运:官印局)</span>' : '';
        let yxjStr6 = '';
        if (yxj6.yong) {
            let modeExtra6 = yxj6.typeDesc ? `-${yxj6.typeDesc}` : '';
            yxjStr6 = ` <span style="font-size:14px; color:#aaa; margin-left:15px; display:inline-flex; align-items:center;">` +
                `[${yxj6.mode}${modeExtra6}] ` +
                `<span style="color:#27ae60; margin-left:5px;">用:${yxj6.yong}</span> ` +
                `<span style="color:#2980b9; margin-left:5px;">喜:${yxj6.xi}</span> ` +
                `<span style="color:#c0392b; margin-left:5px;">忌:${yxj6.ji}</span></span>`;
        }
        mainLine.innerHTML = `<span style="color: #d35400; font-weight: bold; margin-right: 5px;">六柱强弱：</span><span style="color: #e74c3c; font-weight: bold;">${bs6.level}</span>` + extra6 + yxjStr6;
        row6.appendChild(mainLine);
        const profile6 = bs6.profile || getFiveElementProfile(pillars6);
        const profileHtml6 = profile6.map(p => {
            const color = p.isStrong ? '#d35400' : '#7f8c8d';
            const weight = p.isStrong ? 'bold' : 'normal';
            const statusLabel = p.score === 0 ? '缺' : (p.isStrong ? '强' : '弱');
            return `<span style="color:${color}; font-weight:${weight}; margin-right:8px;">${p.element}(${p.tenGod})${statusLabel}</span>`;
        }).join('');
        const profileRow6 = document.createElement('div');
        profileRow6.style.fontSize = '14px';
        profileRow6.style.marginTop = '5px';
        profileRow6.innerHTML = `<span style="font-weight:bold; color:#ccc;">五行走势: </span>` + profileHtml6;
        row6.appendChild(profileRow6);
        if (alertHtml) {
            const alertContainer = document.createElement('div');
            alertContainer.style.width = '100%';
            alertContainer.innerHTML = alertHtml;
            row6.appendChild(alertContainer);
        }
        container.appendChild(row6);
    }

    // --- Gong Jia Section ---
    // --- Flowing Row Logic ---
    const renderFlowingRow = (date) => {
        const container = document.getElementById('flowing-row');
        if (!container) return;
        container.innerHTML = '';

        // Use Lunar for GanZhi
        const lunar = Lunar.fromDate(date);
        const mGZ = lunar.getMonthInGanZhi();

        // Month Item
        const mDiv = document.createElement('div');
        mDiv.style.marginRight = '15px';
        mDiv.style.fontWeight = 'bold';
        mDiv.style.padding = '2px 8px';
        mDiv.style.background = '#333';
        mDiv.style.borderRadius = '4px';
        mDiv.innerHTML = `<span style="color:#aaa; font-size:12px;">流月: </span><span style="color:#d35400;">${mGZ}</span>`;
        container.appendChild(mDiv);

        // Days Loop (Start from date, +30 days)
        for (let i = 0; i < 30; i++) {
            const d = new Date(date.getTime() + i * 86400000);
            const l = Lunar.fromDate(d);
            const dGZ = l.getDayInGanZhi();
            const dayNum = d.getDate();
            const isToday = i === 0;

            const dDiv = document.createElement('span');
            dDiv.style.marginRight = '8px';
            dDiv.style.borderRight = '1px solid #444';
            dDiv.style.padding = '5px 8px 5px 0'; // Vertical padding makes the border longer
            dDiv.style.fontFamily = 'monospace';
            dDiv.style.display = 'inline-flex'; // Use flex to center content
            dDiv.style.alignItems = 'center';
            if (isToday) dDiv.style.color = '#fff';

            dDiv.textContent = `${dayNum}${dGZ}`;
            container.appendChild(dDiv);
        }
    };
    renderFlowingRow(new Date());

    // --- End Flowing Row ---
    const gj = getGongJiaRelations(data.pillars);
    const allItems = [];
    const processItems = (list, isSep) => {
        list.forEach(item => {
            item.relations.forEach(rel => {
                if (rel.type === '拱' || rel.type === '夹' || rel.type === '倒夹') allItems.push({ ...item, rel, isSep });
            });
        });
    };
    processItems(gj.adjacent, false);
    processItems(gj.separated, true);
    const gjContainer = document.createElement('div');
    gjContainer.style.width = '100%';
    const getColor = (char) => {
        const colors = { '寅': '#27ae60', '卯': '#27ae60', '巳': '#c0392b', '午': '#c0392b', '辰': '#a1887f', '戌': '#a1887f', '丑': '#a1887f', '未': '#a1887f', '申': '#b8860b', '酉': '#b8860b', '亥': '#2980b9', '子': '#2980b9' };
        return colors[char] || '#ccc';
    };
    if (allItems.length > 0) {
        const row = document.createElement('div');
        row.style.padding = '12px 10px';
        row.style.borderBottom = '1px solid #333';
        row.style.display = 'flex';
        row.style.flexWrap = 'wrap';
        row.style.alignItems = 'center';
        row.style.gap = '15px';
        row.style.lineHeight = '1.8';
        const label = document.createElement('span');
        label.textContent = '拱夹：';
        label.style.fontWeight = 'bold';
        label.style.color = '#d35400';
        label.style.marginRight = '5px';
        row.appendChild(label);
        allItems.forEach(item => {
            const span = document.createElement('span');
            span.style.display = 'inline-flex';
            span.style.alignItems = 'center';
            span.innerHTML = `<span style="color:#aaa">${item.rel.type}</span>` +
                `<span style="color:${getColor(item.rel.char)}; font-weight:bold; margin:0 2px;">${item.rel.char}</span>` +
                `<span style="color:#666; font-size:12px;">(${item.p1}-${item.p2}${item.isSep ? '/隔' : ''})</span>`;
            row.appendChild(span);
        });
        gjContainer.appendChild(row);
        container.appendChild(gjContainer);
    }

    // --- He Hua Judgments ---
    if (data.interactions && data.interactions.judgments && data.interactions.judgments.length > 0) {
        const jRow = document.createElement('div');
        jRow.style.padding = '12px 10px';
        jRow.style.borderBottom = '1px solid #333';
        jRow.style.fontSize = '15px';
        jRow.style.color = '#e74c3c';
        const jLabel = document.createElement('div');
        jLabel.innerHTML = "<span style='color: #d35400; font-weight: bold;'>命局断语：</span>";
        jLabel.style.marginBottom = '5px';
        jRow.appendChild(jLabel);
        data.interactions.judgments.forEach(j => {
            const row = document.createElement('div');
            row.style.marginBottom = '3px';
            row.textContent = "• " + j;
            jRow.appendChild(row);
        });
        container.appendChild(jRow);
    }

    // --- Academic Section ---
    const earlyLucks = (data.daYunList && data.daYunList.length > 0) ? data.daYunList.slice(0, 3) : [];
    const dynamicLuck = { daYun: data.currentDaYun, liuNian: data.selectedLiuNian };

    // [New] Engine-Driven Data Preparation (Academic)
    let academicExpertData = null;
    if (window.AnalysisEngine) {
        const p = data.pillars;
        const allGods = [];
        p.forEach(pillar => {
            if (pillar.xml && pillar.xml.tenGod) allGods.push(pillar.xml.tenGod);
            if (pillar.xml && pillar.xml.hiddenGods) allGods.push(...pillar.xml.hiddenGods);
        });

        // Priority: Seal > Output
        let targetGod = '正印';
        if (allGods.includes('正印')) targetGod = '正印';
        else if (allGods.includes('偏印')) targetGod = '偏印';
        else if (allGods.includes('食神')) targetGod = '食神';
        else if (allGods.includes('伤官')) targetGod = '伤官';

        academicExpertData = window.AnalysisEngine.getExpertReport(targetGod, {
            ctx: data.ctx,
            pillars: data.pillars,
            daYunList: data.daYunList,
            currentDaYun: data.currentDaYun,
            selectedLiuNian: data.selectedLiuNian,
            bodyStrength: bs,
            yongElements: [yxj.yong],
            jiElements: [yxj.ji]
        });
        // console.log("Academic Engine Report:", academicExpertData);
    }

    const acadResult = calculateAcademicStatus({ ...data, bodyStrength: bs, profile: profile }, earlyLucks, dynamicLuck, academicExpertData);
    if (acadResult) {
        const acadBox = document.createElement('div');
        acadBox.style.borderBottom = '1px solid #333';

        const header = document.createElement('div');
        header.style.padding = '12px 10px';
        header.style.cursor = 'pointer';
        header.style.display = 'flex';
        header.style.alignItems = 'center';

        const arrow = document.createElement('span');
        arrow.innerHTML = '► ';
        arrow.style.fontSize = '12px';
        arrow.style.marginRight = '8px';
        arrow.style.color = '#aaa';

        const titleText = document.createElement('span');
        titleText.textContent = '学业分析';
        titleText.style.fontWeight = 'bold';
        titleText.style.color = '#d35400';
        titleText.style.fontSize = '15px';

        header.appendChild(arrow);
        header.appendChild(titleText);

        const content = document.createElement('div');
        content.style.display = 'none';
        content.style.padding = '0 10px 15px 30px';
        content.style.fontSize = '14px';
        content.style.color = '#ccc';
        content.style.lineHeight = '1.6';

        let html = `<div><span style="color:#aaa;">学历层级:</span> <span style="color:#e67e22; font-weight:bold;">${acadResult.gradeLevel}</span></div>`;
        html += `<div style="margin-top:5px;"><span style="color:#aaa;">学习态度:</span> <span style="color:#f1c40f;">${acadResult.attitude || '一般'}</span></div>`;
        html += `<div style="margin-top:5px;"><span style="color:#aaa;">偏科倾向:</span> <span style="color:#3498db;">${acadResult.pBias || '全面发展'}</span></div>`;
        html += `<div style="margin-top:5px; font-size:12px;"><span style="color:#777;">定义:</span> 印(${acadResult.basicInfo.seal || '无'}) 食伤(${acadResult.basicInfo.food || '无'})</div>`;

        if (acadResult.matchTerms && acadResult.matchTerms.length > 0) {
            html += `<div style="margin-top:10px; border-top:1px dashed #444; padding-top:10px;">`;
            acadResult.matchTerms.forEach(t => {
                html += `<div style="margin-bottom:8px;">` +
                    `<span style="color:#2ecc71; font-weight:bold;">\u2022 ${t.title}</span> ` +
                    `<span style="color:#999; font-size:12px;">(应验率${t.rate}%)</span>` +
                    `<div style="margin-left:14px; color:#aaa; font-size:13px; line-height:1.4;">${t.desc}</div>` +
                    `</div>`;
            });
            html += `</div>`;
        } else {
            html += `<div style="margin-top:8px; color:#666;">未匹配到典型学业断语</div>`;
        }

        content.innerHTML = html;

        header.onclick = () => {
            const isHidden = content.style.display === 'none';
            content.style.display = isHidden ? 'block' : 'none';
            arrow.innerHTML = isHidden ? '▼ ' : '► ';
        };

        acadBox.appendChild(header);
        acadBox.appendChild(content);
        container.appendChild(acadBox);
    }

    // --- Wealth Section ---
    const activeLuck = data.currentDaYun || (data.daYun && data.daYun.length > 0 ? data.daYun[0] : null);

    // [New] Engine-Driven Data Preparation
    let expertData = null;
    if (window.AnalysisEngine) {
        // 1. Identify Target (Primary Wealth > Secondary Wealth > Food > DM)
        const p = data.pillars;
        const allGods = [];
        p.forEach(pillar => {
            if (pillar.xml && pillar.xml.tenGod) allGods.push(pillar.xml.tenGod); // Stem
            if (pillar.xml && pillar.xml.hiddenGods) allGods.push(...pillar.xml.hiddenGods); // Branch
        });

        // Find best target
        let targetGod = '偏财';
        if (allGods.includes('正财')) targetGod = '正财';
        else if (allGods.includes('偏财')) targetGod = '偏财';
        else if (allGods.includes('食神')) targetGod = '食神'; // No wealth, check food
        else if (allGods.includes('伤官')) targetGod = '伤官';

        // 2. Get Physics Report
        expertData = window.AnalysisEngine.getExpertReport(targetGod, {
            ctx: data.ctx,
            pillars: data.pillars,
            daYunList: data.daYunList,
            currentDaYun: data.currentDaYun,
            selectedLiuNian: data.selectedLiuNian,
            bodyStrength: bs,
            yongElements: [yxj.yong],
            jiElements: [yxj.ji]
        });
        // console.log("Wealth Engine Report:", expertData);
    }

    const wealthResult = calculateWealthStatus({ ...data, bodyStrength: bs, profile: profile }, activeLuck, expertData);
    if (wealthResult) {
        const wealthBox = document.createElement('div');
        wealthBox.style.borderBottom = '1px solid #333';

        const header = document.createElement('div');
        header.style.padding = '12px 10px';
        header.style.cursor = 'pointer';
        header.style.display = 'flex';
        header.style.alignItems = 'center';

        const arrow = document.createElement('span');
        arrow.innerHTML = '► ';
        arrow.style.fontSize = '12px';
        arrow.style.marginRight = '8px';
        arrow.style.color = '#aaa';

        const titleText = document.createElement('span');
        titleText.textContent = '财富分析';
        titleText.style.fontWeight = 'bold';
        titleText.style.color = '#d35400';
        titleText.style.fontSize = '15px';

        header.appendChild(arrow);
        header.appendChild(titleText);

        const content = document.createElement('div');
        content.style.display = 'none';
        content.style.padding = '0 10px 15px 30px';
        content.style.fontSize = '14px';
        content.style.color = '#ccc';
        content.style.lineHeight = '1.6';

        let html = `<div><span style="color:#aaa;">财富层级:</span> <span style="color:#e67e22; font-weight:bold;">${wealthResult.level}</span></div>`;
        html += `<div style="margin-top:5px;"><span style="color:#aaa;">致富门路:</span> <span style="color:#f1c40f;">${wealthResult.source}</span></div>`;
        html += `<div style="margin-top:5px;"><span style="color:#aaa;">守财能力:</span> <span style="color:#3498db;">${wealthResult.habit}</span></div>`;
        html += `<div style="margin-top:5px; font-size:12px;"><span style="color:#777;">定义:</span> 财(${wealthResult.basicInfo.wealth || '无'}) 食伤(${wealthResult.basicInfo.food || '无'})</div>`;

        if (wealthResult.matchTerms && wealthResult.matchTerms.length > 0) {
            html += `<div style="margin-top:10px; border-top:1px dashed #444; padding-top:10px;">`;
            wealthResult.matchTerms.forEach(t => {
                html += `<div style="margin-bottom:8px;">` +
                    `<span style="color:#2ecc71; font-weight:bold;">• ${t.title}</span> ` +
                    `<span style="color:#999; font-size:12px;">(应验率${t.rate}%)</span>` +
                    `<div style="margin-left:14px; color:#aaa; font-size:13px; line-height:1.4;">${t.desc}</div>` +
                    `</div>`;
            });
            html += `</div>`;
        } else {
            html += `<div style="margin-top:8px; color:#666;">未匹配到典型财富断语</div>`;
        }

        content.innerHTML = html;

        header.onclick = () => {
            const isHidden = content.style.display === 'none';
            content.style.display = isHidden ? 'block' : 'none';
            arrow.innerHTML = isHidden ? '▼ ' : '► ';
        };

        wealthBox.appendChild(header);
        wealthBox.appendChild(content);
        container.appendChild(wealthBox);
    }

    // --- Marriage Section ---
    // [New] Engine-Driven Data Preparation (Marriage)
    let marriageExpertData = null;
    if (window.AnalysisEngine) {
        const p = data.pillars;
        const allGods = [];
        p.forEach(pillar => {
            if (pillar.xml && pillar.xml.tenGod) allGods.push(pillar.xml.tenGod);
            if (pillar.xml && pillar.xml.hiddenGods) allGods.push(...pillar.xml.hiddenGods);
        });

        const isMale = data.gender === '男';
        // Priority: Male->Wealth, Female->Officer
        let targetGod = isMale ? '正财' : '正官';
        if (isMale) {
            if (allGods.includes('正财')) targetGod = '正财';
            else if (allGods.includes('偏财')) targetGod = '偏财';
        } else {
            if (allGods.includes('正官')) targetGod = '正官';
            else if (allGods.includes('七杀')) targetGod = '七杀';
        }

        marriageExpertData = window.AnalysisEngine.getExpertReport(targetGod, {
            ctx: data.ctx,
            gender: data.gender,
            pillars: data.pillars,
            daYunList: data.daYunList,
            currentDaYun: data.currentDaYun,
            selectedLiuNian: data.selectedLiuNian,
            bodyStrength: bs,
            yongElements: [yxj.yong],
            jiElements: [yxj.ji]
        });
        // console.log("Marriage Engine Report:", marriageExpertData);
    }

    const marriageResult = calculateMarriageStatus({ ...data, bodyStrength: bs, profile: profile }, activeLuck, marriageExpertData);
    if (marriageResult) {
        const marBox = document.createElement('div');
        marBox.style.borderBottom = '1px solid #333';

        const header = document.createElement('div');
        header.style.padding = '12px 10px';
        header.style.cursor = 'pointer';
        header.style.display = 'flex';
        header.style.alignItems = 'center';

        const arrow = document.createElement('span');
        arrow.innerHTML = '► ';
        arrow.style.fontSize = '12px';
        arrow.style.marginRight = '8px';
        arrow.style.color = '#aaa';

        const titleText = document.createElement('span');
        titleText.textContent = '婚姻情感';
        titleText.style.fontWeight = 'bold';
        titleText.style.color = '#d35400'; // Standard Orange for Consistency
        titleText.style.fontSize = '15px';

        header.appendChild(arrow);
        header.appendChild(titleText);

        const content = document.createElement('div');
        content.style.display = 'none';
        content.style.padding = '0 10px 15px 30px';
        content.style.fontSize = '14px';
        content.style.color = '#ccc';
        content.style.lineHeight = '1.6';

        let html = `<div><span style="color:#aaa;">婚期倾向:</span> <span style="color:#f1c40f;">${marriageResult.timingSummary}</span></div>`;

        // Render Groups
        const renderGroup = (title, items, color) => {
            if (!items || items.length === 0) return '';
            let s = `<div style="margin-top:10px; border-top:1px dashed #444; padding-top:5px;"><span style="color:${color}; font-weight:bold; font-size:13px;">${title}</span>`;
            items.forEach(t => {
                s += `<div style="margin-top:6px; margin-left:8px;">` +
                    `<span style="color:#eee; font-weight:bold;">${t.title}</span>` +
                    `<div style="color:#aaa; font-size:12px;">${t.desc}</div>` +
                    `</div>`;
            });
            s += `</div>`;
            return s;
        };

        html += renderGroup('配偶性格', marriageResult.spouseCharacter, '#3498db');
        html += renderGroup('配偶外貌', marriageResult.appearance, '#9b59b6');
        html += renderGroup('婚期分析', marriageResult.timing, '#f39c12');

        html += renderGroup('美满良缘', marriageResult.good, '#2ecc71');
        html += renderGroup('情感历程 (婚前/其他)', marriageResult.premarital, '#e67e22'); // New Group
        html += renderGroup('婚姻隐患', marriageResult.issues, '#e74c3c');

        // Future Years
        if (marriageResult.futureYears && marriageResult.futureYears.length > 0) {
            html += `<div style="margin-top:15px; border-top:1px solid #555; padding-top:8px;">`;
            html += `<div style="color:#f1c40f; font-weight:bold; margin-bottom:5px;">💑 婚期(红鸾/动婚)预测:</div>`;
            html += `<div style="display:flex; flex-wrap:wrap; gap:8px;">`;
            marriageResult.futureYears.forEach(y => {
                html += `<div style="background:#333; padding:4px 8px; border-radius:4px; font-size:12px; border:1px solid #444;">` +
                    `<span style="color:#e67e22; font-weight:bold;">${y.year} (${y.ganZhi})</span>: ` +
                    `<span style="color:#ccc;">${y.reason}</span>` +
                    `</div>`;
            });
            html += `</div></div>`;
        }

        content.innerHTML = html;

        header.onclick = () => {
            const isHidden = content.style.display === 'none';
            content.style.display = isHidden ? 'block' : 'none';
            arrow.innerHTML = isHidden ? '▼ ' : '► ';
        };

        marBox.appendChild(header);
        marBox.appendChild(content);
        container.appendChild(marBox);
    }

    // --- San Ban Fu Section (Dedicated Top-Level) ---
    if (marriageResult && marriageResult.sanbanfu) {
        const sbf = marriageResult.sanbanfu;
        const categories = [
            { key: 'wealth', label: '💰 事业财富', color: '#f1c40f' },
            { key: 'marriage', label: '💑 婚姻情感', color: '#ff7675' },
            { key: 'health', label: '🏥 健康意外', color: '#55efc4' },
            { key: 'character', label: '🧠 性格见解', color: '#74b9ff' },
            { key: 'family', label: '🏡 六亲家庭', color: '#a29bfe' },
            { key: 'other', label: '🔮 其他断语', color: '#dfe6e9' }
        ];

        // Only show if at least one category has data
        const hasData = categories.some(cat => sbf[cat.key] && sbf[cat.key].length > 0);
        if (hasData) {
            const sbfBox = document.createElement('div');
            sbfBox.style.borderBottom = '1px solid #333';

            const header = document.createElement('div');
            header.style.padding = '12px 10px';
            header.style.cursor = 'pointer';
            header.style.display = 'flex';
            header.style.alignItems = 'center';

            const arrow = document.createElement('span');
            arrow.innerHTML = '► ';
            arrow.style.fontSize = '12px';
            arrow.style.marginRight = '8px';
            arrow.style.color = '#aaa';

            const titleText = document.createElement('span');
            titleText.textContent = '三板斧断语';
            titleText.style.fontWeight = 'bold';
            titleText.style.color = '#f1c40f';
            titleText.style.fontSize = '15px';

            header.appendChild(arrow);
            header.appendChild(titleText);

            const content = document.createElement('div');
            content.style.display = 'none';
            content.style.padding = '0 10px 15px 30px';
            content.style.fontSize = '13px';
            content.style.color = '#ccc';
            content.style.lineHeight = '1.6';

            let html = '';
            categories.forEach(cat => {
                const items = sbf[cat.key];
                if (items && items.length > 0) {
                    html += `<div style="margin-top:15px; margin-bottom:10px; color:${cat.color}; font-weight:bold; border-left:3px solid ${cat.color}; padding-left:8px;">${cat.label}</div>`;
                    items.forEach(t => {
                        html += `<div style="margin-bottom:10px; border-bottom:1px dashed #444; padding-bottom:6px; margin-left:10px;">` +
                            `<div style="color:${cat.color}; opacity:0.9; font-weight:bold;">${t.title}</div>` +
                            `<div style="color:#eee; margin-top:2px;">${t.desc}</div>` +
                            `</div>`;
                    });
                }
            });
            content.innerHTML = html;

            header.onclick = () => {
                const isHidden = content.style.display === 'none';
                content.style.display = isHidden ? 'block' : 'none';
                arrow.innerHTML = isHidden ? '▼ ' : '► ';
            };

            sbfBox.appendChild(header);
            sbfBox.appendChild(content);
            container.appendChild(sbfBox);
        }
    }
}


// Helper to show error in a modal (reusing select-modal or creating one)
function showModalError(msg) {
    const modal = document.getElementById('select-modal');
    const list = document.getElementById('select-list');
    const title = modal.querySelector('.picker-title');

    // Backup original state if needed? Simpler to just overwrite for now as this is blocking.
    title.textContent = "提示";
    list.innerHTML = '';

    const msgDiv = document.createElement('div');
    msgDiv.style.padding = '20px';
    msgDiv.style.color = '#fff';
    msgDiv.style.whiteSpace = 'pre-line'; // Allow newlines
    msgDiv.style.textAlign = 'center';
    msgDiv.textContent = msg;
    list.appendChild(msgDiv);

    // Add OK button
    const btnBox = document.createElement('div');
    btnBox.style.marginTop = '20px';
    btnBox.style.textAlign = 'center';
    const btn = document.createElement('button');
    btn.textContent = "确定";
    btn.className = "picker-btn-confirm";
    btn.style.width = '100px';
    btn.onclick = () => {
        modal.style.display = 'none';
        title.textContent = "选择日期"; // Reset title
    };
    btnBox.appendChild(btn);
    list.appendChild(btnBox);

    modal.style.display = 'flex';
}

// === Version Control ===
const APP_VERSION = 'v1.6.1';
function initVersion() {
    const vTop = document.getElementById('app-version-top');
    if (vTop) vTop.textContent = APP_VERSION;

    const vBot = document.getElementById('app-version-bottom');
    if (vBot) vBot.textContent = APP_VERSION;
}

// Init
initVersion();
