/**
 * MyPhone (用户手机) 功能模块
 * 包含：数据结构、AI生成、手动编辑、权限控制、角色查看
 */

// ======================================================================================
// 1. 数据初始化与管理
// ======================================================================================

/**
 * 初始化用户手机数据结构
 * @param {Object} chat - 角色对象
 */
function initUserPhoneData(chat) {
    if (!chat.userPhoneData) {
        chat.userPhoneData = {};
    }

    const defaultData = {
        lastGenerated: null,
        virtualContacts: [], // 虚拟联系人列表: { id, name, avatar, persona, relation }
        chats: {},           // 聊天记录: { contactName: { avatar, history: [] } }  <-- 修正兼容性
        shoppingCart: [],    // 购物车: { id, name, price, store, timestamp }
        memos: [],           // 备忘录: { id, title, content, timestamp }
        browserHistory: [],  // 浏览记录: { id, query, result, timestamp }
        photoAlbum: [],      // 相册: { id, description, hiddenContent, timestamp }
        bank: {              // 银行: { balance, transactions: [] }
            balance: 0,
            transactions: [] // { id, type, amount, description, timestamp }
        },
        trajectory: [],      // 轨迹: { id, time, location, activity }
        appUsage: [],        // 应用使用: { id, appName, duration }
        diary: [],           // 日记: { id, content, timestamp }
        permissions: {       // APP级别权限 (默认全部允许)
            chats: true,
            shoppingCart: true,
            memos: true,
            browserHistory: true,
            photoAlbum: true,
            bank: true,
            trajectory: true,
            appUsage: true,
            diary: true
        }
    };

    // 深度合并/补全缺少的字段
    for (const key in defaultData) {
        if (chat.userPhoneData[key] === undefined) {
            chat.userPhoneData[key] = defaultData[key];
        }
    }
    
    // 确保 permissions 里的字段也都存在
    if (!chat.userPhoneData.permissions) {
        chat.userPhoneData.permissions = { ...defaultData.permissions };
    } else {
        for (const permKey in defaultData.permissions) {
            if (chat.userPhoneData.permissions[permKey] === undefined) {
                chat.userPhoneData.permissions[permKey] = defaultData.permissions[permKey];
            }
        }
    }
}

// ======================================================================================
// 2. 权限控制
// ======================================================================================

function canCharacterViewUserPhone(chatId, appType = null) {
    const chat = state.chats[chatId];
    if (!chat) return false;

    // 1. 全局开关
    const globalEnabled = document.getElementById("user-phone-global-access")?.checked || false;

    // 2. 角色级别设置（使用权限模式：default/enable/disable）
    const charMode = chat.settings?.userPhoneAccessMode || 'default';
    
    let hasAccess = false;
    if (charMode === 'enable') {
        hasAccess = true;  // 强制允许
    } else if (charMode === 'disable') {
        hasAccess = false;  // 强制禁止
    } else {
        hasAccess = globalEnabled;  // 跟随全局设置
    }

    if (!hasAccess) return false;

    // 3. APP 级别权限
    if (appType) {
        initUserPhoneData(chat); 
        if (chat.userPhoneData.permissions && chat.userPhoneData.permissions[appType] === false) {
            return false;
        }
    }

    return true;
}

// ======================================================================================
// 3. 角色查看逻辑
// ======================================================================================

async function characterViewUserPhone(chatId, isSilent = false) {
    const chat = state.chats[chatId];
    if (!chat) return;

    if (!canCharacterViewUserPhone(chatId)) {
        if (!isSilent) alert("该角色没有权限查看你的手机 (请在API设置或角色设置中开启)");
        return;
    }

    initUserPhoneData(chat);
    const phoneData = chat.userPhoneData;

    if (isPhoneEmpty(phoneData)) {
        const emptyMsg = {
            role: "system",
            type: "pat_message",
            content: `[系统] ${chat.name} 查看了你的手机\n\n(手机内容为空)`,
            timestamp: Date.now(),
            isSystem: true
        };
        chat.history.push(emptyMsg);
        if (!isSilent && typeof appendMessage === 'function') appendMessage(emptyMsg, chat);
        await db.chats.put(chat);
        return;
    }

    let detailedContent = `[系统] ${chat.name} 查看了你的手机\n\n`;

    // --- 备忘录 ---
    if (phoneData.permissions.memos && phoneData.memos.length > 0) {
        detailedContent += `📱 备忘录 (${phoneData.memos.length}条):\n`;
        phoneData.memos.forEach(memo => {
            detailedContent += `• ${memo.title}\n  ${memo.content}\n\n`;
        });
        detailedContent += `------------------\n`;
    }

    // --- 聊天记录 (修正兼容性) ---
    if (phoneData.permissions.chats) {
        const chatKeys = Object.keys(phoneData.chats);
        if (chatKeys.length > 0) {
            detailedContent += `📱 聊天记录 (${chatKeys.length}人):\n`;
            for (const contactName of chatKeys) {
                const chatRecord = phoneData.chats[contactName];
                
                detailedContent += `▼ 与 ${contactName} 的对话:\n`;
                // 兼容性修正：检查 history
                const msgs = chatRecord.history || [];
                const msgsToShow = msgs.slice(-10);
                msgsToShow.forEach(msg => {
                    detailedContent += `  ${msg.sender}: ${msg.content}\n`;
                });
                if (msgs.length > 10) {
                    detailedContent += `  (...及更早的 ${msgs.length - 10} 条消息)\n`;
                }
                detailedContent += `\n`;
            }
            detailedContent += `------------------\n`;
        }
    }

    // --- 购物车 ---
    if (phoneData.permissions.shoppingCart && phoneData.shoppingCart.length > 0) {
        detailedContent += `📱 购物车 (${phoneData.shoppingCart.length}件):\n`;
        phoneData.shoppingCart.forEach(item => {
            detailedContent += `• ${item.name} (¥${item.price}) - ${item.store}\n`;
        });
        detailedContent += `------------------\n`;
    }

    // --- 浏览记录 ---
    if (phoneData.permissions.browserHistory && phoneData.browserHistory.length > 0) {
        detailedContent += `📱 浏览记录 (${phoneData.browserHistory.length}条):\n`;
        phoneData.browserHistory.slice(0, 15).forEach(item => {
             detailedContent += `• ${item.query || item.title}: ${item.result || item.url}\n`;
        });
        detailedContent += `------------------\n`;
    }
    
    // --- 银行记录 ---
    if (phoneData.permissions.bank && phoneData.bank) {
        detailedContent += `📱 银行账户:\n  余额: ¥${(phoneData.bank.balance || 0).toFixed(2)}\n`;
        if (phoneData.bank.transactions && phoneData.bank.transactions.length > 0) {
             detailedContent += `  最近交易:\n`;
             phoneData.bank.transactions.slice(0, 5).forEach(t => {
                 detailedContent += `  • [${t.type}] ¥${t.amount}: ${t.description}\n`;
             });
        }
        detailedContent += `------------------\n`;
    }

    // --- 轨迹 ---
    if (phoneData.permissions.trajectory && phoneData.trajectory.length > 0) {
        detailedContent += `📱 行动轨迹:\n`;
        phoneData.trajectory.forEach(t => {
            detailedContent += `• ${t.time} @ ${t.location}: ${t.activity}\n`;
        });
        detailedContent += `------------------\n`;
    }

    // --- 日记 ---
    if (phoneData.permissions.diary && phoneData.diary.length > 0) {
        detailedContent += `📱 日记 (${phoneData.diary.length}篇):\n`;
        phoneData.diary.slice(0, 3).forEach(d => {
            const dateStr = new Date(d.timestamp).toLocaleDateString();
            detailedContent += `📅 ${dateStr}\n${d.content}\n\n`;
        });
        detailedContent += `------------------\n`;
    }

    // --- 应用使用 ---
    if (phoneData.permissions.appUsage && phoneData.appUsage.length > 0) {
        detailedContent += `📱 应用使用情况:\n`;
        phoneData.appUsage.forEach(app => {
            detailedContent += `• ${app.appName}: ${app.duration}\n`;
        });
        detailedContent += `------------------\n`;
    }

    const systemMessage = {
        role: "system",
        type: "pat_message",
        content: detailedContent,
        timestamp: Date.now(),
        isSystem: true
    };
    
    chat.history.push(systemMessage);
    if (!isSilent && typeof appendMessage === 'function') appendMessage(systemMessage, chat);
    await db.chats.put(chat);
}

function isPhoneEmpty(data) {
    if (!data) return true;
    if (data.memos && data.memos.length > 0) return false;
    if (data.chats && Object.keys(data.chats).length > 0) return false;
    if (data.shoppingCart && data.shoppingCart.length > 0) return false;
    if (data.browserHistory && data.browserHistory.length > 0) return false;
    if (data.bank && data.bank.transactions && data.bank.transactions.length > 0) return false;
    if (data.trajectory && data.trajectory.length > 0) return false;
    if (data.diary && data.diary.length > 0) return false;
    return true;
}

// ======================================================================================
// 4. 数据操作 (增删改) - 用于手动编辑模式
// ======================================================================================

function getUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function openUserPhoneUI(chatId) {
    window.myPhoneMode = 'user';
    if (typeof openCharacterPhone === 'function') {
        openCharacterPhone(chatId);
    }
}

// ======================================================================================
// 5. AI 生成逻辑 (基于用户人设) - 修正兼容性
// ======================================================================================

async function generateUserPhoneDataSegment(chatId, dataType) {
    const chat = state.chats[chatId];
    if (!chat) return;
    
    initUserPhoneData(chat);

    const { proxyUrl, apiKey, model } = state.apiConfig;
    
    if (!apiKey) {
        alert("请先在API设置中配置 API Key");
        return;
    }

    const userPersona = chat.settings.myPersona || "一个普通用户";
    const userNickname = chat.settings.myNickname || "我";
    
    let description = "";
    let jsonStructure = "";
    
    switch(dataType) {
        case "memos":
            description = "2到3篇你(用户)新写的简短备忘录。";
            jsonStructure = `"memos": [ { "title": "标题", "content": "内容" } ]`;
            break;
        case "chats":
            description = "你(用户)与虚拟朋友的聊天记录。如果还没有虚拟朋友，请虚构2-3个。";
            jsonStructure = `"chats": [ { "contactName": "朋友名", "messages": [ { "sender": "朋友名", "content": "..." }, { "sender": "${userNickname}", "content": "..." } ] } ]`;
            break;
        case "shoppingCart":
            description = "3到5件你(用户)最近加入购物车的新商品。";
            jsonStructure = `"shoppingCart": [ { "name": "商品名", "price": 100, "store": "店铺" } ]`;
            break;
        case "browserHistory":
            description = "2到3条你(用户)最近的搜索记录。";
            jsonStructure = `"browserHistory": [ { "query": "搜索词", "result": "摘要" } ]`;
            break;
        case "photoAlbum":
            description = "2到3张你(用户)拍摄的照片描述。";
            jsonStructure = `"photoAlbum": [ { "hiddenContent": "描述" } ]`;
            break;
        case "bank":
            description = "3到5条银行交易记录。";
            jsonStructure = `"bank": { "transactions": [ { "type": "支出", "amount": 100, "description": "描述" } ] }`;
            break;
        case "trajectory":
            description = "2到3条行动轨迹。";
            jsonStructure = `"trajectory": [ { "time": "时间", "location": "地点", "activity": "活动" } ]`;
            break;
        case "appUsage":
            description = "3到5条应用使用记录。";
            jsonStructure = `"appUsage": [ { "appName": "应用", "duration": "30分钟" } ]`;
            break;
        case "diary":
            description = "一篇新日记。";
            jsonStructure = `"diary": [ { "timestamp": ${Date.now()}, "content": "日记内容" } ]`;
            break;
    }
    
    // --- 1. 构建上下文 ---
    
    // A. 聊天记录上下文 (让AI知道当前发生了什么)
    const recentHistory = chat.history
        .filter(m => !m.isHidden) // 过滤掉隐藏消息
        .slice(-15) // 取最近15条
        .map(msg => {
            const sender = msg.role === 'user' ? userNickname : chat.name;
            return `${sender}: ${msg.content}`;
        }).join('\n');

    // B. 世界书上下文 (保持设定一致性)
    let worldBookContext = "";
    if (typeof state !== 'undefined' && state.worldBooks) {
         const linkedIds = chat.settings.linkedWorldBookIds || [];
         const booksToInclude = state.worldBooks.filter(book =>
             linkedIds.includes(book.id) || book.isGlobal
         );
         if (booksToInclude.length > 0) {
             worldBookContext = "--- 世界观设定 (必须遵守) ---\n" + booksToInclude.map(b => `[${b.name}]: ${b.content}`).join("\n\n");
         }
    }

    // C. 现有手机数据上下文 (针对聊天生成，避免每次都虚构新人)
    let myPhoneContext = "";
    if (dataType === 'chats') {
         const contacts = chat.userPhoneData.virtualContacts || [];
         if (contacts.length > 0) {
             myPhoneContext += "# 已有的虚拟朋友列表 (请优先生成与他们的对话):\n" + contacts.map(c => `- ${c.name}`).join('\n') + "\n";
         }
         
         // 简单的最近聊天摘要
         const existingChats = chat.userPhoneData.chats || {};
         const chatSummaries = Object.entries(existingChats).map(([name, data]) => {
             if(data.history && data.history.length > 0) {
                 const lastMsg = data.history[data.history.length - 1];
                 const lastSender = lastMsg.sender || "对方";
                 return `- 与 ${name} 的上一条消息: "${lastSender}: ${lastMsg.content}"`;
             }
             return "";
         }).filter(Boolean).join("\n");
         
         if(chatSummaries) {
             myPhoneContext += "# 虚拟朋友聊天状态参考:\n" + chatSummaries + "\n";
         }
    }

    const prompt = `
# 角色扮演任务
你现在是"${userNickname}"（用户）。
你的人设: ${userPersona}

${worldBookContext}

# 参考上下文 (你与"${chat.name}"的最近对话)
${recentHistory}

# 任务: 生成你手机里的【${dataType}】数据。
描述: ${description}

${myPhoneContext}

# 要求:
1. 必须完全符合你的人设。
2. 数据要真实、生活化。
3. 返回纯 JSON 格式，不要包含Markdown代码块标记。
4. JSON结构必须包含: { ${jsonStructure} }
`;

    try {
        const response = await fetch(`${proxyUrl}/v1/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: "user", content: prompt }],
                temperature: 0.8
            })
        });
        
        if (!response.ok) throw new Error("API Request Failed");
        
        const data = await response.json();
        let content = data.choices[0].message.content.replace(/^```json\s*|```$/g, "");
        const newData = JSON.parse(content);
        
        const phoneData = chat.userPhoneData;
        phoneData.lastGenerated = Date.now();
        
        if (newData[dataType]) {
             if (Array.isArray(phoneData[dataType])) {
                 phoneData[dataType].push(...(newData[dataType] || []));
             } else if (dataType === 'bank' && newData.bank) {
                 if (newData.bank.transactions) phoneData.bank.transactions.push(...newData.bank.transactions);
                 if (newData.bank.balance) phoneData.bank.balance = newData.bank.balance;
             } else if (dataType === 'chats' && newData.chats) {
                 // 兼容性修正：使用 contactName 作为键，messages 存入 history
                 newData.chats.forEach(c => {
                     const contactName = c.contactName;
                     
                     // 自动创建/更新虚拟联系人 (用于列表显示头像等)
                     let contact = phoneData.virtualContacts.find(vc => vc.name === contactName);
                     if (!contact) {
                         contact = { id: getUniqueId(), name: contactName, avatar: "", persona: "" };
                         phoneData.virtualContacts.push(contact);
                     }
                     
                     // 保存聊天记录 (修正结构)
                     if (!phoneData.chats[contactName]) {
                         phoneData.chats[contactName] = { 
                             avatar: "", 
                             history: [] 
                         };
                     }
                     
                     if(Array.isArray(c.messages)) {
                         phoneData.chats[contactName].history.push(...c.messages);
                     }
                 });
             }
        }
        
        await db.chats.put(chat);
        
    } catch (e) {
        console.error("生成失败", e);
        alert("生成失败: " + e.message);
    }
}

// 导出供全局使用
window.MyPhone = {
    initUserPhoneData,
    canCharacterViewUserPhone,
    characterViewUserPhone,
    openUserPhoneUI,
    generateUserPhoneDataSegment
};

/**
 * 全局函数：打开用户手机的角色选择界面
 */
window.openUserPhoneCharacterSelection = function() {
    window.myPhoneMode = 'user';
    if (typeof openCharacterSelectionScreen === 'function') {
        openCharacterSelectionScreen();
    } else {
        console.error("openCharacterSelectionScreen function not found!");
    }
};
