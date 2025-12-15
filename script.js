const isElectron = typeof window.electronAPI !== 'undefined';
let settings;
class WheelOfNames {
    constructor() {
        this.canvas = document.getElementById('wheelCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.spinButtonsContainer = document.getElementById('spinButtonsContainer');
        this.spinOneButton = document.getElementById('spinOneButton');
        this.spinMultipleButton = document.getElementById('spinMultipleButton');
        this.namesInput = document.getElementById('namesInput');
        this.titleInput = document.getElementById('titleInput');
        this.winnerDisplay = document.getElementById('winnerDisplay');
        this.historyList = document.getElementById('historyList');
        this.canvasResolutionInput = document.getElementById('canvasResolution');
        this.sidebar = document.getElementById('sidebar');
        this.sidebarToggle = document.getElementById('sidebarToggle');

        this.currentRotation = 0;
        this.isSpinning = false;
        this.animationId = null;
        this.firstTime = true;
        this.spinCount = 1;
        this.winners = [];
        this.spinIntervals = [];
        this.currentSpinIndex = 0;
        this.totalAnimationFrames = 0;
        this.currentAnimationFrame = 0;
        this.backupWinners = [];
        this.animationStartTime = 0;
        this.lastAngularVelocity = 0;
        this.errorDetected = false;
        this.currentPresetName = '';
        this.targetMaxSpeed = 0;
        this.lastSegmentIndex = -1;

        // this.colors = [
        //     '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
        //     '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
        //     '#10AC84', '#EE5A24', '#0984E3', '#6C5CE7', '#A29BFE',
        //     '#FD79A8', '#FDCB6E', '#6C5CE7', '#74B9FF', '#00B894'
        // ];

        this.colors = [
            '#dd3242', '#f45542', '#f97827', '#fca313',
            '#ffe503', '#a1cf49', '#01ae5c', '#019a85',
            '#2656ab', '#7943a3', '#a23ca2', '#af2f79'
        ]

        this.initialWindowWidth = window.innerWidth;
        this.initialWindowHeight = window.innerHeight;

        this.initEventListeners();
        this.loadSettings();
        this.checkQueryParams();
        setTimeout(() => { this.drawWheel(); }, 1);
    }

    initEventListeners() {
        this.spinOneButton.addEventListener('click', () => this.spin(1));
        this.canvas.addEventListener('click', () => this.spin(1));
        this.spinMultipleButton.addEventListener('click', () => this.showMultipleSpinOptions());
        this.namesInput.addEventListener('input', () => {
            this.drawWheel();
            this.saveSettings();
        });
        this.titleInput.addEventListener('input', () => {
            this.updateTitle();
            this.saveSettings();
        });

        document.getElementById('sidebarToggle').addEventListener('click', () => {
            this.toggleSidebar();
        });

        document.getElementById('spinDamping').addEventListener('input', (e) => {
            document.getElementById('dampingValue').textContent = e.target.value;
            this.saveSettings();
        });

        document.getElementById('spinSpeed').addEventListener('input', (e) => {
            document.getElementById('speedValue').textContent = e.target.value;
            this.saveSettings();
        });

        document.getElementById('spinSoundVolume').addEventListener('input', (e) => {
            document.getElementById('spinSoundVolumeValue').textContent = e.target.value;
            this.saveSettings();
        });

        document.getElementById('canvasResolution').addEventListener('input', (e) => {
            this.updateCanvasResolution(parseInt(e.target.value));
            this.saveSettings();
        });

        document.getElementById('removeWinner').addEventListener('change', () => {
            this.saveSettings();
        });

        document.querySelectorAll('input[name="displayMode"]').forEach(radio => {
            radio.addEventListener('change', () => {
                this.saveSettings();
            });
        });
        document.getElementById('floatBallColor').addEventListener('change', () => {
            if (isElectron) {
                window.electronAPI.reloadFloatBall();
            }
            this.saveSettings();
        });
        document.getElementById('floatBallOpacity').addEventListener('change', (e) => {
            if (isElectron) {
                window.electronAPI.reloadFloatBall();
            }
            document.getElementById('floatBallOpacityValue').textContent = e.target.value;
            this.saveSettings();
        });
        document.getElementById('floatBallText').addEventListener('change', () => {
            if (isElectron) {
                window.electronAPI.reloadFloatBall();
            }
            this.saveSettings();
        });
        document.getElementById('floatBallFontSize').addEventListener('change', (e) => {
            if (isElectron) {
                window.electronAPI.reloadFloatBall();
            }
            document.getElementById('floatBallFontSizeValue').textContent = e.target.value;
            this.saveSettings();
        });
        document.getElementById('autoStart').addEventListener('change', () => {
            this.saveSettings();
        });
        document.querySelectorAll('input[name="floatBallBackground"]').forEach((el) => {
            el.addEventListener('change', (e) => {
                if (isElectron) {
                    window.electronAPI.reloadFloatBall();
                }
                this.saveSettings();
            });
        })
        document.getElementById('enableFloatBall').addEventListener('change', (e) => {
            if (isElectron) {
                window.electronAPI.toggleFloatBall(e.target.checked);
                window.electronAPI.reloadFloatBall();
            }
            this.saveSettings();
        });
        document.getElementById('darkModeToggle').addEventListener('change', (e) => {
            document.body.classList.toggle('dark-mode', e.target.checked);
            this.saveSettings();
        });
        document.getElementById('savePresetBtn').addEventListener('click', () => this.savePreset());
        document.getElementById('viewStatsBtn').addEventListener('click', () => {
            if (isElectron) {
                window.electronAPI.openStatsWindow(this.currentPresetName);
            } else {
                window.location.href = `stats.html`;
            }
        });
        if (isElectron) {
            document.getElementById('closeBtn').addEventListener('click', () => window.electronAPI.closeMainWindow());
            document.getElementById('checkForUpdatesBtn').addEventListener('click', () => {
                window.electronAPI.openUpdaterWindow();
            });
            window.electronAPI.onSpinFromFloat(() => {
                this.spin(1);
            });
        }

        document.getElementById('winnerModal').addEventListener('click', (e) => {
            if (e.target.id === 'winnerModal') {
                this.closeModal();
            }
        });

        document.getElementById('closeModalButton').addEventListener('click', () => this.closeModal());
        if (isElectron) {
            document.querySelector('.window-controls').style.display = 'block';
            document.getElementById('electronSettings').style.display = 'block';
            document.body.classList.add('is-electron');
        }

        window.shuffleNames = () => {
            let lines = this.namesInput.value.replaceAll('\n\n').split('\n');
            for (let i = lines.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [lines[i], lines[j]] = [lines[j], lines[i]];
            }
            this.namesInput.value = lines.join('\n');
            this.drawWheel();
            this.saveSettings();
        };

        window.clearNames = async () => {
            if (await confirm('确认清空列表?')) {
                this.namesInput.value = '';
                this.drawWheel();
                this.saveSettings();
            }
        };
    }

    checkQueryParams() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('settings') === 'hide') {
            document.body.classList.add('settings-hidden');
            document.getElementById('sidebar').style.display = 'none';
        }
    }

    updateTitle() {
        const title = this.titleInput.value || '随机抽取';
        document.getElementById('pageTitle').textContent = title;
        document.getElementById('mainTitle').innerHTML = `${title}`;
    }

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('mainContent');
        const toggle = document.getElementById('sidebarToggle');
        const isOpened = sidebar.classList.contains('open');
        setTimeout(() => {
            sidebar.classList.toggle('open');
            mainContent.classList.toggle('sidebar-open');
            toggle.textContent = sidebar.classList.contains('open') ? '✖️' : '⚙️';
        }, 5);

        if (isElectron) {
            const sidebarWidth = 380;
            if (!isOpened) {
                window.electronAPI.resizeMainWindow({
                    width: this.initialWindowWidth + sidebarWidth,
                    height: this.initialWindowHeight,
                    animate: true
                });
            } else {
                window.electronAPI.resizeMainWindow({
                    width: this.initialWindowWidth,
                    height: this.initialWindowHeight,
                    animate: true
                });
            }
        }
    }

    updateCanvasResolution(size) {
        this.canvas.width = size + 16;
        this.canvas.height = size;
        document.getElementById('canvasResolutionValue').textContent = `${this.canvas.width}x${this.canvas.height}`;
        this.drawWheel();
    }

    showMultipleSpinOptions() {
        this.spinButtonsContainer.innerHTML = `
            <button class="spin-button" id="backButton">返回</button>
            <button class="spin-button spin-number-button" data-count="2">2</button>
            <button class="spin-button spin-number-button" data-count="3">3</button>
            <button class="spin-button spin-number-button" data-count="4">4</button>
            <button class="spin-button spin-number-button" data-count="5">5</button>
            <button class="spin-button spin-number-button" data-count="6">6</button>
        `;
        document.getElementById('backButton').addEventListener('click', () => this.resetSpinButtons());
        document.querySelectorAll('.spin-number-button').forEach(button => {
            button.addEventListener('click', (e) => this.spin(parseInt(e.target.dataset.count)));
        });
    }

    resetSpinButtons() {
        this.spinButtonsContainer.innerHTML = `
            <button class="spin-button" id="spinOneButton">🎲 抽一个</button>
            <button class="spin-button" id="spinMultipleButton">➕ 抽多个</button>
        `;
        this.spinOneButton = document.getElementById('spinOneButton');
        this.spinMultipleButton = document.getElementById('spinMultipleButton');
        this.spinOneButton.addEventListener('click', () => this.spin(1));
        this.spinMultipleButton.addEventListener('click', () => this.showMultipleSpinOptions());
    }

    getNames() {
        return this.namesInput.value
            .split('\n')
            .map(name => name.trim())
            .filter(name => name.length > 0);
    }

    drawWheel() {
        const names = this.getNames();
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 10;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (names.length === 0) {
            this.drawEmptyWheel(centerX, centerY, radius);
            return;
        }

        const anglePerSegment = (Math.PI * 2) / names.length;
        let currentAngle = this.currentRotation * Math.PI / 180;

        names.forEach((name, index) => {
            const color = this.colors[index % this.colors.length];

            this.ctx.beginPath();
            this.ctx.moveTo(centerX, centerY);
            this.ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + anglePerSegment);
            this.ctx.closePath();
            this.ctx.fillStyle = color;
            this.ctx.fill();
            // this.ctx.strokeStyle = '#fff';
            // this.ctx.lineWidth = 1;
            // this.ctx.stroke();
            this.ctx.save();
            this.ctx.translate(centerX, centerY);
            this.ctx.rotate(currentAngle + anglePerSegment / 2);
            this.ctx.textAlign = 'right';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillStyle = '#fff';
            this.ctx.font = `bold ${Math.max(58 - names.length * 0.55, 6)}px Arial`;
            this.ctx.shadowColor = 'rgba(0,0,0,0.5)';
            this.ctx.shadowBlur = 2;
            if (name.length > 7) {
                this.ctx.fillText(name.slice(0, 7) + '...', radius * 0.93, 0);
            } else {
                this.ctx.fillText(name, radius * 0.93, 0);
            }
            this.ctx.restore();

            currentAngle += anglePerSegment;
        });

        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, 60, 0, Math.PI * 2);
        this.ctx.fillStyle = '#ddd';
        this.ctx.fill();
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 8;
        this.ctx.stroke();

        this.drawArrow(centerX, centerY, radius, names);

        if (this.firstTime && names.length > 0) {
            this.drawFirstTimeHint(centerX, centerY);
        }
    }

    drawEmptyWheel(centerX, centerY, radius) {
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = '#f0f0f0';
        this.ctx.fill();
        this.ctx.strokeStyle = '#ddd';
        this.ctx.lineWidth = 8;
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, 60, 0, Math.PI * 2);
        this.ctx.fillStyle = '#ccc';
        this.ctx.fill();
        this.ctx.fillStyle = '#666';
        this.ctx.font = 'bold 34px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('请在设置中添加名单', centerX, centerY);
        this.drawArrow(centerX, centerY, radius, [], '#ccc');
    }

    drawFirstTimeHint(centerX, centerY) {
        this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
        this.ctx.font = 'bold 34px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = '#222';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('点击转盘开始', centerX, centerY);
    }

    drawArrow(centerX, centerY, radius, names = [], defaultColor = null) {
        const arrowColor = this.getArrowColor(names, defaultColor);
        const arrowSize = 40;
        const arrowDistance = radius + 10;

        this.ctx.save();
        this.ctx.translate(centerX + arrowDistance, centerY);

        this.ctx.beginPath();
        this.ctx.moveTo(0, -arrowSize / 2);
        this.ctx.lineTo(-arrowSize * 1.5, 0);
        this.ctx.lineTo(0, arrowSize / 2);
        this.ctx.closePath();
        this.ctx.fillStyle = arrowColor;
        this.ctx.fill();
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.moveTo(0, -arrowSize / 2);
        this.ctx.lineTo(arrowSize / 2, 0);
        this.ctx.lineTo(0, arrowSize / 2);
        this.ctx.closePath();
        this.ctx.fillStyle = arrowColor;
        this.ctx.fill();
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        this.ctx.shadowColor = 'rgba(0,0,0,0.3)';
        this.ctx.shadowBlur = 5;
        this.ctx.shadowOffsetX = 2;
        this.ctx.shadowOffsetY = 2;

        this.ctx.restore();
    }

    getArrowColor(names, defaultColor) {
        if (defaultColor) return defaultColor;
        if (names.length === 0) return '#ccc';

        const anglePerSegment = 360 / names.length;
        const normalizedAngle = (360 - (this.currentRotation % 360)) % 360;
        const targetIndex = Math.floor(normalizedAngle / anglePerSegment);

        return this.colors[targetIndex % this.colors.length];
    }

    spin(count = 1) {
        if (this.isSpinning) return;
        this.closeModal();
        document.getElementById('customModal').style.display = 'none';
        this.spinCount = count;
        this.winners = [];
        this.currentSpinIndex = 0;
        this.backupWinners = [];

        const names = this.getNames();
        if (names.length === 0) {
            this.toggleSidebar();
            return;
        }

        if (count > 1) {
            const allNames = [...names];
            const availableNames = allNames.filter(name => !this.winners.includes(name));

            for (let i = 0; i < 2 && availableNames.length > 0; i++) {
                const randomIndex = Math.floor(Math.random() * availableNames.length);
                this.backupWinners.push(availableNames[randomIndex]);
                availableNames.splice(randomIndex, 1);
            }
            console.log('prepared backup object:', this.backupWinners);
        }

        this.firstTime = false;
        this.isSpinning = true;
        if (this.spinOneButton && this.spinOneButton.parentNode === this.spinButtonsContainer) {
            this.spinOneButton.disabled = true;
            this.spinMultipleButton.disabled = true;
            this.spinOneButton.textContent = `🎯 抽取${count}个中...`;
        } else {
            this.spinButtonsContainer.querySelectorAll('.spin-button').forEach(button => {
                button.disabled = true;
                if (button.id === 'backButton') {
                    button.textContent = `🎯 抽取${count}个中...`;
                } else {
                    // button.textContent = '🎯';
                    button.style.display = 'none';
                }
            });
        }
        this.winnerDisplay.style.display = 'none';
        const spinDamping = parseFloat(document.getElementById('spinDamping').value);
        const spinSpeed = parseInt(document.getElementById('spinSpeed').value);

        this.targetMaxSpeed = spinSpeed * 2 + Math.random() * 10;

        if (count > 1) {
            this.spinIntervals = [];

            let frames = 0;
            let simAngularVelocity = 0;
            const acceleration = 0.2;
            const maxAngularVelocity = this.targetMaxSpeed;

            while (simAngularVelocity < maxAngularVelocity) {
                simAngularVelocity += acceleration;
                frames++;
            }

            while (simAngularVelocity > 0.01) {
                simAngularVelocity *= spinDamping;
                frames++;
            }

            this.totalAnimationFrames = frames;
            console.log('Total animation frames:', this.totalAnimationFrames);

            const frameInterval = Math.floor(this.totalAnimationFrames / count);
            for (let i = 0; i < count; i++) {
                this.spinIntervals.push((i + 1) * frameInterval);
            }
            console.log('Spin intervals (frames):', this.spinIntervals);
        } else {
            this.spinIntervals = [];
            this.totalAnimationFrames = 0;
        }

        this.currentAnimationFrame = 0;
        this.animationStartTime = performance.now();
        this.lastAngularVelocity = 0;
        this.errorDetected = false;
        this.startSpinAnimation(names);
    }

    playDingSound() {
        const ding = new Audio('ding.mp3');
        const volume = parseInt(document.getElementById('spinSoundVolume').value) / 10 * 0.1;
        ding.volume = volume;
        ding.play().catch(e => console.error("err playing ding:", e));
    }

    startSpinAnimation(names) {
        const spinDamping = parseFloat(document.getElementById('spinDamping').value);
        const spinSpeed = parseInt(document.getElementById('spinSpeed').value);

        let angularVelocity = 0;
        let animationPhase = 'accelerating';
        const acceleration = 0.4;
        const maxAngularVelocity = this.targetMaxSpeed;

        console.log('start spin with max target angularVelocity:', maxAngularVelocity);

        const animate = () => {
            if (this.errorDetected) {
                cancelAnimationFrame(this.animationId);
                return;
            }

            this.currentAnimationFrame++;

            if (animationPhase === 'accelerating') {
                angularVelocity += acceleration;
                if (angularVelocity >= maxAngularVelocity) {
                    angularVelocity = maxAngularVelocity;
                    animationPhase = 'decelerating';
                }
            } else { // decelerating
                angularVelocity *= spinDamping;
            }

            this.currentRotation += angularVelocity;

            if (names.length > 0) {
                const anglePerSegment = 360 / names.length;
                const normalizedAngle = (360 - (this.currentRotation % 360)) % 360;
                const currentSegmentIndex = Math.floor(normalizedAngle / anglePerSegment);

                if (this.lastSegmentIndex !== -1 && currentSegmentIndex !== this.lastSegmentIndex) {
                    this.playDingSound();
                }
                this.lastSegmentIndex = currentSegmentIndex;
            }

            this.drawWheel();

            const elapsedTime = performance.now() - this.animationStartTime;
            if (elapsedTime > 15000) {
                if (angularVelocity > 0.01) {
                    this.errorDetected = true;
                    cancelAnimationFrame(this.animationId);
                    alert(`转盘出现严重错误！旋转超时！当前参数：旋转速度: ${angularVelocity.toFixed(4)} 阻尼: ${spinDamping} 初始速度: ${spinSpeed} 旋转角度: ${this.currentRotation.toFixed(2)}`);
                    this.onSpinComplete(names);
                    return;
                }
            }

            if (this.lastAngularVelocity > 0.01 && animationPhase === 'decelerating' && angularVelocity > this.lastAngularVelocity * 1.05) {
                this.errorDetected = true;
                cancelAnimationFrame(this.animationId);
                alert(`转盘出现严重错误！速度异常增加！当前参数：当前速度: ${angularVelocity.toFixed(4)} 上次速度: ${this.lastAngularVelocity.toFixed(4)} 阻尼: ${spinDamping} 初始速度: ${spinSpeed} 旋转角度: ${this.currentRotation.toFixed(2)}`);
                this.onSpinComplete(names);
                return;
            }
            this.lastAngularVelocity = angularVelocity;


            if (this.spinCount > 1 && this.currentSpinIndex <= this.spinCount) {
                if (this.currentAnimationFrame >= this.spinIntervals[this.currentSpinIndex]) {
                    const normalizedAngle = (360 - (this.currentRotation % 360)) % 360;
                    const anglePerSegment = 360 / names.length;
                    const winnerIndex = Math.floor(normalizedAngle / anglePerSegment);
                    const winner = names[winnerIndex];
                    this.winners.push(winner);

                    if (document.getElementById('removeWinner').checked) {
                        this.removeWinnerFromList(winner);
                    }
                    this.currentSpinIndex++;
                    console.log(`Picked winner ${this.currentSpinIndex}: ${winner} at frame ${this.currentAnimationFrame}`);
                }
            }
            if (angularVelocity <= 0.01 && animationPhase === 'decelerating') {
                this.drawWheel();
                setTimeout(() => { this.onSpinComplete(names) }, 400);
            } else {
                this.animationId = requestAnimationFrame(animate);
            }
        };

        this.animationId = requestAnimationFrame(animate);
    }

    onSpinComplete(names) {
        if (this.spinCount === 1 && this.winners.length === 0) {
            const normalizedAngle = (360 - (this.currentRotation % 360)) % 360;
            const anglePerSegment = 360 / names.length;
            const winnerIndex = Math.floor(normalizedAngle / anglePerSegment);
            const winner = names[winnerIndex];
            this.winners.push(winner);
            this.addToHistory(winner);

            if (document.getElementById('removeWinner').checked) {
                this.removeWinnerFromList(winner);
            }
        }

        if (this.spinCount > 1) {
            let finalWinners = [];
            let usedBackupWinners = new Set();
            let isLess = this.winners.length < this.spinCount;
            for (let i = 0; i < this.winners.length; i++) {
                let currentWinner = this.winners[i];
                let isDuplicate = finalWinners.includes(currentWinner);
                if (isLess) isDuplicate == true;
                if (isDuplicate) {
                    let replaced = false;
                    for (let j = 0; j < this.backupWinners.length; j++) {
                        const backup = this.backupWinners[j];
                        if (!finalWinners.includes(backup) && !usedBackupWinners.has(backup)) {
                            finalWinners.push(backup);
                            usedBackupWinners.add(backup);
                            console.log(`replaced "${currentWinner}" x2 with "${backup}"`);
                            replaced = true;
                            break;
                        }
                    }
                    if (isLess) replaced = false;
                    if (!replaced) {
                        finalWinners.push(currentWinner);
                        console.log(`replace object "${currentWinner}" failed!`);
                        if (isLess) isLess = false;
                    }
                } else {
                    finalWinners.push(currentWinner);
                }
            }
            this.winners = finalWinners;
            this.winners.forEach((a) => {this.addToHistory(a);});
        }

        this.showWinner(this.winners);
        this.isSpinning = false;

        if (this.spinCount === 1) {
            this.spinOneButton.disabled = false;
            this.spinMultipleButton.disabled = false;
            this.spinOneButton.textContent = '🎲 抽一个';
            this.spinButtonsContainer.querySelectorAll('.spin-button').forEach(button => {
                button.disabled = false;
                if (button.id === 'backButton') {
                    button.textContent = '返回';
                } else {
                    button.style.display = '';
                    // button.textContent = button.dataset.count;
                }
            });
        } else {
            this.spinButtonsContainer.querySelectorAll('.spin-button').forEach(button => {
                button.disabled = false;
                if (button.id === 'backButton') {
                    button.textContent = '返回';
                } else {
                    button.style.display = '';
                    // button.textContent = button.dataset.count;
                }
            });
        }
        this.drawWheel();
        this.winners = [];
    }

    showWinner(winners) {
        const displayMode = document.querySelector('input[name="displayMode"]:checked').value;
        const formatWinnerName = (name) => {
            const maxLength = 15;
            return name.length > maxLength ? name.slice(0, maxLength) + '...' : name;
        };

        let formattedWinners = [];
        if (Array.isArray(winners)) {
            for (let i = 0; i < winners.length; i++) {
                formattedWinners.push(formatWinnerName(winners[i]));
                if ((i + 1) % 3 === 0 && (i + 1) !== winners.length) {
                    formattedWinners.push('<br>');
                }
            }
        } else {
            formattedWinners.push(formatWinnerName(winners));
        }
        let winnerText = '';
        if (Array.isArray(winners)) {
            let tempWinners = [];
            for (let i = 0; i < formattedWinners.length; i++) {
                if (formattedWinners[i] === '<br>') {
                    winnerText += tempWinners.join(', ') + '<br>';
                    tempWinners = [];
                } else {
                    tempWinners.push(formattedWinners[i]);
                }
            }
            winnerText += tempWinners.join(', ');
        } else {
            winnerText = formattedWinners[0];
        }

        if (displayMode === 'modal') {
            document.getElementById('modalWinner').innerHTML = winnerText;
            document.getElementById('winnerModal').style.display = 'block';
            this.triggerConfetti();
        } else {
            this.winnerDisplay.innerHTML = `🎉 ${winnerText} 🎉`;
            this.winnerDisplay.style.display = 'block';
            setTimeout(() => {
                this.winnerDisplay.style.display = 'none';
            }, 8000);
        }
    }

    closeModal() {
        document.getElementById('winnerModal').style.display = 'none';
    }

    triggerConfetti() {
        const confettiCanvas = document.getElementById('confettiCanvas');
        const myConfetti = confetti.create(confettiCanvas, {
            resize: true,
            useWorker: true
        });
        myConfetti({
            particleCount: 150,
            spread: 180,
            origin: { y: 0.6 }
        });
    }

    addToHistory(winner) {
        const now = new Date();
        const timeString = now.toLocaleTimeString();
        const historyEntry = `${timeString} - ${winner}`;

        if (!settings.history) {
            settings.history = [];
        }
        settings.history.unshift(historyEntry);

        if (settings.history.length > 10) {
            settings.history = settings.history.slice(0, 10);
        }

        this.updateHistoryDisplay();
        this.updateHitCounts(winner);
        this.saveSettings();
    }

    updateHitCounts(winner) {
        const currentHash = this._getCurrentListHash();
        if (!currentHash) return;

        for (const presetName in settings.presets) {
            const preset = settings.presets[presetName];
            if (preset.hash === currentHash) {
                if (!preset.hitCounts) {
                    preset.hitCounts = {};
                }
                const winnerStats = preset.hitCounts[winner];
                if (winnerStats) {
                    winnerStats.count++;
                    winnerStats.lastDrawn = new Date().toISOString();
                } else {
                    preset.hitCounts[winner] = {
                        count: 1,
                        lastDrawn: new Date().toISOString()
                    };
                }
                break;
            }
        }
    }

    updateHistoryDisplay() {
        if (!settings.history || settings.history.length === 0) {
            this.historyList.innerHTML = '<div class="history-item">暂无记录</div>';
            return;
        }

        this.historyList.innerHTML = settings.history
            .map(item => `<div class="history-item">${item}</div>`)
            .join('');
    }

    removeWinnerFromList(winner) {
        const names = this.getNames();
        const filteredNames = names.filter(name => name !== winner);
        this.namesInput.value = filteredNames.join('\n');
        this.drawWheel();
        this.saveSettings();
    }

    saveSettings() {
        settings = {
            ...settings, ...{
                names: this.namesInput.value,
                title: this.titleInput.value,
                spinDamping: document.getElementById('spinDamping').value,
                spinSpeed: document.getElementById('spinSpeed').value,
                spinSoundVolume: document.getElementById('spinSoundVolume').value,
                removeWinner: document.getElementById('removeWinner').checked,
                displayMode: document.querySelector('input[name="displayMode"]:checked').value,
                canvasResolution: this.canvasResolutionInput.value,
                darkMode: document.getElementById('darkModeToggle').checked,
                currentPresetName: this.currentPresetName
            }
        };
        if (isElectron) {
            settings.autoStart = document.getElementById('autoStart').checked;
            settings.enableFloatBall = document.getElementById('enableFloatBall').checked;
            settings.floatBall.backgroundType = document.querySelector('input[name="floatBallBackground"]:checked').value;
            settings.floatBall.color = document.getElementById('floatBallColor').value;
            settings.floatBall.opacity = parseFloat(document.getElementById('floatBallOpacity').value);
            settings.floatBall.text = document.getElementById('floatBallText').value;
            settings.floatBall.fontSize = parseInt(document.getElementById('floatBallFontSize').value);
        }

        if (isElectron) {
            window.electronAPI.saveSettings(settings);
        } else {
            localStorage.setItem('pickerSettings', JSON.stringify(settings));
        }
    }

    async loadSettings() {
        const defaultSettings = {
            title: "随机抽取",
            names: "",
            spinDamping: 0.985,
            spinSpeed: 8,
            spinSoundVolume: 10,
            canvasResolution: 1024,
            removeWinner: false,
            displayMode: 'modal',
            history: [],
            presets: {},
            currentPresetName: '',
            autoStart: false,
            enableFloatBall: false,
            floatBall: {
                backgroundType: 'image',
                color: '#000000',
                opacity: 0.5,
                text: '抽选',
                fontSize: 30,
            },
            darkMode: false
        };
        if (isElectron) {
            const electronSettings = await window.electronAPI.getSettings();
            settings = { ...defaultSettings, ...electronSettings };
        } else {
            const localSettings = JSON.parse(localStorage.getItem('pickerSettings'));
            settings = { ...defaultSettings, ...localSettings };
        }
        try {
            if (settings.names !== undefined) this.namesInput.value = settings.names;
            if (settings.title !== undefined) {
                this.titleInput.value = settings.title;
                this.updateTitle();
            }
            if (settings.spinDamping !== undefined) {
                document.getElementById('spinDamping').value = settings.spinDamping;
                document.getElementById('dampingValue').textContent = settings.spinDamping;
            }
            if (settings.spinSpeed !== undefined) {
                document.getElementById('spinSpeed').value = settings.spinSpeed;
                document.getElementById('speedValue').textContent = settings.spinSpeed;
            }
            if (settings.spinSoundVolume !== undefined) {
                document.getElementById('spinSoundVolume').value = settings.spinSoundVolume;
                document.getElementById('spinSoundVolumeValue').textContent = settings.spinSoundVolume;
            }
            if (settings.removeWinner !== undefined) {
                document.getElementById('removeWinner').checked = settings.removeWinner;
            }
            if (settings.displayMode !== undefined) {
                document.querySelector(`input[name="displayMode"][value="${settings.displayMode}"]`).checked = true;
            }
            if (settings.canvasResolution !== undefined) {
                this.canvasResolutionInput.value = settings.canvasResolution;
                this.updateCanvasResolution(parseInt(settings.canvasResolution));
            }
            if (settings.darkMode !== undefined) {
                document.getElementById('darkModeToggle').checked = settings.darkMode;
                document.body.classList.toggle('dark-mode', settings.darkMode);
            }
            this.updateHistoryDisplay();

            for (const presetName in settings.presets) {
                if (typeof settings.presets[presetName] === 'string') {
                    settings.presets[presetName] = {
                        names: settings.presets[presetName].split('\n').filter(n => n.trim() !== ''),
                        hitCounts: {}
                    };
                } else if (!settings.presets[presetName].hitCounts) {
                    settings.presets[presetName].hitCounts = {};
                }
            }

            if (settings.currentPresetName !== undefined) {
                this.currentPresetName = settings.currentPresetName;
            }

            this.renderPresets();
            if (isElectron) {
                document.getElementById('autoStart').checked = settings.autoStart;
                document.getElementById('enableFloatBall').checked = settings.enableFloatBall;
                document.querySelector(`input[name="floatBallBackground"][value="${settings.floatBall.backgroundType}"]`).checked = true;
                document.getElementById('floatBallColor').value = settings.floatBall.color;
                const floatOpacity = document.getElementById('floatBallOpacity');
                floatOpacity.value = settings.floatBall.opacity;
                document.getElementById('floatBallOpacityValue').textContent = settings.floatBall.opacity;
                document.getElementById('floatBallText').value = settings.floatBall.text;
                const floatFontSize = document.getElementById('floatBallFontSize');
                floatFontSize.value = settings.floatBall.fontSize;
                document.getElementById('floatBallFontSizeValue').textContent = settings.floatBall.fontSize;
                window.electronAPI.getCurrentVersion().then(version => {
                    document.getElementById('appVersion').textContent = version;
                });
            }
        } catch (e) {
            console.error('Failed to load settings:', e);
        }
        this.saveSettings();
    }
    async savePreset() {
        const presetName = await prompt("要保存的预设名:", "");
        if (presetName && presetName.trim() !== '') {
            const names = this.namesInput.value.split('\n').filter(n => n.trim() !== '');
            const currentHash = names.sort().join('|||');

            const existingPreset = settings.presets[presetName];
            const hitCounts = (existingPreset && existingPreset.hash === currentHash)
                ? existingPreset.hitCounts
                : {};

            settings.presets[presetName] = {
                names: names,
                hitCounts: hitCounts,
                hash: currentHash
            };

            this.currentPresetName = presetName;
            this.saveSettings();
            this.renderPresets();
        }
    }

    loadPreset(name) {
        if (settings.presets[name]) {
            const presetData = settings.presets[name];
            this.namesInput.value = presetData.names.join('\n');
            this.currentPresetName = name;
            this.drawWheel();
            if (this.sidebar.classList.contains('open')) {
                this.sidebarToggle.click();
            }
            this.saveSettings();
            this.renderPresets();
        }
    }

    async deletePreset(name) {
        if (await confirm(`确认删除预设 "${name}"?`)) {
            if (name === this.currentPresetName) {
                this.currentPresetName = '';
            }
            delete settings.presets[name];
            this.saveSettings();
            this.renderPresets();
        }
    }

    renderPresets() {
        const container = document.getElementById('presetButtonsContainer');
        container.innerHTML = '';
        for (const name in settings.presets) {
            const btnGroup = document.createElement('div');
            btnGroup.style.display = 'flex';
            btnGroup.style.alignItems = 'center';

            const btn = document.createElement('button');
            btn.className = 'preset-btn';
            btn.textContent = name;
            btn.onclick = () => this.loadPreset(name);
            if (name === this.currentPresetName) {
                btn.classList.add('active-preset');
            }

            const delBtn = document.createElement('button');
            delBtn.className = 'preset-btn delete';
            delBtn.textContent = '❌';
            delBtn.title = `Delete ${name}`;
            delBtn.onclick = (e) => {
                e.stopPropagation();
                this.deletePreset(name);
            };

            btnGroup.appendChild(btn);
            btnGroup.appendChild(delBtn);
            container.appendChild(btnGroup);
        }
    }

    _getCurrentListHash() {
        const names = this.getNames();
        if (names.length === 0) return null;
        return names.sort().join('|||');
    }

}

const customModal = document.getElementById('customModal');
const customModalTitle = document.getElementById('customModalTitle');
const customModalMessage = document.getElementById('customModalMessage');
const customModalInput = document.getElementById('customModalInput');
const customModalConfirm = document.getElementById('customModalConfirm');
const customModalCancel = document.getElementById('customModalCancel');

let resolveModalPromise;

function showCustomModal(title, message, type, defaultValue = '') {
    return new Promise((resolve) => {
        customModalTitle.textContent = title;
        customModalMessage.textContent = message;

        customModalInput.style.display = 'none';
        customModalInput.value = '';
        customModalCancel.style.display = 'none';

        if (type === 'prompt') {
            customModalInput.style.display = 'block';
            customModalInput.value = defaultValue;
            customModalInput.focus();
            customModalCancel.style.display = 'inline-block';
        } else if (type === 'confirm') {
            customModalCancel.style.display = 'inline-block';
        }

        customModal.style.display = 'flex';
        resolveModalPromise = resolve;
    });
}

customModalConfirm.addEventListener('click', () => {
    const currentType = customModalInput.style.display === 'block' ? 'prompt' : (customModalCancel.style.display === 'inline-block' ? 'confirm' : 'alert');
    let result;
    if (currentType === 'prompt') {
        result = customModalInput.value;
    } else if (currentType === 'confirm') {
        result = true;
    } else {
        result = true;
    }
    customModal.style.display = 'none';
    resolveModalPromise(result);
});

customModalCancel.addEventListener('click', () => {
    customModal.style.display = 'none';
    resolveModalPromise(false);
});

window.alert = async (message) => {
    await showCustomModal('提示', message, 'alert');
};

window.prompt = async (message, defaultValue = '') => {
    return await showCustomModal('输入', message, 'prompt', defaultValue);
};

window.confirm = async (message) => {
    return await showCustomModal('确认', message, 'confirm');
};

let wheel;

function updateWheelSize(a = 380) {
    const maxSize = Math.max(Math.min(window.innerHeight, window.innerWidth) - a, 350);
    wheel.canvas.style.width = maxSize + 'px';
    wheel.canvas.style.height = maxSize + 'px';
}

window.addEventListener('load', () => {
    wheel = new WheelOfNames();
    wheel.updateCanvasResolution(parseInt(wheel.canvasResolutionInput.value));
    if (isElectron) updateWheelSize(280);
    else updateWheelSize();
});

window.addEventListener('resize', () => {
    if (wheel) {
        const currentResolution = parseInt(wheel.canvasResolutionInput.value);
        wheel.updateCanvasResolution(currentResolution);
        if (isElectron) updateWheelSize(280);
        else updateWheelSize();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !wheel.isSpinning) {
        e.preventDefault();
        wheel.spin(1);
    }
    if (e.code === 'Escape') {
        if (document.getElementById('winnerModal').style.display === 'block') {
            closeModal();
        } else if (document.getElementById('sidebar').classList.contains('open')) {
            wheel.toggleSidebar();
        }
    }
});