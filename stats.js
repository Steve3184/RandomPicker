const isElectron = typeof window.electronAPI !== 'undefined';

document.addEventListener('DOMContentLoaded', async () => {
    const tabsContainer = document.getElementById('tabsContainer');
    const topThreeContainer = document.getElementById('topThreeContainer');
    const rankingList = document.getElementById('rankingList');
    const noDataMessage = document.getElementById('noDataMessage');
    const footerBtn = document.getElementById('footerBtn');

    if (isElectron) {
        document.body.classList.add('is-electron');
        const closeBtn = document.getElementById('closeBtn');
        closeBtn.style.display = 'block';
        closeBtn.addEventListener('click', () => window.electronAPI.closeStatsWindow());
    }

    const settings = isElectron
        ? await window.electronAPI.getSettings()
        : JSON.parse(localStorage.getItem('pickerSettings') || '{}');

    if (settings.darkMode) {
        document.body.classList.add('dark-mode');
    }

    const presets = settings.presets || {};
    const presetNames = Object.keys(presets);

    function renderTabs() {
        tabsContainer.innerHTML = '';
        if (presetNames.length === 0) return;

        presetNames.forEach(name => {
            const tab = document.createElement('button');
            tab.className = 'tab-btn';
            tab.textContent = name;
            tab.dataset.preset = name;
            tab.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                tab.classList.add('active');
                renderStatsForPreset(name);
            });
            tabsContainer.appendChild(tab);
        });
    }

    function renderStatsForPreset(presetName) {
        topThreeContainer.innerHTML = '';
        rankingList.innerHTML = '';

        const preset = presets[presetName];
        const hitCounts = preset ? preset.hitCounts : {};

        if (!hitCounts || Object.keys(hitCounts).length === 0) {
            rankingList.innerHTML = '<li>该预设暂无抽中记录</li>';
            return;
        }

        const sortedData = Object.entries(hitCounts)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => {
                if (b.count !== a.count) return b.count - a.count;
                return new Date(b.lastDrawn) - new Date(a.lastDrawn);
            });

        const topThree = sortedData.slice(0, 3);
        const others = sortedData.slice(3);

        topThree.forEach((item, index) => {
            const rank = index + 1;
            const topItem = document.createElement('div');
            topItem.className = `top-item top-${rank}`;
            topItem.innerHTML = `
                        <div class="top-item-rank">${rank}</div>
                        <div class="top-item-name" title="${item.name}">${item.name}</div>
                        <div class="top-item-count">抽中 ${item.count} 次</div>
                    `;
            topThreeContainer.appendChild(topItem);
        });

        others.forEach(item => {
            const listItem = document.createElement('li');
            listItem.className = 'ranking-item';
            const lastDrawnDate = new Date(item.lastDrawn);
            const formattedTime = lastDrawnDate.toLocaleString('zh-CN', { dateStyle: 'short', timeStyle: 'short' });

            listItem.innerHTML = `
                        <div class="item-header">
                            <span class="item-name" title="${item.name}">${item.name}</span>
                            <span class="item-count">${item.count} 次</span>
                        </div>
                        <div class="item-time">最后抽中: ${formattedTime}</div>
                    `;
            rankingList.appendChild(listItem);
        });
    }

    if (presetNames.length > 0) {
        noDataMessage.style.display = 'none';
        renderTabs();
        const activePreset = settings.currentPresetName && presets[settings.currentPresetName]
            ? settings.currentPresetName
            : presetNames[0];

        const firstTab = tabsContainer.querySelector(`.tab-btn[data-preset="${activePreset}"]`);
        if (firstTab) {
            firstTab.click();
        }

    } else {
        noDataMessage.style.display = 'flex';
    }

    if (isElectron) {
        footerBtn.textContent = '关闭';
        footerBtn.addEventListener('click', () => window.electronAPI.closeStatsWindow());
    } else {
        footerBtn.textContent = '返回';
        footerBtn.addEventListener('click', () => window.location.href = 'index.html');
    }
});