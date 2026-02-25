/**
 * 旁观群聊功能模块
 * Observer Group Chat Feature
 */

// 全局变量：标记当前是否正在创建旁观群聊
let isCreatingObserverGroup = false;

/**
 * 显示群聊类型选择弹窗
 */
function showGroupTypeSelectionModal() {
  const modal = document.getElementById("group-type-modal");
  if (modal) {
    modal.classList.add("visible");
  }
}

/**
 * 创建旁观群聊（核心函数）
 * @param {string} groupName - 群聊名称
 * @param {Set} contacts - 选中的联系人ID集合
 * @param {Object} settings - 旁观群聊设置
 */
async function createObserverGroup(groupName, contacts, settings) {
  const newChatId = "observer_group_" + Date.now();
  const members = [];

  // 处理成员列表（和普通群聊逻辑相同）
  for (const contactId of contacts) {
    const contactChat = state.chats[contactId];
    if (contactChat) {
      // 普通角色
      members.push({
        id: contactId,
        originalName: contactChat.name,
        groupNickname: contactChat.name,
        avatar: contactChat.settings.aiAvatar || defaultAvatar,
        persona: contactChat.settings.aiPersona,
        avatarFrame: contactChat.settings.aiAvatarFrame || "",
        isAdmin: false,
        isOwner: false,
        groupTitle: "",
      });
    } else {
      // NPC
      let foundNpc = null;
      for (const chat of Object.values(state.chats)) {
        if (chat.npcLibrary) {
          const npc = chat.npcLibrary.find((n) => n.id === contactId);
          if (npc) {
            foundNpc = npc;
            break;
          }
        }
      }
      if (foundNpc) {
        members.push({
          id: foundNpc.id,
          originalName: foundNpc.name,
          groupNickname: foundNpc.name,
          avatar: foundNpc.avatar || defaultGroupMemberAvatar,
          persona: foundNpc.persona,
          avatarFrame: "",
          isAdmin: false,
          isOwner: false,
          groupTitle: "",
        });
      }
    }
  }

  // 设置群主
  if (settings.ownerId) {
    const ownerMember = members.find((m) => m.id === settings.ownerId);
    if (ownerMember) {
      ownerMember.isOwner = true;
    }
  }

  // 设置管理员
  if (settings.adminIds && settings.adminIds.length > 0) {
    settings.adminIds.forEach((adminId) => {
      const adminMember = members.find((m) => m.id === adminId);
      if (adminMember) {
        adminMember.isAdmin = true;
      }
    });
  }

  // 创建旁观群聊对象
  const newGroupChat = {
    id: newChatId,
    name: groupName,
    isGroup: true,
    isObserverGroup: true, // 标识为旁观群聊
    userKnowsMembers: settings.userKnowsMembers || false, // "认识用户"开关
    initialScene: settings.initialScene || "", // 初始场景
    ownerId: settings.ownerId || null, // 群主ID
    members: members,
    settings: {
      maxMemory: 10,
      groupAvatar: defaultGroupAvatar,
      background: "",
      theme: "default",
      fontSize: 13,
      customCss: "",
      linkedWorldBookIds: [],
      stickerLibrary: [],
      linkedMemories: [],
      groupAnnouncement: "",
      backgroundActivity: {
        enabled: false,
        interval: 30,
      },
    },
    observerState: {
      isGenerating: false, // 是否正在生成对话
    },
    history: [],
    musicData: { totalTime: 0 },
  };

  // 保存到数据库
  state.chats[newChatId] = newGroupChat;
  await db.chats.put(newGroupChat);

  // 创建系统消息
  let systemMsg = `旁观群聊已创建，成员：${members.map((m) => `"${m.groupNickname}"`).join("、")}。`;
  if (settings.ownerId) {
    const owner = members.find((m) => m.id === settings.ownerId);
    if (owner) {
      systemMsg += `\n群主：${owner.groupNickname}`;
    }
  }
  if (settings.initialScene) {
    systemMsg += `\n场景：${settings.initialScene}`;
  }
  // 调用全局函数记录系统消息
  if (typeof logSystemMessage === 'function') {
    await logSystemMessage(newChatId, systemMsg);
  } else if (typeof window.logSystemMessage === 'function') {
    await window.logSystemMessage(newChatId, systemMsg);
  }

  // 刷新聊天列表
  if (typeof renderChatList === 'function') {
    await renderChatList();
  } else if (typeof window.renderChatList === 'function') {
    await window.renderChatList();
  }
  
  // 返回聊天列表屏幕
  if (typeof showScreen === 'function') {
    showScreen("chat-list-screen");
  } else if (typeof window.showScreen === 'function') {
    window.showScreen("chat-list-screen");
  }
  
  // 打开新创建的旁观群聊（这会自动设置 state.activeChatId 并显示聊天界面）
  if (typeof openChat === 'function') {
    openChat(newChatId);
  } else if (typeof window.openChat === 'function') {
    window.openChat(newChatId);
  }
  
  console.log("旁观群聊创建成功:", newGroupChat);
}

/**
 * 显示旁观群聊额外设置弹窗
 * @param {string} groupName - 群聊名称
 * @param {Set} contacts - 选中的联系人
 */
async function showObserverGroupSettingsModal(groupName, contacts) {
  return new Promise((resolve) => {
    const modal = document.getElementById("observer-group-settings-modal");
    if (!modal) {
      console.error("旁观群聊设置弹窗不存在");
      resolve(null);
      return;
    }

    // 构建成员列表（用于选择群主和管理员）
    const membersList = [];
    for (const contactId of contacts) {
      const contactChat = state.chats[contactId];
      if (contactChat) {
        membersList.push({
          id: contactId,
          name: contactChat.name,
          avatar: contactChat.settings.aiAvatar || defaultAvatar,
        });
      } else {
        // NPC
        let foundNpc = null;
        for (const chat of Object.values(state.chats)) {
          if (chat.npcLibrary) {
            const npc = chat.npcLibrary.find((n) => n.id === contactId);
            if (npc) {
              foundNpc = npc;
              break;
            }
          }
        }
        if (foundNpc) {
          membersList.push({
            id: foundNpc.id,
            name: foundNpc.name,
            avatar: foundNpc.avatar || defaultGroupMemberAvatar,
          });
        }
      }
    }

    // 填充群主下拉选择
    const ownerSelect = document.getElementById("observer-group-owner-select");
    ownerSelect.innerHTML = '<option value="">不指定</option>';
    membersList.forEach((member) => {
      const option = document.createElement("option");
      option.value = member.id;
      option.textContent = member.name;
      ownerSelect.appendChild(option);
    });

    // 填充管理员多选列表
    const adminCheckboxes = document.getElementById("observer-group-admin-list");
    adminCheckboxes.innerHTML = "";
    membersList.forEach((member) => {
      const label = document.createElement("label");
      label.style.display = "block";
      label.style.marginBottom = "8px";
      label.innerHTML = `
        <input type="checkbox" value="${member.id}" style="margin-right: 5px;">
        ${member.name}
      `;
      adminCheckboxes.appendChild(label);
    });

    // 重置其他字段
    document.getElementById("observer-initial-scene").value = "";
    document.getElementById("observer-user-knows-switch").checked = false;

    // 显示弹窗
    modal.classList.add("visible");

    // 确认按钮事件
    const confirmBtn = document.getElementById("confirm-observer-settings-btn");
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    newConfirmBtn.addEventListener("click", async () => {
      const settings = {
        ownerId: ownerSelect.value || null,
        adminIds: Array.from(
          adminCheckboxes.querySelectorAll('input[type="checkbox"]:checked')
        ).map((cb) => cb.value),
        initialScene: document.getElementById("observer-initial-scene").value.trim(),
        userKnowsMembers: document.getElementById("observer-user-knows-switch").checked,
      };

      modal.classList.remove("visible");
      await createObserverGroup(groupName, contacts, settings);
      resolve(settings);
    });

    // 取消按钮事件
    const cancelBtn = document.getElementById("cancel-observer-settings-btn");
    const newCancelBtn = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

    newCancelBtn.addEventListener("click", () => {
      modal.classList.remove("visible");
      resolve(null);
    });
  });
}

/**
 * 更新旁观控制按钮的状态
 * @param {Object} chat - 聊天对象
 */
function updateObserverButtons(chat) {
  const startBtn = document.getElementById("observer-start-btn");
  const pauseBtn = document.getElementById("observer-pause-btn");
  const continueBtn = document.getElementById("observer-continue-btn");
  const resayBtn = document.getElementById("observer-resay-btn");

  if (!startBtn || !pauseBtn || !continueBtn || !resayBtn) return;

  // 检查是否有AI消息可以重说
  const hasAiMessages = chat.history.some(msg => msg.isAi);

  if (chat.observerState.isGenerating) {
    // 正在生成：禁用开始、继续和重说，启用暂停
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    continueBtn.disabled = true;
    resayBtn.disabled = true;
  } else {
    // 未生成/已暂停：启用开始、继续和重说（如果有AI消息），禁用暂停
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    continueBtn.disabled = false;
    resayBtn.disabled = !hasAiMessages;
  }
}

/**
 * 开始旁观对话
 */
async function startObserverConversation() {
  console.log("=== 开始旁观对话 ===");
  const chatId = state.activeChatId;
  const chat = state.chats[chatId];

  console.log("当前聊天ID:", chatId);
  console.log("当前聊天对象:", chat);

  if (!chat || !chat.isObserverGroup) {
    console.error("无效的旁观群聊:", chat);
    return;
  }

  // 设置为生成中
  chat.observerState.isGenerating = true;
  await db.chats.put(chat);
  updateObserverButtons(chat);

  try {
    // 调用AI生成一轮对话
    console.log("调用 triggerObserverAiResponse...");
    await triggerObserverAiResponse(chatId);
    console.log("AI生成完成");
  } catch (error) {
    console.error("旁观群聊AI生成失败:", error);
    alert("生成失败: " + error.message);
    if (typeof showCustomAlert === 'function') {
      await showCustomAlert("生成失败", `AI对话生成失败：${error.message}`);
    } else if (typeof window.showCustomAlert === 'function') {
      await window.showCustomAlert("生成失败", `AI对话生成失败：${error.message}`);
    }
  } finally {
    // 生成完毕，恢复状态
    chat.observerState.isGenerating = false;
    await db.chats.put(chat);
    updateObserverButtons(chat);
    console.log("=== 旁观对话结束 ===");
  }
}

/**
 * 继续旁观对话
 */
async function continueObserverConversation() {
  await startObserverConversation();
}

/**
 * 暂停旁观对话
 */
async function pauseObserverConversation() {
  const chatId = state.activeChatId;
  const chat = state.chats[chatId];

  if (!chat || !chat.isObserverGroup) return;

  // 设置为非生成中（等当前轮次完成后停止）
  chat.observerState.isGenerating = false;
  await db.chats.put(chat);
  updateObserverButtons(chat);
}

/**
 * 重说最新一轮对话
 */
async function resayObserverConversation() {
  console.log("=== 重说最新一轮对话 ===");
  const chatId = state.activeChatId;
  const chat = state.chats[chatId];

  if (!chat || !chat.isObserverGroup) return;

  // 找到最新一轮的AI消息（从最后往前找连续的AI消息）
  const aiMessagesToRemove = [];
  for (let i = chat.history.length - 1; i >= 0; i--) {
    const msg = chat.history[i];
    // 如果是AI消息，加入删除列表
    if (msg.isAi) {
      aiMessagesToRemove.unshift(msg);
    } else {
      // 遇到非AI消息（系统消息或用户消息），停止
      break;
    }
  }

  if (aiMessagesToRemove.length === 0) {
    console.log("没有AI消息可以重说");
    return;
  }

  console.log(`找到 ${aiMessagesToRemove.length} 条AI消息需要删除`);

  // 删除这些消息
  chat.history = chat.history.filter(msg => !aiMessagesToRemove.includes(msg));
  await db.chats.put(chat);

  // 重新渲染聊天界面
  if (typeof renderChatInterface === 'function') {
    renderChatInterface(chatId);
  } else if (typeof window.renderChatInterface === 'function') {
    window.renderChatInterface(chatId);
  }

  console.log("已删除最新一轮AI消息，准备重新生成");

  // 自动触发重新生成
  await startObserverConversation();
}

/**
 * 触发旁观群聊的AI响应
 * @param {string} chatId - 聊天ID
 */
async function triggerObserverAiResponse(chatId) {
  console.log("--- triggerObserverAiResponse 开始 ---");
  const chat = state.chats[chatId];
  if (!chat || !chat.isObserverGroup) {
    console.error("无效的聊天对象");
    return;
  }

  // 检查是否应该停止生成（用户点了暂停）
  if (!chat.observerState.isGenerating) {
    console.log("旁观对话已被暂停");
    return;
  }

  // 显示"正在输入"提示
  const typingIndicator = document.getElementById("typing-indicator");
  console.log("typing-indicator 元素:", typingIndicator);
  if (typingIndicator) {
    typingIndicator.textContent = "成员们正在输入...";
    typingIndicator.style.display = "block";
    console.log("已显示正在输入提示");
  } else {
    console.warn("找不到 typing-indicator 元素");
  }

  try {
    console.log("开始构建提示词...");
    // 构建提示词和消息历史（参考普通群聊逻辑）
    const { systemPrompt, messagesPayload } = await buildObserverGroupPrompt(chat);
    console.log("提示词构建完成");
    
    // 使用正确的API配置（和普通群聊一样）
    const { proxyUrl, apiKey, model } = state.apiConfig;
    const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";
    
    // 检查API配置
    if (!proxyUrl || !apiKey || !model) {
      throw new Error("API配置未设置，请先在设置中配置API信息");
    }
    
    console.log("API端点:", proxyUrl);
    console.log("API模型:", model);
    console.log("消息数量:", messagesPayload.length);

    // 判断是否是 Gemini API
    const isGemini = proxyUrl === GEMINI_API_URL;
    
    // 根据API类型构建请求
    let requestUrl, requestHeaders, requestBody;
    
    if (isGemini) {
      // Gemini API格式
      requestUrl = `${GEMINI_API_URL}/${model}:generateContent?key=${apiKey}`;
      requestHeaders = { "Content-Type": "application/json" };
      requestBody = {
        contents: messagesPayload.map((item) => ({
          role: item.role === "assistant" ? "model" : "user",
          parts: [{ text: item.content }],
        })),
        generationConfig: {
          temperature: parseFloat(state.apiConfig.temperature) || 0.8,
        },
        systemInstruction: { parts: [{ text: systemPrompt }] },
      };
    } else {
      // OpenAI兼容格式
      requestUrl = `${proxyUrl}/v1/chat/completions`;
      requestHeaders = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      };
      requestBody = {
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          ...messagesPayload,
        ],
        temperature: parseFloat(state.apiConfig.temperature) || 0.8,
        stream: false,
      };
    }

    // 调用AI API
    console.log("发送API请求...", isGemini ? "Gemini格式" : "OpenAI格式");
    const response = await fetch(requestUrl, {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify(requestBody),
    });

    console.log("API响应状态:", response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error("API错误响应:", errorText);
      throw new Error(`API请求失败: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("API返回数据:", data);
    
    // 根据API类型解析返回内容
    const assistantReply = isGemini
      ? data?.candidates?.[0]?.content?.parts?.[0]?.text
      : data?.choices?.[0]?.message?.content;
    
    if (!assistantReply) {
      throw new Error("API返回内容为空");
    }
    
    console.log("AI回复内容:", assistantReply);

    // 解析AI返回的JSON（去除可能的markdown代码块标记）
    let parsedMessages;
    try {
      let sanitizedContent = assistantReply
        .replace(/^```json\s*/, "")
        .replace(/```$/, "")
        .trim();
      
      // 尝试提取第一个JSON数组
      const firstBracket = sanitizedContent.indexOf("[");
      const lastBracket = sanitizedContent.lastIndexOf("]");
      if (firstBracket !== -1 && lastBracket > firstBracket) {
        sanitizedContent = sanitizedContent.substring(firstBracket, lastBracket + 1);
      }
      
      parsedMessages = JSON.parse(sanitizedContent);
      console.log("解析后的消息数组:", parsedMessages);
      
      if (!Array.isArray(parsedMessages)) {
        throw new Error("解析结果不是数组");
      }
    } catch (e) {
      console.error("AI返回的内容不是有效的JSON:", assistantReply);
      console.error("JSON解析错误:", e);
      throw new Error("AI返回格式错误: " + e.message);
    }

    // 处理AI返回的消息（参考普通群聊逻辑）
    console.log("开始处理消息...");
    await processObserverGroupMessages(chat, parsedMessages);
    console.log("消息处理完成");

  } catch (error) {
    console.error("旁观群聊AI调用失败:", error);
    throw error;
  } finally {
    // 隐藏"正在输入"提示
    if (typingIndicator) {
      typingIndicator.style.display = "none";
      console.log("已隐藏正在输入提示");
    }
    console.log("--- triggerObserverAiResponse 结束 ---");
  }
}

/**
 * 构建旁观群聊的AI提示词
 * @param {Object} chat - 聊天对象
 * @returns {Object} { systemPrompt, messagesPayload }
 */
async function buildObserverGroupPrompt(chat) {
  // 获取世界书上下文
  let wbFront = "";
  let wbMiddle = "";
  let wbBack = "";
  
  if (chat.settings.linkedWorldBookIds && chat.settings.linkedWorldBookIds.length > 0) {
    const worldBooks = await db.worldBooks.bulkGet(chat.settings.linkedWorldBookIds);
    const allEntries = worldBooks.flatMap(wb => wb ? wb.entries : []);
    
    if (allEntries.length > 0) {
      wbFront = "# 世界观设定 (置顶部分)\n" + 
        allEntries.filter(e => e.position === "top").map(e => e.content).join("\n\n");
      wbMiddle = "# 世界观设定 (中部)\n" + 
        allEntries.filter(e => e.position === "middle").map(e => e.content).join("\n\n");
      wbBack = "\n# 世界观设定 (底部)\n" + 
        allEntries.filter(e => e.position === "bottom").map(e => e.content).join("\n\n");
    }
  }

  // 获取回复条数设置
  const replyCount = parseInt(localStorage.getItem("reply-count")) || 3;
  const replyCountInstruction = `${replyCount}`;

  // 获取当前时间
  const currentTime = new Date().toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "long",
  });

  // 构建群公告上下文
  let announcementContext = "";
  if (chat.settings.groupAnnouncement) {
    announcementContext = `\n# 群公告\n${chat.settings.groupAnnouncement}\n`;
  }

  // 构建表情包上下文
  let stickerContext = "";
  if (chat.settings.stickerLibrary && chat.settings.stickerLibrary.length > 0) {
    stickerContext = `\n# 专属表情包列表\n可用的表情名称：${chat.settings.stickerLibrary.map(s => `"${s.name}"`).join("、")}\n`;
  }

  // 构建关联记忆上下文
  let linkedMemoryContext = "";
  if (chat.userKnowsMembers && chat.settings.linkedMemories && chat.settings.linkedMemories.length > 0) {
    const memories = [];
    for (const memId of chat.settings.linkedMemories) {
      const mem = await db.memories.get(memId);
      if (mem) {
        memories.push(`- ${mem.content}`);
      }
    }
    if (memories.length > 0) {
      linkedMemoryContext = `\n# 关联记忆\n${memories.join("\n")}\n`;
    }
  }

  // 构建系统提示词
  const systemPrompt = `${wbFront}
# 角色
你是一个旁观群聊AI，负责扮演群里的所有角色，让他们自然互动。

# 【对话节奏铁律 (至关重要！)】
你的回复【必须】模拟真人的打字和思考习惯。不要一次性发送一大段文字，你应该将你想说的话，拆分成${replyCountInstruction}条消息气泡来发送，每条消息最好不要超过30个字。这会让对话看起来更自然、更真实。
**角色回复顺序不固定，可以交叉回复，例如角色A、角色B、角色B、角色A、角色C这样的交叉顺序。不一定要一个人全部说完了才轮到下一个人。角色之间【必须】有互动对话。**

# 【【【身份铁律：这是最高指令，必须严格遵守】】】
1.  **核心任务**: 你的唯一任务是扮演且仅能扮演下方"群成员列表"中明确列出的角色。
2.  **【旁观模式】**: 这是一个旁观群聊，用户不在群里，只是在观看。你【绝对、永远、在任何情况下都不能】生成用户的消息。
3.  **禁止杜撰**: 【绝对禁止】扮演任何未在"群成员列表"中出现的角色。
4.  **【【【格式铁律：这是你的生命线，违者生成失败】】】**:
    -   你的回复【必须且只能】是一个严格的JSON数组格式的字符串。
    -   数组中的【每一个元素都必须是一个JSON对象】。
    -   每一个JSON对象都【必须包含一个 "name" 字段】，其值【必须是】下方列表中角色的【【本名】】(originalName)。
    -   缺少 "name" 字段的回复是无效的，会被系统拒绝。
5.  **角色扮演**: 严格遵守下方"群成员列表及人设"中的每一个角色的设定。

# 群成员列表及人设 (name字段是你要使用的【本名】)
${chat.members.map((m) => `- **${m.originalName}**: (群昵称为: ${m.groupNickname}) 人设: ${m.persona}`).join("\n")}

${wbMiddle}

# 群主与管理员
${chat.ownerId ? `- 群主: ${chat.members.find(m => m.id === chat.ownerId)?.originalName || "无"}` : "- 本群无群主"}
${chat.members.filter(m => m.isAdmin).length > 0 ? `- 管理员: ${chat.members.filter(m => m.isAdmin).map(m => m.originalName).join("、")}` : ""}

# 初始场景
${chat.initialScene ? `当前场景: ${chat.initialScene}` : "场景自由发挥，你们可以聊任何感兴趣的话题。"}

${chat.userKnowsMembers ? `
# 关于用户
群里的角色们认识用户。用户虽然不在场，但你们可以谈论Ta。
${linkedMemoryContext}
` : `
# 重要提示
群里的角色们【完全不认识】用户，也【不知道】用户的存在。请不要在对话中提及用户。
`}

6.  **禁止出戏**: 绝不能透露你是AI、模型，或提及"扮演"、"生成"等词语。并且不能一直要求见面，这是线上聊天，决不允许出现或者发展线下剧情！！
7.  **情景感知**: 注意当前时间是 ${currentTime}。

**8. 标准输出格式示例:**
[
    {
      "type": "text",
      "name": "角色名",
      "message": "文本内容"
    },
    {
      "type": "sticker",
      "name": "角色名",
      "sticker_name": "表情名"
    }
]

## 你可以使用的操作指令 (JSON数组中的元素):
-   **发送文本**: \`{"type": "text", "name": "角色名", "message": "文本内容"}\`
-   **发送后立刻撤回**: \`{"type": "send_and_recall", "name": "角色名", "content": "你想让角色说出后立刻消失的话"}\`
-   **发送表情**: \`{"type": "sticker", "name": "角色名", "sticker_name": "表情的名字"}\`
-   **发送图片**: \`{"type": "ai_image", "name": "角色名", "description": "图片的详细文字描述"}\`
-   **发送语音**: \`{"type": "voice_message", "name": "角色名", "content": "语音的文字内容"}\`
-   **引用回复**: \`{"type": "quote_reply", "name": "角色名", "target_timestamp": 时间戳, "reply_content": "回复内容"}\`
-   **拍一拍**: \`{"type": "pat_member", "name": "你的角色名", "targetName": "被拍的角色名", "suffix": "(可选)后缀"}\`
-   **设置群头衔**: \`{"type": "set_group_title", "name": "你的角色名", "targetName": "目标角色名", "title": "新头衔"}\` (仅群主或管理员可用)
-   **修改群公告**: \`{"type": "set_group_announcement", "name": "你的角色名", "content": "新的公告内容..."}\` (仅群主或管理员可用)

${announcementContext}
${stickerContext}
${wbBack}

现在，请让群里的角色们自然互动，开始这场对话。`;

  // 构建消息历史
  const historySlice = chat.history.slice(-chat.settings.maxMemory);
  const messagesPayload = historySlice
    .filter((msg) => !msg.isHidden && msg.type !== "share_card")
    .map((msg) => {
      let content = "";
      if (msg.type === "system") {
        content = `[系统消息: ${msg.content}]`;
      } else if (msg.type === "narrative") {
        content = `(Timestamp: ${msg.timestamp}) [剧情/环境旁白: ${msg.content}]`;
      } else {
        content = `(Timestamp: ${msg.timestamp}) ${msg.senderName || "未知"}: ${msg.content || msg.description || "[消息]"}`;
      }
      return { role: "user", content };
    });

  return { systemPrompt, messagesPayload };
}

/**
 * 处理旁观群聊AI返回的消息
 * @param {Object} chat - 聊天对象
 * @param {Array} parsedMessages - AI返回的消息数组
 */
async function processObserverGroupMessages(chat, parsedMessages) {
  console.log("=== 处理旁观群聊消息 ===");
  console.log("收到的消息数组:", parsedMessages);
  
  if (!Array.isArray(parsedMessages)) {
    console.error("AI返回的不是数组:", parsedMessages);
    return;
  }

  console.log(`共有 ${parsedMessages.length} 条消息要处理`);

  for (let i = 0; i < parsedMessages.length; i++) {
    const msgData = parsedMessages[i];
    console.log(`处理第 ${i + 1} 条消息:`, msgData);
    
    // 检查是否应该停止（用户点了暂停）
    if (!chat.observerState.isGenerating) {
      console.log("旁观对话在处理消息时被暂停");
      break;
    }

    // 验证消息必须有name字段
    if (!msgData.name) {
      console.error("AI返回的消息缺少name字段，已拦截:", msgData);
      continue;
    }

    // 查找对应的成员
    const member = chat.members.find((m) => m.originalName === msgData.name);
    if (!member) {
      console.error(`AI试图扮演不存在的角色: ${msgData.name}，已拦截`);
      console.log("群成员列表:", chat.members.map(m => m.originalName));
      continue;
    }
    
    console.log(`找到成员: ${member.originalName}, 消息类型: ${msgData.type}`);

    // 根据消息类型处理
    switch (msgData.type) {
      case "text":
        await sendObserverTextMessage(chat, member, msgData.message || msgData.content);
        break;

      case "sticker":
        await sendObserverStickerMessage(chat, member, msgData.sticker_name);
        break;

      case "ai_image":
        await sendObserverImageMessage(chat, member, msgData.description);
        break;

      case "voice_message":
        await sendObserverVoiceMessage(chat, member, msgData.content);
        break;

      case "send_and_recall":
        await sendObserverRecallMessage(chat, member, msgData.content);
        break;

      case "quote_reply":
        await sendObserverQuoteReply(chat, member, msgData.target_timestamp, msgData.reply_content);
        break;

      case "pat_member":
        await sendObserverPatMessage(chat, member, msgData.targetName, msgData.suffix);
        break;

      case "set_group_title":
        await handleObserverSetGroupTitle(chat, member, msgData.targetName, msgData.title);
        break;

      case "set_group_announcement":
        await handleObserverSetAnnouncement(chat, member, msgData.content);
        break;

      default:
        console.warn("未知的消息类型:", msgData.type);
    }

    // 每条消息之间添加短暂延迟，模拟真实打字
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

/**
 * 发送旁观群聊的文本消息
 */
async function sendObserverTextMessage(chat, member, content) {
  const message = {
    id: "msg_" + Date.now() + "_" + Math.random(),
    type: "text",
    role: "assistant",
    content: content,
    senderName: member.originalName,
    senderId: member.id,
    timestamp: Date.now(),
    isAi: true,
  };

  chat.history.push(message);
  await db.chats.put(chat);
  
  // 如果当前正在查看这个聊天，更新界面
  if (state.activeChatId === chat.id && typeof appendMessage === 'function') {
    appendMessage(message, chat);
  } else if (state.activeChatId === chat.id && typeof window.appendMessage === 'function') {
    window.appendMessage(message, chat);
  }
}

/**
 * 发送旁观群聊的表情消息
 */
async function sendObserverStickerMessage(chat, member, stickerName) {
  // 验证表情是否存在
  const sticker = chat.settings.stickerLibrary?.find((s) => s.name === stickerName);
  if (!sticker) {
    console.warn(`AI试图发送不存在的表情: "${stickerName}"，已拦截`);
    return;
  }

  const message = {
    id: "msg_" + Date.now() + "_" + Math.random(),
    type: "sticker",
    role: "assistant",
    stickerUrl: sticker.url,
    stickerName: sticker.name,
    senderName: member.originalName,
    senderId: member.id,
    timestamp: Date.now(),
    isAi: true,
  };

  chat.history.push(message);
  await db.chats.put(chat);
  
  if (state.activeChatId === chat.id && typeof appendMessage === 'function') {
    appendMessage(message, chat);
  } else if (state.activeChatId === chat.id && typeof window.appendMessage === 'function') {
    window.appendMessage(message, chat);
  }
}

/**
 * 发送旁观群聊的图片消息
 */
async function sendObserverImageMessage(chat, member, description) {
  // 这里需要调用图片生成API，参考原有的 ai_image 逻辑
  // 为了简化，先显示占位符
  const message = {
    id: "msg_" + Date.now() + "_" + Math.random(),
    type: "ai_image",
    role: "assistant",
    description: description,
    imageUrl: "", // 需要异步生成
    senderName: member.originalName,
    senderId: member.id,
    timestamp: Date.now(),
    isAi: true,
  };

  chat.history.push(message);
  await db.chats.put(chat);
  
  if (state.activeChatId === chat.id && typeof appendMessage === 'function') {
    appendMessage(message, chat);
  } else if (state.activeChatId === chat.id && typeof window.appendMessage === 'function') {
    window.appendMessage(message, chat);
  }

  // TODO: 异步调用图片生成API并更新消息
}

/**
 * 发送旁观群聊的语音消息
 */
async function sendObserverVoiceMessage(chat, member, content) {
  const message = {
    id: "msg_" + Date.now() + "_" + Math.random(),
    type: "voice_message",
    role: "assistant",
    content: content,
    senderName: member.originalName,
    senderId: member.id,
    timestamp: Date.now(),
    isAi: true,
  };

  chat.history.push(message);
  await db.chats.put(chat);
  
  if (state.activeChatId === chat.id && typeof appendMessage === 'function') {
    appendMessage(message, chat);
  } else if (state.activeChatId === chat.id && typeof window.appendMessage === 'function') {
    window.appendMessage(message, chat);
  }
}

/**
 * 发送旁观群聊的撤回消息
 */
async function sendObserverRecallMessage(chat, member, content) {
  // 先发送消息
  const message = {
    id: "msg_" + Date.now() + "_" + Math.random(),
    type: "text",
    role: "assistant",
    content: content,
    senderName: member.originalName,
    senderId: member.id,
    timestamp: Date.now(),
    isAi: true,
  };

  chat.history.push(message);
  await db.chats.put(chat);
  
  if (state.activeChatId === chat.id && typeof appendMessage === 'function') {
    appendMessage(message, chat);
  } else if (state.activeChatId === chat.id && typeof window.appendMessage === 'function') {
    window.appendMessage(message, chat);
  }

  // 短暂延迟后撤回
  await new Promise((resolve) => setTimeout(resolve, 1000));
  
  const recallMsg = {
    id: "msg_" + Date.now() + "_" + Math.random(),
    type: "system",
    role: "system",
    content: `${member.groupNickname} 撤回了一条消息`,
    timestamp: Date.now(),
  };

  chat.history.push(recallMsg);
  await db.chats.put(chat);
  
  if (state.currentChatId === chat.id && typeof appendMessage === 'function') {
    appendMessage(recallMsg, chat);
  }
}

/**
 * 发送旁观群聊的引用回复
 */
async function sendObserverQuoteReply(chat, member, targetTimestamp, replyContent) {
  const message = {
    id: "msg_" + Date.now() + "_" + Math.random(),
    type: "quote_reply",
    role: "assistant",
    content: replyContent,
    quotedTimestamp: targetTimestamp,
    senderName: member.originalName,
    senderId: member.id,
    timestamp: Date.now(),
    isAi: true,
  };

  chat.history.push(message);
  await db.chats.put(chat);
  
  if (state.activeChatId === chat.id && typeof appendMessage === 'function') {
    appendMessage(message, chat);
  } else if (state.activeChatId === chat.id && typeof window.appendMessage === 'function') {
    window.appendMessage(message, chat);
  }
}

/**
 * 发送旁观群聊的拍一拍消息
 */
async function sendObserverPatMessage(chat, member, targetName, suffix) {
  const targetMember = chat.members.find((m) => m.originalName === targetName);
  if (!targetMember) {
    console.warn(`拍一拍目标角色不存在: ${targetName}`);
    return;
  }

  const message = {
    id: "msg_" + Date.now() + "_" + Math.random(),
    type: "system",
    role: "system",
    content: `${member.groupNickname} 拍了拍 ${targetMember.groupNickname}${suffix ? " " + suffix : ""}`,
    timestamp: Date.now(),
  };

  chat.history.push(message);
  await db.chats.put(chat);
  
  if (state.activeChatId === chat.id && typeof appendMessage === 'function') {
    appendMessage(message, chat);
  } else if (state.activeChatId === chat.id && typeof window.appendMessage === 'function') {
    window.appendMessage(message, chat);
  }
}

/**
 * 处理旁观群聊的设置群头衔
 */
async function handleObserverSetGroupTitle(chat, member, targetName, title) {
  // 验证权限
  if (!member.isOwner && !member.isAdmin) {
    console.warn(`${member.originalName} 无权设置群头衔`);
    return;
  }

  const targetMember = chat.members.find((m) => m.originalName === targetName);
  if (!targetMember) {
    console.warn(`设置头衔的目标角色不存在: ${targetName}`);
    return;
  }

  targetMember.groupTitle = title;
  await db.chats.put(chat);

  const message = {
    id: "msg_" + Date.now() + "_" + Math.random(),
    type: "system",
    role: "system",
    content: `${member.groupNickname} 将 ${targetMember.groupNickname} 的头衔设置为 "${title}"`,
    timestamp: Date.now(),
  };

  chat.history.push(message);
  await db.chats.put(chat);
  
  if (state.activeChatId === chat.id && typeof appendMessage === 'function') {
    appendMessage(message, chat);
  } else if (state.activeChatId === chat.id && typeof window.appendMessage === 'function') {
    window.appendMessage(message, chat);
  }
}

/**
 * 处理旁观群聊的修改群公告
 */
async function handleObserverSetAnnouncement(chat, member, content) {
  // 验证权限
  if (!member.isOwner && !member.isAdmin) {
    console.warn(`${member.originalName} 无权修改群公告`);
    return;
  }

  chat.settings.groupAnnouncement = content;
  await db.chats.put(chat);

  const message = {
    id: "msg_" + Date.now() + "_" + Math.random(),
    type: "system",
    role: "system",
    content: `${member.groupNickname} 修改了群公告`,
    timestamp: Date.now(),
  };

  chat.history.push(message);
  await db.chats.put(chat);
  
  if (state.activeChatId === chat.id && typeof appendMessage === 'function') {
    appendMessage(message, chat);
  } else if (state.activeChatId === chat.id && typeof window.appendMessage === 'function') {
    window.appendMessage(message, chat);
  }
}

// 初始化事件监听（在页面加载完成后调用）
function initObserverGroupEvents() {
  // 群聊类型选择弹窗的事件
  const cancelTypeBtn = document.getElementById("cancel-group-type-btn");
  if (cancelTypeBtn) {
    cancelTypeBtn.addEventListener("click", () => {
      document.getElementById("group-type-modal")?.classList.remove("visible");
    });
  }

  const normalGroupBtn = document.getElementById("create-normal-group-btn");
  if (normalGroupBtn) {
    normalGroupBtn.addEventListener("click", () => {
      isCreatingObserverGroup = false;
      document.getElementById("group-type-modal")?.classList.remove("visible");
      // 调用全局函数
      if (typeof window.openContactPickerForGroupCreate === 'function') {
        window.openContactPickerForGroupCreate();
      } else {
        console.error("openContactPickerForGroupCreate 函数未定义");
      }
    });
  }

  const observerGroupBtn = document.getElementById("create-observer-group-btn");
  if (observerGroupBtn) {
    observerGroupBtn.addEventListener("click", () => {
      isCreatingObserverGroup = true;
      document.getElementById("group-type-modal")?.classList.remove("visible");
      // 调用全局函数
      if (typeof window.openContactPickerForGroupCreate === 'function') {
        window.openContactPickerForGroupCreate();
      } else {
        console.error("openContactPickerForGroupCreate 函数未定义");
      }
    });
  }

  // 旁观控制按钮的事件
  const startBtn = document.getElementById("observer-start-btn");
  if (startBtn) {
    startBtn.addEventListener("click", startObserverConversation);
  }

  const pauseBtn = document.getElementById("observer-pause-btn");
  if (pauseBtn) {
    pauseBtn.addEventListener("click", pauseObserverConversation);
  }

  const continueBtn = document.getElementById("observer-continue-btn");
  if (continueBtn) {
    continueBtn.addEventListener("click", continueObserverConversation);
  }

  const resayBtn = document.getElementById("observer-resay-btn");
  if (resayBtn) {
    resayBtn.addEventListener("click", resayObserverConversation);
  }

  console.log("旁观群聊模块已初始化");
}

// 在页面加载完成后初始化
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initObserverGroupEvents);
} else {
  initObserverGroupEvents();
}
