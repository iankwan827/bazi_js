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
    leftTitle.textContent = '鍘熷眬鍏崇郴';
    leftTitle.style.fontWeight = 'bold';
    leftTitle.style.marginBottom = '5px';
    leftTitle.style.color = '#ccc';
    leftCol.appendChild(leftTitle);
    leftCol.appendChild(createInterRow('澶╁共:', originalInter.stems.join(' ') || '鏃?));
    leftCol.appendChild(createInterRow('鍦版敮:', originalInter.branches.join(' ') || '鏃?));



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

    let stemsStr = "鏃?;
    let branchesStr = "鏃?;
    let titleStr = "澶ц繍/娴佸勾鍏崇郴";

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
            stemsStr = dynRes.stems.join(' ') || "鏃?;
            branchesStr = dynRes.branches.join(' ') || "鏃?;
            titleStr = `澶ц繍(${dyObj.gan}${dyObj.zhi}) 娴佸勾(${lnObj.gan}${lnObj.zhi}) 鍏崇郴`;
        }
    }

    const rightTitle = div('inter-title');
    rightTitle.textContent = titleStr;
    rightTitle.style.fontWeight = 'bold';
    rightTitle.style.marginBottom = '5px';
    rightTitle.style.color = '#d35400';
    rightCol.appendChild(rightTitle);
    rightCol.appendChild(createInterRow('澶╁共:', stemsStr));
    rightCol.appendChild(createInterRow('鍦版敮:', branchesStr));
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

    const headers = ["骞存煴", "鏈堟煴", "鏃ユ煴", "鏃舵煴", "澶ц繍", "娴佸勾"];
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
    tenGodHeader.textContent = '鍗佺';
    chartGrid.appendChild(tenGodHeader);

    cols.forEach(col => {
        const cell = div('cell');
        if (col.isUnknown) {
            // Empty cell for unknown
        } else {
            const span = div('ten-god');
            span.textContent = col.tenGod;
            if (['鎵?, '璐?].includes(col.tenGod)) span.style.color = '#27ae60';
            if (['鏉€', '瀹?].includes(col.tenGod)) span.style.color = '#e74c3c';
            cell.appendChild(span);
        }
        chartGrid.appendChild(cell);
    });

    // 3. Gan Row
    const ganHeader = div('row-header-cell');
    ganHeader.textContent = '澶╁共';
    chartGrid.appendChild(ganHeader);

    cols.forEach(col => {
        const cell = div('cell');
        const span = div('pillar-char');
        // Handle Unknown Hour
        if (col.isUnknown) {
            span.textContent = "鏈煡";
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
    zhiHeader.textContent = '鍦版敮';
    chartGrid.appendChild(zhiHeader);

    cols.forEach(col => {
        const cell = div('cell');
        const span = div('pillar-char');
        if (col.isUnknown) {
            span.textContent = "鏈煡";
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
    hiddenHeader.textContent = '钘忓共';
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
    nayinHeader.textContent = '绾抽煶';
    chartGrid.appendChild(nayinHeader);

    cols.forEach(col => {
        const cell = div('cell');
        cell.style.fontSize = '12px';
        cell.textContent = col.naYin;
        chartGrid.appendChild(cell);
    });

    // 7. Kong Wang
    const kwHeader = div('row-header-cell');
    kwHeader.textContent = '绌轰骸';
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
    shenShaHeader.textContent = '绁炵厼';
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
    titleCell.textContent = '澶ц繍';
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
        info.innerHTML = `${dy.startAge}宀?br>${dy.startYear}`;

        dyCell.append(gz, info);
        dyCell.addEventListener('click', () => selectDaYun(dy, data));
        grid.appendChild(dyCell);
    });

    // LIU NIAN ROWS
    for (let r = 0; r < 10; r++) {
        const leftHeader = div('matrix-cell matrix-title sticky-left');
        if (r === 4) leftHeader.textContent = "娴佸勾";
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
                const MAIN_QI = { '瀛?: '鐧?, '涓?: '宸?, '瀵?: '鐢?, '鍗?: '涔?, '杈?: '鎴?, '宸?: '涓?, '鍗?: '涓?, '鏈?: '宸?, '鐢?: '搴?, '閰?: '杈?, '鎴?: '鎴?, '浜?: '澹? };
                const GAN = ["鐢?, "涔?, "涓?, "涓?, "鎴?, "宸?, "搴?, "杈?, "澹?, "鐧?];

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

                    if (elDiff === 0) godStr = samePol ? '姣旇偐' : '鍔储';
                    else if (elDiff === 1) godStr = samePol ? '椋熺' : '浼ゅ畼';
                    else if (elDiff === 2) godStr = samePol ? '鍋忚储' : '姝ｈ储';
                    else if (elDiff === 3) godStr = samePol ? '涓冩潃' : '姝ｅ畼';
                    else if (elDiff === 4) godStr = samePol ? '鍋忓嵃' : '姝ｅ嵃';

                    // Color Logic
                    if (['姝ｈ储', '鍋忚储', '鎵?, '璐?].includes(godStr)) godColor = '#27ae60'; // Green
                    else if (['姝ｅ畼', '涓冩潃', '瀹?, '鏉€'].includes(godStr)) godColor = '#e74c3c'; // Red
                    else if (['椋熺', '浼ゅ畼', '椋?, '浼?].includes(godStr)) godColor = '#2980b9'; // Blue
                    else if (['姝ｅ嵃', '鍋忓嵃', '鍗?, '鏋?].includes(godStr)) godColor = '#9b59b6'; // Purple
                    else if (['姣旇偐', '鍔储', '姣?, '鍔?].includes(godStr)) godColor = '#e67e22'; // Orange
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
