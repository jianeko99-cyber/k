// sticker-recognition.js
// 表情包智能识别模块
// 依赖：state.apiConfig (在 index.html 中定义)

console.log("Sticker Recognition Module Loaded");

// 导出全局函数
window.recognizeStickerForAI = recognizeStickerForAI;
window.processMessageContentForAI = processMessageContentForAI;
window.openStickerRecognitionEditor = openStickerRecognitionEditor;

/**
 * 识别单个表情包
 * @param {object} sticker 表情包对象 {id, url, name, ...}
 * @returns {Promise<string>} 识别描述
 */
async function recognizeStickerForAI(sticker) {
    if (!sticker || !sticker.url) throw new Error("无效的表情包对象");

    // 1. 预处理图片
    const stickerBase64 = await processStickerForApi(sticker.url);

    // 2. 调用 Vision API
    return await callVisionApiForSticker(stickerBase64, sticker.name);
}

/**
 * 预处理表情包图片：将 URL 转为 Base64（如无法转换则原样返回）
 */
async function processStickerForApi(url) {
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
        console.warn("表情包转换 Base64 失败，尝试直接使用 URL:", error);
        return url;
    }
}

/**
 * 调用API进行视觉识别
 */
async function callVisionApiForSticker(stickerBase64, stickerName) {
    const { proxyUrl, apiKey, model } = state.apiConfig;
    
    if (!proxyUrl || !apiKey || !model) {
        throw new Error("请先在API设置中配置反代地址、密钥并选择模型。");
    }

    // 构建Prompt
    const systemPrompt = "你是一个敏锐的视觉助手。";
    const userPrompt = `请简洁描述这个表情包的内容（表情包名称：${stickerName}）：
- 画面中的主要元素和角色
- 表达的情绪或动作
- 整体氛围

用1-2句话总结，不超过50字。`;

    const messages = [
        { role: "system", content: systemPrompt },
        {
            role: "user",
            content: [
                { type: "text", text: userPrompt },
                { type: "image_url", image_url: { url: stickerBase64 } }
            ]
        }
    ];

    // 发送请求
    const isGemini = proxyUrl.includes("goog") || model.includes("gemini");
    let response;
    
    if (isGemini) {
         // 手动构造 Gemini Vision 请求
         const url = `${proxyUrl}/v1beta/models/${model}:generateContent?key=${apiKey}`;
         
         const contents = messages.filter(m => m.role === 'user').map(m => {
             const parts = m.content.map(c => {
                 if (c.type === 'text') return { text: c.text };
                 if (c.type === 'image_url') {
                     try {
                         const urlStr = c.image_url.url;
                         if (urlStr.startsWith("data:")) {
                             const base64Data = urlStr.split(',')[1];
                             const mimeType = urlStr.split(';')[0].split(':')[1];
                             return { inline_data: { mime_type: mimeType, data: base64Data } };
                         } else {
                             throw new Error("Gemini API 不支持直接传图片 URL，请使用本地上传的图片。");
                         }
                     } catch (e) {
                         console.error("图片数据解析失败", e);
                         throw e;
                     }
                 }
                 return null;
             }).filter(p => p !== null);

             return { role: "user", parts: parts };
         });

         // 提取系统提示词
         const systemMsg = messages.find(m => m.role === 'system');
         let systemInstruction = undefined;
         if (systemMsg && systemMsg.content) {
             systemInstruction = { parts: [{ text: systemMsg.content }] };
         }

         const requestBody = {
             contents: contents,
             generationConfig: { temperature: 0.7 }
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
                max_tokens: 150
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
 * 处理消息内容，将表情包替换为带识别描述的格式
 * 只在发送给 AI 时调用，不影响数据库和界面显示
 */
async function processMessageContentForAI(content) {
    const chat = state.chats[state.activeChatId];
    if (!chat || !chat.settings.enableStickerRecognition) return content;

    // 检测表情包格式：[sticker:名字]
    // 使用全局匹配来处理一条消息中可能有多个表情包的情况
    const stickerRegex = /\[sticker:\s*(.+?)\s*\]/g;
    const stickerMatches = [...content.matchAll(stickerRegex)];
    
    if (stickerMatches.length === 0) return content;
    
    let processedContent = content;
    
    // 为了不破坏替换索引，我们先收集所有的替换信息，然后统一替换
    // 但简单的字符串替换在这里也是安全的，因为我们替换的是完整的标记
    
    for (const match of stickerMatches) {
        const fullTag = match[0];
        const stickerName = match[1].trim();
        
        // 查找表情包
        const allStickers = [
            ...(state.userStickers || []),
            ...(chat.settings.stickerLibrary || [])
        ];
        
        const sticker = allStickers.find(s => s.name === stickerName);
        
        if (!sticker) continue;
        
        // 获取识别描述
        let description = sticker.recognizedDescription;
        
        // 如果没有识别过，现在识别
        if (!description) {
            try {
                // 在界面上可能需要某种指示，但因为是静默的，这里只在控制台输出
                console.log(`正在静默识别表情包: ${stickerName}...`);
                description = await recognizeStickerForAI(sticker);
                
                // 保存识别结果（只保存用户表情包，因为角色表情包通常是预设的，或者也保存到 chat 设置里的 library）
                // 检查是在全局 userStickers 还是在 chat stickerLibrary
                const isUserSticker = state.userStickers && state.userStickers.some(s => s.id === sticker.id);
                
                if (isUserSticker) {
                    sticker.recognizedDescription = description;
                    sticker.recognizedAt = Date.now();
                    
                    if (window.db && window.db.userStickers) {
                         await window.db.userStickers.put(sticker);
                    }
                    
                    // 更新 state
                    const index = state.userStickers.findIndex(s => s.id === sticker.id);
                    if (index !== -1) {
                        state.userStickers[index] = sticker;
                    }
                } else {
                    // 角色表情包或聊天内表情包
                    // 如果是在 chat.settings.stickerLibrary 中
                    if (chat.settings.stickerLibrary) {
                        const idx = chat.settings.stickerLibrary.findIndex(s => s.id === sticker.id);
                        if (idx !== -1) {
                            chat.settings.stickerLibrary[idx].recognizedDescription = description;
                            chat.settings.stickerLibrary[idx].recognizedAt = Date.now();
                            await window.db.chats.put(chat);
                        }
                    }
                }
            } catch (error) {
                console.error(`表情包 "${stickerName}" 识别失败:`, error);
                continue; // 失败就保持原格式
            }
        }
        
        // 替换为带描述的格式
        if (description) {
            // 使用 replace 替换第一个匹配项（如果一行有多个相同的表情包，可能需要注意，但通常 replace 只替换第一个，这就够了，因为我们是循环处理 match）
            // 注意：如果多个相同表情包，这里可能会多次处理。为了安全，我们只替换当前这个 match
            // 实际上 String.prototype.replace(string, newSubstr) 只替换第一个匹配
            // 所以如果内容是 "[sticker:A] [sticker:A]"，第一次循环替换第一个，第二次循环替换第二个
            // 但如果 description 变了，可能会有问题。
            // 这里我们用更稳妥的方式：不做复杂的正则替换，而是只要有描述就加上
             processedContent = processedContent.replace(
                fullTag,
                `${fullTag}（${description}）`
            );
        }
    }
    
    return processedContent;
}

/**
 * 打开表情包识别编辑弹窗
 */
function openStickerRecognitionEditor(stickerId) {
    const chat = state.chats[state.activeChatId];
    const allStickers = [
        ...(state.userStickers || []),
        ...(chat.settings.stickerLibrary || [])
    ];
    
    const sticker = allStickers.find(s => s.id === stickerId);
    if (!sticker) return;

    if (!document.getElementById("sticker-editor-modal")) {
        createStickerEditorHtml();
    }

    const modal = document.getElementById("sticker-editor-modal");
    
    // 填充数据
    document.getElementById("editor-sticker-preview").src = sticker.url;
    document.getElementById("editor-sticker-name").value = sticker.name || "";
    document.getElementById("editor-sticker-description").value = sticker.recognizedDescription || "";
    
    // 绑定事件
    const saveBtn = document.getElementById("save-sticker-editor-btn");
    saveBtn.onclick = async () => {
        const newDesc = document.getElementById("editor-sticker-description").value;
        const newName = document.getElementById("editor-sticker-name").value;
        
        sticker.recognizedDescription = newDesc;
        sticker.name = newName; // 允许改名
        sticker.recognizedAt = Date.now();
        
        // 保存
        const isUserSticker = state.userStickers && state.userStickers.some(s => s.id === sticker.id);
        if (isUserSticker) {
            if (window.db && window.db.userStickers) {
                await window.db.userStickers.put(sticker);
            }
            // 更新 state
            const index = state.userStickers.findIndex(s => s.id === sticker.id);
            if (index !== -1) state.userStickers[index] = sticker;
        } else {
             if (chat.settings.stickerLibrary) {
                const idx = chat.settings.stickerLibrary.findIndex(s => s.id === sticker.id);
                if (idx !== -1) {
                    chat.settings.stickerLibrary[idx] = sticker;
                    await window.db.chats.put(chat);
                }
            }
        }
        
        modal.classList.remove("visible");
        
        // 刷新界面
        if (typeof window.renderStickerPanel === 'function') {
            window.renderStickerPanel();
        }
    };
    
    // 重新识别按钮
    const reRecBtn = document.getElementById("re-recognize-sticker-btn");
    reRecBtn.onclick = async () => {
        const originalText = reRecBtn.innerHTML;
        reRecBtn.innerHTML = "⌛ 识别中...";
        reRecBtn.disabled = true;
        try {
            const desc = await recognizeStickerForAI(sticker);
            document.getElementById("editor-sticker-description").value = desc;
        } catch (e) {
            alert("识别失败: " + e.message);
        } finally {
            reRecBtn.innerHTML = originalText;
            reRecBtn.disabled = false;
        }
    };
    
    document.getElementById("close-sticker-editor-btn").onclick = () => modal.classList.remove("visible");
    document.getElementById("cancel-sticker-editor-btn").onclick = () => modal.classList.remove("visible");
    
    modal.classList.add("visible");
}

function createStickerEditorHtml() {
    const html = `
    <div id="sticker-editor-modal" class="modal" style="z-index: 2200;">
      <div class="modal-content" style="max-width: 450px; padding: 20px;">
        <div class="modal-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
          <h3 style="margin:0;">编辑表情包识别</h3>
          <span class="close-modal" id="close-sticker-editor-btn" style="cursor:pointer; font-size:24px;">&times;</span>
        </div>
        <div class="modal-body">
          <!-- 表情包预览 -->
          <div style="text-align: center; margin-bottom: 20px;">
            <img id="editor-sticker-preview" 
                 style="max-width: 150px; max-height: 150px; border-radius: 8px; border: 2px solid #eee; object-fit: contain;">
          </div>
          
          <!-- 名称 -->
          <div class="form-group" style="margin-bottom: 15px;">
            <label style="font-size: 13px; color: #555; font-weight: 600; display:block; margin-bottom:5px;">表情包名称</label>
            <input type="text" id="editor-sticker-name" class="moe-input" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 6px;">
          </div>
          
          <!-- AI识别描述 -->
          <div class="form-group" style="margin-bottom: 15px;">
            <label style="font-size: 13px; color: #555; font-weight: 600; display:block; margin-bottom:5px;">AI 识别描述</label>
            <textarea id="editor-sticker-description" 
                      class="moe-input" 
                      style="width: 100%; height: 100px; padding: 8px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; resize: vertical;"
                      placeholder="AI 识别的内容描述..."></textarea>
            <div style="font-size: 11px; color: #999; margin-top: 4px;">
              发送时会附加此描述让角色理解表情包内容
            </div>
          </div>
          
          <!-- 操作按钮 -->
          <div style="display: flex; gap: 10px; margin-top: 20px;">
            <button id="re-recognize-sticker-btn" 
                    style="flex: 1; padding: 8px; background: #f0f0f0; border: none; border-radius: 6px; cursor: pointer; color:#555;">
              🔄 重新识别
            </button>
          </div>
          
          <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee;">
            <button id="cancel-sticker-editor-btn" 
                    style="padding: 8px 16px; border: 1px solid #ddd; background: white; border-radius: 6px; cursor: pointer; color: #666;">
              取消
            </button>
            <button id="save-sticker-editor-btn" 
                    style="padding: 8px 20px; border: none; background: #2196F3; color: white; border-radius: 6px; cursor: pointer; font-weight: 500;">
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
}
