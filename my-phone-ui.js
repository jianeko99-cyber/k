/**
 * MyPhone 手动编辑 UI 逻辑
 * 包含：模态框、表单验证、数据保存
 */

// ======================================================================================
// 1. 公共工具
// ======================================================================================

function getChat() {
    return state.chats[activeCharacterPhoneId];
}

function getPhoneData() {
    const chat = getChat();
    if (!chat) return null;
    if (window.MyPhone) MyPhone.initUserPhoneData(chat);
    return chat.userPhoneData;
}

async function saveAndRefresh(dataType) {
    const chat = getChat();
    if (chat && typeof saveChatToDb === 'function') {
        await saveChatToDb(chat.id);
    }
    
    // 刷新对应的 UI
    switch(dataType) {
        case 'memos': renderCharacterMemos(); break;
        case 'shoppingCart': renderCharacterShoppingCart(); break;
        case 'browserHistory': renderCharacterBrowser(); break;
        case 'photoAlbum': renderCharacterPhotoAlbum(); break;
        case 'bank': renderCharacterBank(); break;
        case 'trajectory': renderCharacterTrajectory(); break;
        case 'appUsage': renderCharacterAppUsage(); break;
        case 'diary': renderCharacterDiary(); break;
        case 'chats': renderCharacterChatList(); break;
    }
}

function showModal(html, title, onSave) {
    // 移除已存在的模态框
    const existing = document.getElementById('myphone-edit-modal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.id = 'myphone-edit-modal';
    modal.className = 'modal visible'; // 复用现有的模态框样式
    modal.style.zIndex = "10001";
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <div class="modal-header">
                <h3>${title}</h3>
                <span class="close-btn" onclick="document.getElementById('myphone-edit-modal').remove()">×</span>
            </div>
            <div class="modal-body">
                ${html}
            </div>
            <div class="modal-footer">
                <button class="moe-btn" id="myphone-save-btn">保存</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('myphone-save-btn').onclick = async () => {
        if (await onSave()) {
            modal.remove();
        }
    };
}

// ======================================================================================
// 2. 各个APP的编辑界面
// ======================================================================================

// --- 备忘录 ---
function openAddMemoModal() {
    const html = `
        <div class="form-group">
            <label>标题</label>
            <input type="text" id="memo-title" class="moe-input" placeholder="例如：待办事项">
        </div>
        <div class="form-group">
            <label>内容</label>
            <textarea id="memo-content" class="moe-input" rows="5" placeholder="请输入备忘录详情..."></textarea>
        </div>
    `;
    
    showModal(html, "新建备忘录", async () => {
        const title = document.getElementById('memo-title').value.trim();
        const content = document.getElementById('memo-content').value.trim();
        
        if (!title) { alert("请输入标题"); return false; }
        
        const data = getPhoneData();
        data.memos.push({
            id: Date.now(),
            title,
            content,
            timestamp: Date.now(),
            isManual: true
        });
        
        await saveAndRefresh('memos');
        return true;
    });
}

// --- 购物车 ---
function openAddCartItemModal() {
    const html = `
        <div class="form-group">
            <label>商品名称</label>
            <input type="text" id="cart-name" class="moe-input" placeholder="例如：机械键盘">
        </div>
        <div class="form-group">
            <label>价格 (元)</label>
            <input type="number" id="cart-price" class="moe-input" placeholder="0.00">
        </div>
        <div class="form-group">
            <label>店铺名称</label>
            <input type="text" id="cart-store" class="moe-input" placeholder="例如：某某旗舰店">
        </div>
    `;
    
    showModal(html, "添加购物车商品", async () => {
        const name = document.getElementById('cart-name').value.trim();
        const price = parseFloat(document.getElementById('cart-price').value);
        const store = document.getElementById('cart-store').value.trim();
        
        if (!name) { alert("请输入商品名称"); return false; }
        if (isNaN(price)) { alert("请输入有效的价格"); return false; }
        
        const data = getPhoneData();
        data.shoppingCart.push({
            id: Date.now(),
            name,
            price,
            store: store || "未知店铺",
            timestamp: Date.now()
        });
        
        await saveAndRefresh('shoppingCart');
        return true;
    });
}

// --- 浏览记录 ---
function openAddBrowserHistoryModal() {
    const html = `
        <div class="form-group">
            <label>搜索词 / 网页标题</label>
            <input type="text" id="browser-query" class="moe-input" placeholder="例如：如何做红烧肉">
        </div>
        <div class="form-group">
            <label>网址 / 摘要 (可选)</label>
            <input type="text" id="browser-url" class="moe-input" placeholder="http://...">
        </div>
    `;
    
    showModal(html, "添加浏览记录", async () => {
        const query = document.getElementById('browser-query').value.trim();
        const url = document.getElementById('browser-url').value.trim();
        
        if (!query) { alert("请输入搜索词或标题"); return false; }
        
        const data = getPhoneData();
        data.browserHistory.push({
            id: Date.now(),
            query,
            url: url || "http://google.com",
            result: url, // 兼容性
            timestamp: Date.now()
        });
        
        await saveAndRefresh('browserHistory');
        return true;
    });
}

// --- 相册 ---
function openAddPhotoModal() {
    const html = `
        <div class="form-group">
            <label>照片描述 (用于AI理解图片内容)</label>
            <textarea id="photo-desc" class="moe-input" rows="3" placeholder="例如：一张我和朋友在海边的合影，阳光明媚..."></textarea>
        </div>
        <div class="form-group">
            <label>图片 URL (可选，留空显示占位符)</label>
            <input type="text" id="photo-url" class="moe-input" placeholder="http://...">
        </div>
    `;
    
    showModal(html, "添加照片", async () => {
        const desc = document.getElementById('photo-desc').value.trim();
        const url = document.getElementById('photo-url').value.trim();
        
        if (!desc) { alert("请输入照片描述"); return false; }
        
        const data = getPhoneData();
        data.photoAlbum.push({
            id: Date.now(),
            description: desc,
            hiddenContent: desc, // 兼容性
            url: url,
            timestamp: Date.now()
        });
        
        await saveAndRefresh('photoAlbum');
        return true;
    });
}

// --- 银行 ---
function openAddTransactionModal() {
    const html = `
        <div class="form-group">
            <label>交易类型</label>
            <select id="trans-type" class="moe-input">
                <option value="支出">支出</option>
                <option value="收入">收入</option>
            </select>
        </div>
        <div class="form-group">
            <label>金额 (元)</label>
            <input type="number" id="trans-amount" class="moe-input" placeholder="0.00">
        </div>
        <div class="form-group">
            <label>描述</label>
            <input type="text" id="trans-desc" class="moe-input" placeholder="例如：餐饮消费">
        </div>
    `;
    
    showModal(html, "添加交易记录", async () => {
        const type = document.getElementById('trans-type').value;
        const amount = parseFloat(document.getElementById('trans-amount').value);
        const desc = document.getElementById('trans-desc').value.trim();
        
        if (isNaN(amount) || amount <= 0) { alert("请输入有效的金额"); return false; }
        if (!desc) { alert("请输入描述"); return false; }
        
        const data = getPhoneData();
        if (!data.bank) data.bank = { balance: 0, transactions: [] };
        
        data.bank.transactions.push({
            id: Date.now(),
            type,
            amount,
            description: desc,
            timestamp: Date.now()
        });
        
        // 更新余额
        if (type === '收入') data.bank.balance += amount;
        else data.bank.balance -= amount;
        
        await saveAndRefresh('bank');
        return true;
    });
}

// --- 轨迹 ---
function openAddTrajectoryModal() {
    const html = `
        <div class="form-group">
            <label>时间段</label>
            <input type="text" id="traj-time" class="moe-input" placeholder="例如：14:00 - 16:00">
        </div>
        <div class="form-group">
            <label>地点</label>
            <input type="text" id="traj-loc" class="moe-input" placeholder="例如：市图书馆">
        </div>
        <div class="form-group">
            <label>活动</label>
            <input type="text" id="traj-act" class="moe-input" placeholder="例如：看书学习">
        </div>
    `;
    
    showModal(html, "添加轨迹记录", async () => {
        const time = document.getElementById('traj-time').value.trim();
        const loc = document.getElementById('traj-loc').value.trim();
        const act = document.getElementById('traj-act').value.trim();
        
        if (!time || !loc || !act) { alert("请填写完整信息"); return false; }
        
        const data = getPhoneData();
        data.trajectory.push({
            id: Date.now(),
            time,
            location: loc,
            activity: act,
            timestamp: Date.now()
        });
        
        await saveAndRefresh('trajectory');
        return true;
    });
}

// --- 应用使用 ---
function openAddAppUsageModal() {
    const html = `
        <div class="form-group">
            <label>应用名称</label>
            <input type="text" id="app-name" class="moe-input" placeholder="例如：微信">
        </div>
        <div class="form-group">
            <label>使用时长</label>
            <input type="text" id="app-duration" class="moe-input" placeholder="例如：2小时30分">
        </div>
    `;
    
    showModal(html, "添加应用使用记录", async () => {
        const name = document.getElementById('app-name').value.trim();
        const duration = document.getElementById('app-duration').value.trim();
        
        if (!name || !duration) { alert("请填写完整信息"); return false; }
        
        const data = getPhoneData();
        data.appUsage.push({
            id: Date.now(),
            appName: name,
            duration,
            timestamp: Date.now()
        });
        
        await saveAndRefresh('appUsage');
        return true;
    });
}

// --- 日记 ---
function openAddDiaryModal() {
    const html = `
        <div class="form-group">
            <label>日记内容 (支持Markdown)</label>
            <textarea id="diary-content" class="moe-input" rows="8" placeholder="今天发生了什么..."></textarea>
        </div>
    `;
    
    showModal(html, "写日记", async () => {
        const content = document.getElementById('diary-content').value.trim();
        
        if (!content) { alert("内容不能为空"); return false; }
        
        const data = getPhoneData();
        data.diary.push({
            id: Date.now(),
            content,
            timestamp: Date.now()
        });
        
        await saveAndRefresh('diary');
        return true;
    });
}

// --- 聊天记录 (最复杂) ---
function openAddChatModal() {
    // 1. 定义内部状态：消息列表
    let currentMessages = [];
    
    // 2. 渲染函数
    const renderMsgList = () => {
        const list = document.getElementById('new-chat-msg-list');
        list.innerHTML = '';
        currentMessages.forEach((msg, index) => {
            const div = document.createElement('div');
            div.style.cssText = 'display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.05); padding: 5px; margin-bottom: 5px; border-radius: 4px;';
            div.innerHTML = `
                <div style="font-size: 12px;">
                    <span style="font-weight: bold;">${msg.sender}:</span> ${msg.content.substring(0, 20)}...
                </div>
                <span style="cursor: pointer; color: red;" onclick="removeNewChatMsg(${index})">×</span>
            `;
            list.appendChild(div);
        });
    };
    
    // 3. 全局暴露删除函数给 onclick 使用 (临时)
    window.removeNewChatMsg = (index) => {
        currentMessages.splice(index, 1);
        renderMsgList();
    };
    
    const html = `
        <div class="form-group">
            <label>联系人名字</label>
            <input type="text" id="chat-contact-name" class="moe-input" placeholder="例如：小美">
        </div>
        
        <div class="moe-divider"></div>
        
        <div class="form-group">
            <label>对话内容编辑</label>
            <div id="new-chat-msg-list" style="max-height: 150px; overflow-y: auto; margin-bottom: 10px; border: 1px dashed #ccc; padding: 5px;">
                <p style="text-align: center; color: #999; font-size: 12px;">暂无消息</p>
            </div>
            
            <div style="display: flex; gap: 5px; margin-bottom: 5px;">
                <select id="msg-sender-role" class="moe-input" style="width: 80px;">
                    <option value="partner">对方</option>
                    <option value="me">我</option>
                </select>
                <input type="text" id="msg-content" class="moe-input" placeholder="输入消息内容..." style="flex: 1;">
                <button type="button" class="moe-btn-small" id="add-msg-btn">添加</button>
            </div>
        </div>
    `;
    
    showModal(html, "添加虚拟联系人及对话", async () => {
        const name = document.getElementById('chat-contact-name').value.trim();
        
        if (!name) { alert("请输入联系人名字"); return false; }
        if (currentMessages.length === 0) { alert("请至少添加一条消息"); return false; }
        
        const data = getPhoneData();
        
        // 1. 更新虚拟联系人列表
        let contact = data.virtualContacts.find(c => c.name === name);
        if (!contact) {
            contact = { id: Date.now().toString(), name, avatar: "", persona: "" };
            data.virtualContacts.push(contact);
        }
        
        // 2. 保存消息 (使用 history 结构)
        // 转换消息发送者名字
        const finalMessages = currentMessages.map(m => ({
            sender: m.sender === 'partner' ? name : (getChat().settings.myNickname || "我"),
            content: m.content,
            timestamp: Date.now()
        }));
        
        if (!data.chats[name]) {
            data.chats[name] = { 
                avatar: "", 
                history: [] 
            };
        }
        
        data.chats[name].history.push(...finalMessages);
        
        await saveAndRefresh('chats');
        return true;
    });
    
    // 绑定添加按钮事件
    // 因为 showModal 是异步渲染，这里需要个小延时或直接操作DOM
    setTimeout(() => {
        document.getElementById('add-msg-btn').onclick = () => {
            const role = document.getElementById('msg-sender-role').value;
            const content = document.getElementById('msg-content').value.trim();
            if (!content) return;
            
            currentMessages.push({
                sender: role, // 'partner' or 'me'
                content: content
            });
            renderMsgList();
            document.getElementById('msg-content').value = ''; // 清空输入框
        };
    }, 100);
}

// ======================================================================================
// 3. 初始化事件绑定
// ======================================================================================

function initMyPhoneUIListeners() {
    const bind = (id, fn) => {
        const btn = document.getElementById(id);
        if (btn) {
            // 移除旧的 listener (通过 cloneNode)
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.addEventListener('click', fn);
        }
    };

    bind('add-memo-btn', openAddMemoModal);
    bind('add-cart-item-btn', openAddCartItemModal);
    bind('add-browser-history-btn', openAddBrowserHistoryModal);
    bind('add-album-photo-btn', openAddPhotoModal);
    bind('add-bank-transaction-btn', openAddTransactionModal);
    bind('add-trajectory-btn', openAddTrajectoryModal);
    bind('add-app-usage-btn', openAddAppUsageModal);
    bind('add-diary-entry-btn', openAddDiaryModal);
    bind('add-npc-chat-btn', openAddChatModal);
}

// 监听 DOM 加载或页面切换
setInterval(() => {
    if (window.myPhoneMode === 'user') {
        // 简单的检查机制，确保 user-phone-only 按钮有正确的事件
        // (在生产环境中可以用更优雅的 MutationObserver)
        const btn = document.getElementById('add-memo-btn');
        if (btn && !btn.dataset.bound) {
            initMyPhoneUIListeners();
            // 标记所有已绑定
            document.querySelectorAll('.user-phone-only').forEach(b => b.dataset.bound = "true");
        }
    }
}, 1000);
