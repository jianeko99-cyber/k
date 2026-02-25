// couple-avatar-recognition.js
// 情头识别功能模块
// Version: 1.2 (Fixed Gemini Vision Support)

console.log("Couple Avatar Recognition Module Loaded v1.2");

// 导出全局函数
window.recognizeCurrentCoupleAvatar = recognizeCurrentCoupleAvatar;
window.findCurrentCoupleAvatarPair = findCurrentCoupleAvatarPair;
window.openCoupleAvatarEditor = openCoupleAvatarEditor;

// =====================
// 新增：情头编辑功能
// =====================

/**
 * 打开情头编辑弹窗
 * @param {string} pairId 情头对ID
 */
function openCoupleAvatarEditor(pairId) {
    const chat = state.chats[state.activeChatId];
    if (!chat || !chat.settings.coupleAvatarLibrary) return;
    
    const pair = chat.settings.coupleAvatarLibrary.find(p => p.id === pairId);
    if (!pair) return;
    
    // 如果没有弹窗HTML，创建它
    if (!document.getElementById("couple-avatar-editor-modal")) {
        createCoupleAvatarEditorHtml();
    }
    
    const modal = document.getElementById("couple-avatar-editor-modal");
    
    // 填充数据
    const userImg = document.getElementById("editor-preview-user");
    const charImg = document.getElementById("editor-preview-char");
    const descInput = document.getElementById("editor-desc-input");
    const aiDescInput = document.getElementById("editor-ai-desc-input");
    
    userImg.src = pair.userAvatar;
    charImg.src = pair.charAvatar;
    descInput.value = pair.description || "";
    aiDescInput.value = pair.recognizedDescription || "";
    
    // 绑定关闭
    const closeBtn = document.getElementById("close-editor-modal-btn");
    closeBtn.onclick = () => modal.classList.remove("visible");
    const cancelBtn = document.getElementById("cancel-editor-btn");
    cancelBtn.onclick = () => modal.classList.remove("visible");
    
    // 绑定保存逻辑 (每次打开重新绑定，闭包捕获当前的 pair)
    const saveBtn = document.getElementById("save-editor-btn");
    saveBtn.onclick = async () => {
        // 更新数据对象
        pair.description = descInput.value;
        pair.recognizedDescription = aiDescInput.value;
        pair.userAvatar = userImg.src;
        pair.charAvatar = charImg.src;
        
        // 尝试自动同步到当前聊天设置（如果正在使用这组头像）
        // 简单策略：如果开启了情头模式，询问用户是否立即应用修改
        if (chat.settings.isCoupleAvatar) {
             if(confirm("修改已保存。是否将最新修改立即应用到当前聊天？")) {
                chat.settings.myAvatar = pair.userAvatar;
                chat.settings.aiAvatar = pair.charAvatar;
                chat.settings.coupleAvatarDescription = pair.description;
                
                // 刷新界面
                if (typeof window.renderChatInterface === 'function') {
                    window.renderChatInterface(chat.id);
                }
             }
        }
        
        // 保存到数据库
        await db.chats.put(chat);
        modal.classList.remove("visible");
        
        // 刷新列表（如果在管理界面）
        if (typeof window.renderCoupleAvatarLibraryList === 'function') {
            window.renderCoupleAvatarLibraryList();
        }
    };
    
    // 绑定图片上传预览
    setupEditorFileUpload("editor-upload-user", "editor-preview-user");
    setupEditorFileUpload("editor-upload-char", "editor-preview-char");
    
    // 显示弹窗
    modal.classList.add("visible");
}

function setupEditorFileUpload(inputId, imgId) {
    const input = document.getElementById(inputId);
    // 移除旧监听器避免重复绑定
    const newInput = input.cloneNode(true);
    input.parentNode.replaceChild(newInput, input);
    
    newInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById(imgId).src = e.target.result;
        };
        reader.readAsDataURL(file);
    };
}

function createCoupleAvatarEditorHtml() {
    const html = `
    <div id="couple-avatar-editor-modal" class="modal" style="z-index: 2100;">
        <div class="modal-content" style="max-width: 500px; padding: 20px;">
            <div class="modal-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
                <h3 style="margin:0;">编辑情侣头像</h3>
                <span class="close-modal" id="close-editor-modal-btn" style="cursor:pointer; font-size:24px;">&times;</span>
            </div>
            <div class="modal-body">
                
                <div style="display: flex; gap: 40px; justify-content: center; margin-bottom: 25px;">
                    <div style="text-align: center; cursor: pointer;" onclick="document.getElementById('editor-upload-user').click()">
                        <div style="position: relative; width: 80px; height: 80px; margin: 0 auto;">
                            <img id="editor-preview-user" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 3px solid #eee; transition: all 0.2s;">
                            <div style="position: absolute; bottom: 0; right: 0; background: #2196F3; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 12px; border: 2px solid white;">✏️</div>
                        </div>
                        <div style="font-size: 12px; color: #666; margin-top: 8px; font-weight: 500;">点击修改用户</div>
                        <input type="file" id="editor-upload-user" hidden accept="image/*">
                    </div>
                    
                    <div style="text-align: center; cursor: pointer;" onclick="document.getElementById('editor-upload-char').click()">
                        <div style="position: relative; width: 80px; height: 80px; margin: 0 auto;">
                            <img id="editor-preview-char" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 3px solid #eee; transition: all 0.2s;">
                            <div style="position: absolute; bottom: 0; right: 0; background: #FF4081; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 12px; border: 2px solid white;">✏️</div>
                        </div>
                        <div style="font-size: 12px; color: #666; margin-top: 8px; font-weight: 500;">点击修改角色</div>
                        <input type="file" id="editor-upload-char" hidden accept="image/*">
                    </div>
                </div>

                <div class="form-group" style="margin-bottom: 15px;">
                    <label style="font-size: 13px; color: #555; font-weight: 600; display:block; margin-bottom:5px;">情头名称 / 描述</label>
                    <input type="text" id="editor-desc-input" class="moe-input" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 6px;">
                </div>
                
                <div class="form-group" style="margin-bottom: 20px;">
                    <label style="font-size: 13px; color: #555; font-weight: 600; display:block; margin-bottom:5px;">AI 识别特征 (Prompt)</label>
                    <textarea id="editor-ai-desc-input" class="moe-input" style="width: 100%; height: 80px; padding: 8px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; resize: vertical;"></textarea>
                    <div style="font-size: 11px; color: #999; margin-top: 4px;">AI 会参考这段描述来判断是否适合当前的聊天氛围。</div>
                </div>
                
                <div style="display: flex; gap: 10px; justify-content: flex-end; padding-top: 10px; border-top: 1px solid #eee;">
                    <button id="cancel-editor-btn" style="padding: 8px 16px; border: 1px solid #ddd; background: white; border-radius: 6px; cursor: pointer; color: #666;">取消</button>
                    <button id="save-editor-btn" style="padding: 8px 20px; border: none; background: #2196F3; color: white; border-radius: 6px; cursor: pointer; font-weight: 500;">保存修改</button>
                </div>
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
}

/**
 * 识别当前情侣头像
 */
async function recognizeCurrentCoupleAvatar() {
    const chat = state.chats[state.activeChatId];
    if (!chat) return;

    // 1. 获取当前头像
    const userAvatar = chat.settings.myAvatar;
    const charAvatar = chat.settings.aiAvatar;

    if (!userAvatar || !charAvatar) {
        alert("请先设置好你自己和角色的头像！");
        return;
    }

    // 2. 更新UI状态
    const btn = document.getElementById("recognize-current-avatar-btn");
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="loading-spinner"></span> 识别中...';
    btn.disabled = true;

    try {
        // 预处理图片：尝试转换为 Base64 (解决跨域图片/默认头像问题)
        // 这一步对于 Gemini 是必须的，因为 Gemini API (REST) 不支持直接传图片 URL
        const [userAvatarProcessed, charAvatarProcessed] = await Promise.all([
            processAvatarForApi(userAvatar),
            processAvatarForApi(charAvatar)
        ]);

        // 3. 构建识别请求
        const description = await callVisionApiForAvatar(userAvatarProcessed, charAvatarProcessed);
        
        // 4. 显示结果
        showRecognitionResultModal(description, userAvatar, charAvatar);
        
        await db.chats.put(chat);

    } catch (error) {
        console.error("头像识别失败:", error);
        alert("识别失败: " + error.message);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

/**
 * 预处理头像图片：将 URL 转为 Base64（如无法转换则原样返回）
 */
async function processAvatarForApi(url) {
    if (!url) return "";
    if (url.startsWith("data:")) return url; // 已经是 Base64

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Fetch failed");
        const blob = await response.blob();
        return await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.warn("头像转换 Base64 失败 (可能是跨域或无效 URL)，将尝试直接使用原 URL:", error);
        // 如果转换失败，只能返回原 URL。
        // 注意：Gemini API 不支持 URL，后续构建请求时会检测并报错。
        // OpenAI 兼容接口可能支持 URL。
        return url;
    }
}

/**
 * 调用API进行视觉识别
 */
async function callVisionApiForAvatar(userAvatarBase64, charAvatarBase64) {
    const { proxyUrl, apiKey, model } = state.apiConfig;
    
    if (!proxyUrl || !apiKey || !model) {
        throw new Error("请先在API设置中配置反代地址、密钥并选择模型。");
    }

    // 构建Prompt
    const systemPrompt = "你是一个敏锐的视觉助手。";
    const userPrompt = `请分析这两张头像的特征：
1. 第一张是用户的头像
2. 第二张是角色的头像

请描述：
- 画风类型（动漫/真人/卡通等）
- 主要元素和主题
- 色调和氛围
- 是否是情侣头像配对，有什么关联特征
- 用简洁的1-2句话总结整体风格

输出格式要简洁，方便用户理解。不要输出多余的解释。`;

    const messages = [
        { role: "system", content: systemPrompt },
        {
            role: "user",
            content: [
                { type: "text", text: userPrompt },
                { type: "image_url", image_url: { url: userAvatarBase64 } },
                { type: "image_url", image_url: { url: charAvatarBase64 } }
            ]
        }
    ];

    // 发送请求
    // 注意：Gemini Vision 需要特殊的 JSON 结构
    const isGemini = proxyUrl.includes("goog") || model.includes("gemini");
    let response;
    
    if (isGemini) {
         // 手动构造 Gemini Vision 请求
         // 生成内容端点
         const url = `${proxyUrl}/v1beta/models/${model}:generateContent?key=${apiKey}`;
         
         const contents = messages.filter(m => m.role === 'user').map(m => {
             // 处理 content 数组
             const parts = m.content.map(c => {
                 if (c.type === 'text') return { text: c.text };
                 if (c.type === 'image_url') {
                     try {
                         // 提取 base64
                         const urlStr = c.image_url.url;
                         if (urlStr.startsWith("data:")) {
                             const base64Data = urlStr.split(',')[1];
                             const mimeType = urlStr.split(';')[0].split(':')[1];
                             return { inline_data: { mime_type: mimeType, data: base64Data } };
                         } else {
                             // 如果是 URL，Gemini 不支持，必须抛出错误，提示用户上传本地图片
                             throw new Error("Gemini API 不支持直接传图片 URL，请使用本地上传的图片作为头像。");
                         }
                     } catch (e) {
                         console.error("图片数据解析失败", e);
                         // 抛出错误以便外层捕获
                         throw e;
                     }
                 }
                 return null;
             }).filter(p => p !== null);

             return {
                 role: "user",
                 parts: parts
             };
         });

         // 提取系统提示词
         const systemMsg = messages.find(m => m.role === 'system');
         let systemInstruction = undefined;
         
         // 尝试构建 systemInstruction (Gemini 1.5 Pro/Flash 支持)
         if (systemMsg && systemMsg.content) {
             systemInstruction = {
                 parts: [{ text: systemMsg.content }]
             };
         }

         const requestBody = {
             contents: contents,
             generationConfig: {
                 temperature: 0.7
             }
         };
         
         if (systemInstruction) {
             requestBody.systemInstruction = systemInstruction;
         }

         response = await fetch(url, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify(requestBody)
         });
         
    } else {
        // OpenAI Compatible
        response = await fetch(`${proxyUrl}/v1/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                max_tokens: 300
            })
        });
    }

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    
    if (isGemini) {
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "无法识别";
    } else {
        return data.choices?.[0]?.message?.content || "无法识别";
    }
}

/**
 * 显示识别结果弹窗
 */
function showRecognitionResultModal(description, userAvatar, charAvatar) {
    let modal = document.getElementById("recognition-result-modal");
    if (!modal) {
        createRecognitionModalHtml();
        modal = document.getElementById("recognition-result-modal");
    }
    
    document.getElementById("recognition-desc-text").value = description;
    document.getElementById("recognition-preview-user").src = userAvatar;
    document.getElementById("recognition-preview-char").src = charAvatar;
    
    renderRecognitionBindList(description);
    
    modal.classList.add("visible");
    
    document.getElementById("close-recognition-modal-btn").onclick = () => modal.classList.remove("visible");
    
    document.getElementById("create-new-couple-from-recognition-btn").onclick = () => {
        const finalDesc = document.getElementById("recognition-desc-text").value;
        createNewCoupleFromRecognition(finalDesc, userAvatar, charAvatar);
        modal.classList.remove("visible");
    };
}

/**
 * 创建弹窗 HTML
 */
function createRecognitionModalHtml() {
    const modalHtml = `
    <div id="recognition-result-modal" class="modal" style="z-index: 2000;">
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h3>头像识别结果</h3>
                <span class="close-modal" id="close-recognition-modal-btn">&times;</span>
            </div>
            <div class="modal-body">
                <div style="display: flex; gap: 15px; justify-content: center; margin-bottom: 20px;">
                    <div style="text-align: center;">
                        <img id="recognition-preview-user" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 2px solid #ddd;">
                        <div style="font-size: 12px; color: #666;">用户</div>
                    </div>
                    <div style="text-align: center;">
                        <img id="recognition-preview-char" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 2px solid #ddd;">
                        <div style="font-size: 12px; color: #666;">角色</div>
                    </div>
                </div>

                <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <h4 style="margin: 0 0 10px 0; font-size: 14px; color: #333;">AI 识别描述 (可修改)：</h4>
                    <textarea id="recognition-desc-text" class="moe-input" style="width: 100%; height: 120px; font-size: 14px; line-height: 1.5; color: #555; resize: vertical;"></textarea>
                </div>

                <h4 style="margin-bottom: 10px;">选择绑定到现有情头库：</h4>
                <div id="recognition-bind-list" style="max-height: 200px; overflow-y: auto; border: 1px solid #eee; border-radius: 8px; margin-bottom: 20px;">
                </div>
                
                <div style="text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
                    <button id="create-new-couple-from-recognition-btn" style="
                        width: 100%;
                        background: linear-gradient(135deg, #FF9A9E 0%, #FECFEF 99%, #FECFEF 100%);
                        border: none;
                        border-radius: 12px;
                        padding: 12px;
                        color: white;
                        font-weight: 600;
                        font-size: 15px;
                        cursor: pointer;
                        box-shadow: 0 4px 15px rgba(255, 154, 158, 0.4);
                        transition: all 0.2s ease;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                    " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(255, 154, 158, 0.6)'" 
                      onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(255, 154, 158, 0.4)'">
                        <span style="font-size: 18px;"></span> 将此创建为新配对
                    </button>
                    <p style="font-size: 12px; color: #999; margin-top: 12px;">或者从上方列表选择已有情头进行绑定</p>
                </div>
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

/**
 * 渲染绑定列表
 */
function renderRecognitionBindList(currentRecognitionDesc) {
    const listEl = document.getElementById("recognition-bind-list");
    const chat = state.chats[state.activeChatId];
    const library = chat.settings.coupleAvatarLibrary || [];
    
    listEl.innerHTML = "";
    
    if (library.length === 0) {
        listEl.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">情头库为空，请使用下方的“创建为新配对”按钮。</div>';
        return;
    }
    
    library.forEach(pair => {
        const item = document.createElement("div");
        item.style.cssText = `
            padding: 12px; 
            border-bottom: 1px solid #f0f0f0; 
            display: flex; 
            align-items: center; 
            justify-content: space-between;
            transition: background 0.2s;
        `;
        item.onmouseover = () => item.style.background = "#fafafa";
        item.onmouseout = () => item.style.background = "transparent";
        
        const hasRec = !!pair.recognizedDescription;
        
        item.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                <div style="display: flex; position: relative;">
                    <img src="${pair.userAvatar}" style="width: 36px; height: 36px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.1); z-index: 2;">
                    <img src="${pair.charAvatar}" style="width: 36px; height: 36px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-left: -12px; z-index: 1;">
                </div>
                <div style="font-size: 13px; display: flex; flex-direction: column; gap: 2px;">
                    <div style="font-weight: 600; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 160px;">${pair.description}</div>
                    ${hasRec ? '<span style="font-size: 10px; color: #ff6b81; background: #fff0f3; padding: 2px 6px; border-radius: 10px; width: fit-content;">✨ 已有AI描述</span>' : ''}
                </div>
            </div>
            <div style="display: flex; gap: 8px;">
                <button class="bind-only-btn" style="
                    font-size: 12px; 
                    padding: 6px 12px;
                    border: 1px solid #e0e0e0;
                    background: #fff;
                    color: #666;
                    border-radius: 15px;
                    cursor: pointer;
                    transition: all 0.2s;
                ">仅绑定</button>
                <button class="bind-apply-btn" style="
                    font-size: 12px; 
                    padding: 6px 12px;
                    border: none;
                    background: linear-gradient(135deg, #ff9a9e 0%, #ff6b81 100%);
                    color: white;
                    border-radius: 15px;
                    cursor: pointer;
                    box-shadow: 0 2px 5px rgba(255, 107, 129, 0.3);
                    transition: all 0.2s;
                ">绑定并应用</button>
            </div>
        `;
        
        // 绑定事件：传入当前文本框里修改后的内容
        const getDesc = () => document.getElementById("recognition-desc-text").value;
        item.querySelector(".bind-only-btn").onclick = () => handleBindAction(pair.id, getDesc(), false);
        item.querySelector(".bind-apply-btn").onclick = () => handleBindAction(pair.id, getDesc(), true);
        
        listEl.appendChild(item);
    });
}

/**
 * 处理绑定动作
 */
async function handleBindAction(pairId, recognitionDesc, applyNow) {
    const chat = state.chats[state.activeChatId];
    const pair = chat.settings.coupleAvatarLibrary.find(p => p.id === pairId);
    
    if (!pair) return;
    
    if (pair.recognizedDescription) {
        if (!confirm(`该情头已有识别结果：\n"${pair.recognizedDescription}"\n\n是否覆盖？`)) {
            return;
        }
    }
    
    pair.recognizedDescription = recognitionDesc;
    pair.recognizedAt = Date.now();
    
    const msgContent = "";
    
    if (applyNow) {
        chat.settings.myAvatar = pair.userAvatar;
        chat.settings.aiAvatar = pair.charAvatar;
        chat.settings.isCoupleAvatar = true;
        chat.settings.coupleAvatarDescription = pair.description;
        
        if (typeof window.renderChatInterface === 'function') {
            window.renderChatInterface(chat.id);
        }
        
        alert(`已应用情头「${pair.description}」`);
    } else {
        alert(`已将识别结果绑定到情头「${pair.description}」`);
    }
    
    await db.chats.put(chat);
    document.getElementById("recognition-result-modal").classList.remove("visible");
    if (typeof renderCoupleAvatarLibraryList === 'function') {
        renderCoupleAvatarLibraryList();
    }
}

/**
 * 创建新配对
 */
async function createNewCoupleFromRecognition(description, userAvatar, charAvatar) {
    const chat = state.chats[state.activeChatId];
    if (!chat.settings.coupleAvatarLibrary) {
        chat.settings.coupleAvatarLibrary = [];
    }
    
    const newPair = {
        id: "couple_" + Date.now(),
        userAvatar: userAvatar,
        charAvatar: charAvatar,
        // 这里默认还是自动时间，但会提示用户可以在管理界面修改，
        // 或者我们直接在这里也支持修改？不过需求里没特别说创建时要改标题
        description: `新情侣头像 (${new Date().toLocaleDateString()})`, 
        recognizedDescription: description,
        recognizedAt: Date.now()
    };
    
    chat.settings.coupleAvatarLibrary.push(newPair);
    
    chat.settings.isCoupleAvatar = true;
    chat.settings.coupleAvatarDescription = newPair.description;
    
    await db.chats.put(chat);
    
    // 弹出提示
    alert("已成功创建新情头配对！");
    
    if (typeof renderCoupleAvatarLibraryList === 'function') {
        renderCoupleAvatarLibraryList();
    }
    
    // 假设 openSettingsModal 是负责打开并渲染设置的函数（根据实际代码可能不同）
    // 如果没有专门的 renderChatSettings，通常 showSettingsModal 会做这个工作
    if (typeof showSettingsModal === 'function') {
        showSettingsModal();
    } else {
        // Fallback: 至少更新输入框
        const descInput = document.getElementById("couple-avatar-description");
        if (descInput) descInput.value = newPair.description;
    }
}

/**
 * 辅助函数：查找当前使用的情侣头像
 * 
 * 逻辑：比较当前的 myAvatar 和 aiAvatar 与库中的记录是否匹配
 */
function findCurrentCoupleAvatarPair(chat) {
    if (!chat.settings.coupleAvatarLibrary) return null;
    
    const currentMy = chat.settings.myAvatar;
    const currentAi = chat.settings.aiAvatar;
    
    return chat.settings.coupleAvatarLibrary.find(pair => 
        pair.userAvatar === currentMy && pair.charAvatar === currentAi
    );
}
