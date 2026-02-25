// ========== 真心话游戏逻辑 ==========

let truthGameState = {
    isActive: false,
    currentRound: 0,
    userChoice: null,
    aiChoice: null,
    winner: null,
    messages: [],
    abortController: null, // 用于中断API请求
    waitingForAI: false,
    hasStartedRound: false
};

// 辅助函数：更新真心话悬浮球红点状态
function updateTruthGameFloatIndicator() {
    const modal = document.getElementById('truth-game-modal');
    const indicator = document.getElementById('truth-game-float-indicator');

    if (!modal || !indicator) return;

    // 如果对话框被最小化，显示红点
    if (modal.classList.contains('minimized')) {
        indicator.classList.add('active');
    } else {
        indicator.classList.remove('active');
    }
}

// 初始化真心话游戏
function initTruthGame() {
    // 绑定打开按钮
    const openBtn = document.getElementById('open-truth-game-btn');
    if (openBtn) {
        openBtn.addEventListener('click', () => {
            if (!state.activeChatId) {
                showCustomAlert('提示', '请先选择一个聊天对象！');
                return;
            }
            const chat = state.chats[state.activeChatId];
            if (chat.isGroup) {
                showCustomAlert('提示', '真心话游戏仅支持单人聊天！');
                return;
            }

            if (!chat.settings.truthGameHistoryLimit) {
                chat.settings.truthGameHistoryLimit = 5;
            }

            // 重置状态
            truthGameState = {
                isActive: true,
                currentRound: 1,
                userChoice: null,
                aiChoice: null,
                winner: null,
                messages: [],
                waitingForAI: false,
                hasStartedRound: false
            };

            const modal = document.getElementById('truth-game-modal');
            if (modal) {
                modal.classList.add('visible');
                modal.classList.remove('minimized');
                renderTruthGameMessages();
                addTruthGameMessage('system', '欢迎来到真心话大冒险！点击"开始游戏"按钮开始第一轮。');
            }
            
            // 隐藏猜拳选择器
            const rpsSelector = document.getElementById('truth-rps-selector');
            if (rpsSelector) rpsSelector.style.display = 'none';
        });
    }

    // 绑定最小化按钮
    const minimizeBtn = document.getElementById('minimize-truth-game-btn');
    if (minimizeBtn) {
        minimizeBtn.addEventListener('click', () => {
            const modal = document.getElementById('truth-game-modal');
            modal.classList.add('minimized');
            updateTruthGameFloatIndicator();
        });
    }

    // 绑定关闭按钮
    const closeBtn = document.getElementById('close-truth-game-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            const modal = document.getElementById('truth-game-modal');
            modal.classList.remove('visible');
            truthGameState.isActive = false;
        });
    }

    // 绑定悬浮球点击
    const floatIndicator = document.getElementById('truth-game-float-indicator');
    if (floatIndicator) {
        floatIndicator.addEventListener('click', () => {
            const modal = document.getElementById('truth-game-modal');
            modal.classList.remove('minimized');
            floatIndicator.classList.remove('active');
        });
    }
}

// 渲染消息
function renderTruthGameMessages() {
    const container = document.getElementById('truth-game-messages');
    if (!container) return;
    
    container.innerHTML = truthGameState.messages.map(msg => {
        const isUser = msg.sender === 'user';
        return `
            <div class="truth-message ${msg.sender}">
                <div class="truth-message-content">${msg.content}</div>
            </div>
        `;
    }).join('');
    
    container.scrollTop = container.scrollHeight;
}

// 添加消息
function addTruthGameMessage(sender, content) {
    truthGameState.messages.push({ sender, content });
    renderTruthGameMessages();
}

// 导出初始化函数
window.initTruthGame = initTruthGame;
