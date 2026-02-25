/**
 * sticker-search.js
 * 表情包智能搜索模块
 * 功能：在输入框输入文字时，自动匹配已导入的表情包并显示
 */

console.log("Sticker Search Module Loaded");

// 全局变量
let stickerSearchEnabled = false;
let searchResultsVisible = false;
let currentSearchResults = [];

/**
 * 初始化表情包搜索功能
 */
function initStickerSearch() {
    console.log('[表情包搜索] 开始初始化');
    
    // 注入搜索结果显示区域的HTML
    injectSearchResultsUI();
    
    // 绑定输入框事件
    bindInputEvents();
    
    console.log('[表情包搜索] 初始化完成');
}

/**
 * 注入搜索结果UI到页面
 */
function injectSearchResultsUI() {
    const html = `
    <!-- 表情包搜索结果浮层 -->
    <div id="sticker-search-results" class="sticker-search-results" style="display: none;">
        <div class="search-results-header">
            <span class="results-title">匹配的表情包</span>
            <span class="results-count">0</span>
        </div>
        <div id="sticker-search-grid" class="sticker-search-grid">
            <!-- 搜索结果将在这里动态生成 -->
        </div>
    </div>
    
    <style>
        /* 搜索结果浮层样式 */
        .sticker-search-results {
            position: relative;
            background: white;
            border-bottom: 1px solid #e0e0e0;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            max-height: 200px;
            z-index: 1000;
            animation: slideDown 0.2s ease-out;
        }
        
        @keyframes slideDown {
            from {
                opacity: 0;
                max-height: 0;
            }
            to {
                opacity: 1;
                max-height: 200px;
            }
        }
        
        .search-results-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 15px;
            background: #f5f5f5;
            border-bottom: 1px solid #e0e0e0;
        }
        
        .results-title {
            font-size: 12px;
            color: #666;
            font-weight: 500;
        }
        
        .results-count {
            font-size: 11px;
            color: #999;
            background: #e0e0e0;
            padding: 2px 8px;
            border-radius: 10px;
        }
        
        .sticker-search-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 8px;
            padding: 10px;
            overflow-y: auto;
            max-height: 150px;
        }
        
        .search-sticker-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            padding: 8px;
            border-radius: 8px;
            transition: all 0.2s;
            background: #fafafa;
        }
        
        .search-sticker-item:hover {
            background: #f0f0f0;
            transform: scale(1.05);
        }
        
        .search-sticker-item:active {
            transform: scale(0.95);
        }
        
        .search-sticker-item img {
            width: 50px;
            height: 50px;
            object-fit: contain;
            margin-bottom: 4px;
        }
        
        .search-sticker-name {
            font-size: 10px;
            color: #666;
            text-align: center;
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        
        .no-results-hint {
            text-align: center;
            padding: 20px;
            color: #999;
            font-size: 12px;
        }
    </style>
    `;
    
    // 将搜索结果UI插入到聊天输入区域的开头
    const chatInputArea = document.getElementById('chat-input-area');
    if (chatInputArea) {
        chatInputArea.insertAdjacentHTML('afterbegin', html);
    } else {
        console.error('找不到 chat-input-area 容器');
    }
}

/**
 * 绑定输入框事件
 */
function bindInputEvents() {
    const chatInput = document.getElementById('chat-input');
    
    console.log('[表情包搜索] 绑定输入框事件');
    console.log('[表情包搜索] 输入框存在:', !!chatInput);
    
    if (!chatInput) {
        console.error('[表情包搜索] 找不到输入框 #chat-input');
        return;
    }
    
    // 监听输入事件
    chatInput.addEventListener('input', handleInputChange);
    console.log('[表情包搜索] 已绑定 input 事件');
    
    // 监听焦点事件
    chatInput.addEventListener('focus', handleInputFocus);
    chatInput.addEventListener('blur', handleInputBlur);
    
    // 点击页面其他地方时隐藏搜索结果
    document.addEventListener('click', (e) => {
        const searchResults = document.getElementById('sticker-search-results');
        const chatInput = document.getElementById('chat-input');
        
        if (searchResults && 
            !searchResults.contains(e.target) && 
            e.target !== chatInput) {
            hideSearchResults();
        }
    });
}

/**
 * 处理输入框内容变化
 */
function handleInputChange(e) {
    const inputText = e.target.value.trim();
    
    console.log('[表情包搜索] 输入内容:', inputText);
    
    // 检查当前聊天是否启用了表情包搜索
    const enabled = isSearchEnabledForCurrentChat();
    console.log('[表情包搜索] 功能是否启用:', enabled);
    
    if (!enabled) {
        hideSearchResults();
        return;
    }
    
    // 如果输入为空，隐藏搜索结果
    if (!inputText) {
        hideSearchResults();
        return;
    }
    
    // 执行搜索
    searchStickers(inputText);
}

/**
 * 处理输入框获得焦点
 */
function handleInputFocus() {
    const chatInput = document.getElementById('chat-input');
    const inputText = chatInput ? chatInput.value.trim() : '';
    
    if (inputText && isSearchEnabledForCurrentChat()) {
        searchStickers(inputText);
    }
}

/**
 * 处理输入框失去焦点
 */
function handleInputBlur() {
    // 延迟隐藏，以便点击搜索结果
    setTimeout(() => {
        const searchResults = document.getElementById('sticker-search-results');
        if (searchResults && !searchResults.matches(':hover')) {
            hideSearchResults();
        }
    }, 200);
}

/**
 * 检查当前聊天是否启用了表情包搜索
 */
function isSearchEnabledForCurrentChat() {
    if (!window.state || !window.state.activeChatId) return false;
    
    const chat = window.state.chats[window.state.activeChatId];
    if (!chat || !chat.settings) return false;
    
    // 检查是否启用了表情包智能搜索
    return chat.settings.enableStickerSearch === true;
}

/**
 * 搜索表情包
 * @param {string} keyword - 搜索关键词
 */
function searchStickers(keyword) {
    if (!keyword) {
        hideSearchResults();
        return;
    }
    
    console.log('[表情包搜索] 开始搜索:', keyword);
    
    // 获取用户表情包列表
    const userStickers = window.state?.userStickers || [];
    console.log('[表情包搜索] 用户表情包数量:', userStickers.length);
    
    // 模糊匹配表情包名称
    const results = userStickers.filter(sticker => {
        if (!sticker.name) return false;
        
        // 转换为小写进行不区分大小写的匹配
        const stickerName = sticker.name.toLowerCase();
        const searchKeyword = keyword.toLowerCase();
        
        // 支持模糊匹配
        return stickerName.includes(searchKeyword);
    });
    
    console.log('[表情包搜索] 匹配结果数量:', results.length);
    
    // 限制最多显示10个结果
    currentSearchResults = results.slice(0, 10);
    
    // 显示搜索结果
    displaySearchResults(currentSearchResults);
}

/**
 * 显示搜索结果
 * @param {Array} results - 搜索结果数组
 */
function displaySearchResults(results) {
    const searchResultsContainer = document.getElementById('sticker-search-results');
    const searchGrid = document.getElementById('sticker-search-grid');
    const resultsCount = searchResultsContainer?.querySelector('.results-count');
    
    console.log('[表情包搜索] 显示搜索结果');
    console.log('[表情包搜索] 容器存在:', !!searchResultsContainer);
    console.log('[表情包搜索] 网格存在:', !!searchGrid);
    
    if (!searchResultsContainer || !searchGrid) {
        console.error('[表情包搜索] 找不到搜索结果容器');
        return;
    }
    
    // 清空之前的结果
    searchGrid.innerHTML = '';
    
    if (results.length === 0) {
        searchGrid.innerHTML = '<div class="no-results-hint">没有找到匹配的表情包</div>';
        if (resultsCount) resultsCount.textContent = '0';
    } else {
        // 渲染搜索结果
        results.forEach(sticker => {
            const item = createStickerItem(sticker);
            searchGrid.appendChild(item);
        });
        
        if (resultsCount) resultsCount.textContent = results.length;
    }
    
    // 显示搜索结果容器
    searchResultsContainer.style.display = 'block';
    searchResultsVisible = true;
    console.log('[表情包搜索] 搜索结果已显示');
}

/**
 * 创建表情包项元素
 * @param {Object} sticker - 表情包对象
 * @returns {HTMLElement}
 */
function createStickerItem(sticker) {
    const item = document.createElement('div');
    item.className = 'search-sticker-item';
    
    const img = document.createElement('img');
    img.src = sticker.url;
    img.alt = sticker.name;
    
    const name = document.createElement('div');
    name.className = 'search-sticker-name';
    name.textContent = sticker.name;
    
    item.appendChild(img);
    item.appendChild(name);
    
    // 点击发送表情包
    item.addEventListener('click', () => {
        sendSticker(sticker);
    });
    
    return item;
}

/**
 * 发送表情包
 * @param {Object} sticker - 表情包对象
 */
async function sendSticker(sticker) {
    if (!window.state || !window.state.activeChatId) {
        console.error('[表情包搜索] 没有活动的聊天');
        return;
    }
    
    const chat = window.state.chats[window.state.activeChatId];
    if (!chat) {
        console.error('[表情包搜索] 找不到聊天对象');
        return;
    }
    
    console.log('[表情包搜索] 发送表情包:', sticker.name);
    
    // 构建表情包消息（使用与原系统相同的格式）
    const msg = {
        role: "user",
        content: sticker.url,
        meaning: sticker.name,
        timestamp: Date.now(),
    };
    
    // 添加消息到聊天历史
    chat.history.push(msg);
    
    // 保存到数据库
    if (window.db && window.db.chats) {
        await window.db.chats.put(chat);
    }
    
    // 检查是否需要触发总结
    if (typeof window.checkAndTriggerSummary === 'function') {
        window.checkAndTriggerSummary(window.state.activeChatId);
    }
    
    // 添加消息到界面
    if (typeof window.appendMessage === 'function') {
        window.appendMessage(msg, chat);
    }
    
    // 渲染聊天列表
    if (typeof window.renderChatList === 'function') {
        window.renderChatList();
    }
    
    // 清空输入框
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.value = '';
    }
    
    // 隐藏搜索结果
    hideSearchResults();
    
    console.log('[表情包搜索] 表情包发送成功');
}

/**
 * 隐藏搜索结果
 */
function hideSearchResults() {
    const searchResultsContainer = document.getElementById('sticker-search-results');
    if (searchResultsContainer) {
        searchResultsContainer.style.display = 'none';
        searchResultsVisible = false;
    }
    currentSearchResults = [];
}

/**
 * 更新搜索状态（当设置改变时调用）
 */
function updateSearchState() {
    const enabled = isSearchEnabledForCurrentChat();
    stickerSearchEnabled = enabled;
    
    // 如果禁用了搜索，隐藏搜索结果
    if (!enabled) {
        hideSearchResults();
    }
}

// 导出全局函数
window.initStickerSearch = initStickerSearch;
window.updateStickerSearchState = updateSearchState;

// 自动初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStickerSearch);
} else {
    initStickerSearch();
}
