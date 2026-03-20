/**
 * paipan_input.js - Bazi Paipan Input Module
 */

if (typeof GAN === 'undefined') window.GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
if (typeof ZHI === 'undefined') window.ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

const ITEM_HEIGHT = 40;

function div(className) {
    const d = document.createElement('div');
    if (className) d.className = className;
    return d;
}

window.initPaipanInput = function(config = {}) {
    const { onCalculate } = config;

    // DOM Elements
    const inputModeSelect = document.getElementById('input-mode');
    const dateModeContainer = document.getElementById('date-mode-container');
    const manualModeContainer = document.getElementById('manual-mode-container');
    const calTypeSelect = document.getElementById('cal-type');
    const leapContainer = document.getElementById('leap-container');
    const chkLeap = document.getElementById('chk-leap');
    const btnOpenPicker = document.getElementById('btn-open-picker');
    const lblDateTitle = document.getElementById('lbl-date-title');
    const btnCalc = document.getElementById('btn-calc');
    const chkUnknownHour = document.getElementById('chk-unknown-hour');
    const genderInput = document.getElementById('gender-input');

    const hYear = document.getElementById('h-year');
    const hMonth = document.getElementById('h-month');
    const hDay = document.getElementById('h-day');
    const hHour = document.getElementById('h-hour');
    const hMin = document.getElementById('h-min');

    const wheelYear = document.getElementById('wheel-year');
    const wheelMonth = document.getElementById('wheel-month');
    const wheelDay = document.getElementById('wheel-day');
    const wheelHour = document.getElementById('wheel-hour');
    const wheelMin = document.getElementById('wheel-min');

    const pickerModal = document.getElementById('picker-modal');
    const pickerCancel = document.getElementById('picker-cancel');
    const pickerConfirm = document.getElementById('picker-confirm');

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

    if (calTypeSelect) {
        calTypeSelect.addEventListener('change', (e) => {
            if (e.target.value == 1) {
                if (leapContainer) leapContainer.style.display = 'flex';
                if (lblDateTitle) lblDateTitle.textContent = '出生时间 (农历)';
            } else {
                if (leapContainer) leapContainer.style.display = 'none';
                if (lblDateTitle) lblDateTitle.textContent = '出生时间 (公历)';
            }
        });
    }

    function updateButtonText() {
        if (!btnOpenPicker || !hYear) return;
        const y = hYear.value;
        const m = String(hMonth.value).padStart(2, '0');
        const d = String(hDay.value).padStart(2, '0');
        const h = String(hHour.value).padStart(2, '0');
        const mi = String(hMin.value).padStart(2, '0');
        const isUnknown = chkUnknownHour?.checked;
        btnOpenPicker.textContent = isUnknown ? `${y}-${m}-${d} (时辰不详)` : `${y}-${m}-${d} ${h}:${mi}`;
    }

    if (btnOpenPicker) {
        btnOpenPicker.onclick = () => {
            if (pickerModal) pickerModal.style.display = 'flex';
            const now = new Date();
            const y = parseInt(hYear.value) || now.getFullYear();
            const m = parseInt(hMonth.value) || (now.getMonth() + 1);
            const d = parseInt(hDay.value) || now.getDate();
            const h = parseInt(hHour.value) || now.getHours();
            const mi = parseInt(hMin.value) || 0;

            createWheel(wheelYear, 1900, 2100, false, '年');
            createWheel(wheelMonth, 1, 12, true, '月');
            createWheel(wheelDay, 1, 31, true, '日');
            createWheel(wheelHour, 0, 23, true, '时');
            createWheel(wheelMin, 0, 59, true, '分');

            setTimeout(() => {
                scrollToVal(wheelYear, y, 1900);
                scrollToVal(wheelMonth, m, 1);
                scrollToVal(wheelDay, d, 1);
                scrollToVal(wheelHour, h, 0);
                scrollToVal(wheelMin, mi, 0);
            }, 50);
        };
    }

    if (pickerCancel) pickerCancel.onclick = () => pickerModal.style.display = 'none';
    if (pickerConfirm) {
        pickerConfirm.onclick = () => {
            hYear.value = getScrollVal(wheelYear, 1900);
            hMonth.value = getScrollVal(wheelMonth, 1);
            hDay.value = getScrollVal(wheelDay, 1);
            hHour.value = getScrollVal(wheelHour, 0);
            hMin.value = getScrollVal(wheelMin, 0);
            updateButtonText();
            pickerModal.style.display = 'none';
        };
    }

    if (chkUnknownHour) chkUnknownHour.onchange = updateButtonText;

    if (btnCalc) {
        btnCalc.onclick = () => {
            const mode = inputModeSelect.value;
            const gender = genderInput ? genderInput.value : '1';
            let inputData = { mode, gender };
            if (mode == 0) {
                inputData.year = parseInt(hYear.value);
                inputData.month = parseInt(hMonth.value);
                inputData.day = parseInt(hDay.value);
                inputData.hour = parseInt(hHour.value);
                inputData.min = parseInt(hMin.value);
                inputData.calType = calTypeSelect.value;
                inputData.isLeap = chkLeap ? chkLeap.checked : false;
                inputData.isUnknownHour = chkUnknownHour ? chkUnknownHour.checked : false;
            } else {
                const gz = [];
                document.querySelectorAll('#manual-mode-container select').forEach(s => gz.push(s.value));
                inputData.gz = gz;
            }
            if (onCalculate) onCalculate(inputData);
        };
    }

    initManualSelectors();
    updateButtonText();
};

function createWheel(container, start, end, pad = false, suffix = '') {
    if (!container) return;
    container.innerHTML = '';
    container.appendChild(div('picker-spacer'));
    container.onscroll = () => {
        const idx = Math.round(container.scrollTop / ITEM_HEIGHT);
        container.querySelectorAll('.picker-item').forEach((it, i) => {
            if (i === idx) it.classList.add('selected');
            else it.classList.remove('selected');
        });
    };
    for (let i = start; i <= end; i++) {
        const item = div('picker-item');
        item.textContent = (pad && i < 10 ? '0' + i : i) + suffix;
        item.dataset.val = i;
        item.addEventListener('click', () => container.scrollTo({ top: (i - start) * ITEM_HEIGHT, behavior: 'smooth' }));
        container.appendChild(item);
    }
    container.appendChild(div('picker-spacer'));
}

function scrollToVal(container, val, start) {
    if (!container) return;
    container.scrollTop = (val - start) * ITEM_HEIGHT;
    setTimeout(() => { if (container.onscroll) container.onscroll(); }, 10);
}

function getScrollVal(container, start) {
    if (!container) return start;
    return start + Math.round(container.scrollTop / ITEM_HEIGHT);
}

function initManualSelectors() {
    const pairs = [['mz-y-gan', 'mz-y-zhi'], ['mz-m-gan', 'mz-m-zhi'], ['mz-d-gan', 'mz-d-zhi'], ['mz-t-gan', 'mz-t-zhi']];
    pairs.forEach(pair => {
        const selGan = document.getElementById(pair[0]);
        const selZhi = document.getElementById(pair[1]);
        if (!selGan || !selZhi) return;
        selGan.innerHTML = '';
        if (pair[0] === 'mz-t-gan') {
            const opt = document.createElement('option');
            opt.value = 'unknown'; opt.textContent = '不详';
            selGan.appendChild(opt);
        }
        GAN.forEach(g => {
            const opt = document.createElement('option');
            opt.value = g; opt.textContent = g;
            selGan.appendChild(opt);
        });
        const updateZhi = () => {
            if (pair[0] === 'mz-t-gan' && selGan.value === 'unknown') {
                selZhi.innerHTML = '<option value="unknown">不详</option>';
                selZhi.disabled = true;
                return;
            }
            selZhi.disabled = false;
            const gIdx = GAN.indexOf(selGan.value);
            const gParity = gIdx % 2;
            const oldVal = selZhi.value;
            selZhi.innerHTML = '';
            ZHI.forEach((z, zIdx) => {
                if (zIdx % 2 === gParity) {
                    const opt = document.createElement('option');
                    opt.value = z; opt.textContent = z;
                    selZhi.appendChild(opt);
                }
            });
            if (Array.from(selZhi.options).some(o => o.value === oldVal)) selZhi.value = oldVal;
        };
        selGan.addEventListener('change', updateZhi);
        updateZhi();
    });
}
