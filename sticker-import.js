/**
 * sticker-import.js
 * 表情包批量导入模块 (支持 TXT, DOCX, ZIP)
 */

console.log("Sticker Import Module Loaded");

// 全局变量存储待导入的表情
let pendingImportStickers = [];
let currentImportContext = {
    type: "user", // "user", "char_exclusive", "char_common"
    chatId: null // 用于角色专属表情
};

/**
 * 初始化导入功能
 * 在 index.html 加载完成后调用
 */
function initStickerImport() {
    // 注入必要的 HTML 结构（文件输入框、模态框）
    const html = `
    <!-- 隐藏的文件输入框 -->
    <input type="file" id="sticker-import-doc-input" accept=".txt, .docx, .zip" multiple style="display: none;">
    
    <!-- 导入方式选择菜单 (简单的上下文菜单或模态框) -->
    <div id="sticker-import-menu" class="modal" style="z-index: 3000;">
        <div class="modal-content" style="max-width: 300px; text-align: center;">
            <div class="modal-header">
                <h3>选择导入方式</h3>
                <span class="close-modal" onclick="closeStickerImportMenu()">&times;</span>
            </div>
            <div class="modal-body" style="display: flex; flex-direction: column; gap: 15px;">
                <button class="menu-btn" onclick="triggerImageUpload()">
                    上传本地图片 (JPG/PNG/GIF)
                </button>
                <button class="menu-btn" onclick="triggerDocImport()">
                    导入文档包 (ZIP/TXT/DOCX)
                </button>
            </div>
        </div>
    </div>

    <!-- 预览与确认模态框 -->
    <div id="sticker-preview-modal" class="modal" style="z-index: 3100;">
        <div class="modal-content" style="max-width: 800px; height: 80vh; display: flex; flex-direction: column;">
            <div class="modal-header">
                <h3>确认导入表情</h3>
                <span class="close-modal" onclick="closeStickerPreviewModal()">&times;</span>
            </div>
            <div class="modal-body" style="flex: 1; overflow: hidden; display: flex; flex-direction: column;">
                <div style="padding: 10px; background: #f5f5f5; border-radius: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <span id="preview-count">已解析: 0</span>
                        <span style="color: #666; font-size: 12px; margin-left: 10px;">(请取消勾选不需要的表情)</span>
                    </div>
                    <div>
                         <button onclick="toggleSelectAllPreviews(true)" style="padding: 4px 8px; font-size: 12px;">全选</button>
                         <button onclick="toggleSelectAllPreviews(false)" style="padding: 4px 8px; font-size: 12px;">全不选</button>
                    </div>
                </div>
                
                <div id="sticker-preview-grid" style="flex: 1; overflow-y: auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px; padding: 10px; border: 1px solid #eee; border-radius: 4px;">
                    <!-- 预览项将在这里生成 -->
                </div>
            </div>
            <div class="modal-footer" style="padding-top: 15px; text-align: right; border-top: 1px solid #eee;">
                <button onclick="closeStickerPreviewModal()" style="padding: 8px 16px; margin-right: 10px; background: #f0f0f0; border: none; border-radius: 4px; cursor: pointer;">取消</button>
                <button onclick="confirmImportStickers()" style="padding: 8px 20px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer;">确认导入 (<span id="confirm-import-count">0</span>)</button>
            </div>
        </div>
    </div>
    
    <!-- 样式 -->
    <style>
        .menu-btn {
            padding: 12px;
            border: 1px solid #ddd;
            background: white;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
            font-size: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        .menu-btn:hover {
            background: #f5f5f5;
            border-color: #bbb;
        }
        .preview-item {
            /* ... */
            height: 120px; /* 固定高度，防止塌陷 */
            display: flex;
            flex-direction: column;
            background: #fff;
            box-shadow: 0 2px 5px rgba(0,0,0,0.05);
            /* 确保内容不会溢出 */
            overflow: hidden;
            position: relative;
        }
        .preview-item.selected {
            border-color: #2196F3;
            background: #e3f2fd;
        }
        .preview-item img {
            width: 100%;
            height: 80px !important; /* 强制高度 */
            min-height: 80px;
            object-fit: contain;
            background: #f9f9f9; /* 给个浅灰背景 */
            display: block;
            margin: 0;
            padding: 0;
        }
        .preview-item .name {
            font-size: 12px;
            text-align: center;
            padding: 4px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            line-height: 20px;
            height: 28px; /* 剩下的高度 */
            color: #333;
        }
        .preview-item .checkbox {
            position: absolute;
            top: 4px;
            right: 4px;
            width: 18px;
            height: 18px;
            background: rgba(255, 255, 255, 0.9);
            border: 1px solid #999;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            color: white;
            z-index: 2;
        }
        .preview-item.selected .checkbox {
            background: #2196F3;
            border-color: #2196F3;
            color: white;
        }
        .preview-item.selected .checkbox::after {
            content: '✓';
            font-weight: bold;
        }
    </style>
    `;
    
    document.body.insertAdjacentHTML('beforeend', html);
    
    // 绑定文件输入事件
    document.getElementById('sticker-import-doc-input').addEventListener('change', handleDocFileSelect);
}

// =====================
// UI 控制函数
// =====================

// 打开导入菜单
// context: { type: "user" | "char_exclusive" | "char_common", chatId: string }
function openStickerImportMenu(context) {
    if (context) {
        currentImportContext = context;
    } else {
        currentImportContext = { type: "user" }; // 默认
    }
    
    document.getElementById('sticker-import-menu').classList.add('visible');
}

function closeStickerImportMenu() {
    document.getElementById('sticker-import-menu').classList.remove('visible');
}

// 触发原有的图片上传
function triggerImageUpload() {
    closeStickerImportMenu();
    
    // 根据上下文分发到不同的上传input
    if (currentImportContext.type === "char_exclusive") {
        document.getElementById('upload-exclusive-sticker-btn').click(); // 这里点击原来的按钮会再次弹出菜单，形成死循环
        // 应该直接触发对应的input，但原代码可能没有把 input 暴露出来，或者逻辑封装在 click 里
        // 检查 index.html 发现 char-sticker-upload-input 是共用的，
        // 但需要设置上传类型。原来的逻辑是 uploadCharStickersLocal(type)
        
        // 我们改为直接调用原有的处理函数（如果暴露了），或者模拟点击
        // 更好的方式：既然我们要替换原来的上传逻辑，那原来的上传按钮已经被我们要添加的 onclick 覆盖了
        // 所以我们需要直接操作 input
        
        // 假设 index.html 里有一个 uploadCharStickersLocal(type) 函数，我们需要调用它
        // 但这是在 html 内部定义的函数，可能无法直接访问。
        
        // 实际上，最简单的办法是：只用这个模块处理文档导入。
        // 图片上传还是走原来的逻辑？
        // 不行，因为我们劫持了按钮点击。
        
        // 让我们看看 index.html 中原来的上传按钮做了什么
        // id="upload-exclusive-sticker-btn" -> uploadCharStickersLocal("exclusive")
        
        if (typeof window.uploadCharStickersLocal === 'function') {
             window.uploadCharStickersLocal("exclusive");
        } else {
            console.error("无法找到 uploadCharStickersLocal 函数");
            // 尝试直接点击 input (如果不依赖 type 参数设置状态)
            const input = document.getElementById("char-sticker-upload-input");
            if(input) input.click();
        }
        
    } else if (currentImportContext.type === "char_common") {
        if (typeof window.uploadCharStickersLocal === 'function') {
             window.uploadCharStickersLocal("common");
        } else {
             const input = document.getElementById("char-sticker-upload-input");
            if(input) input.click();
        }
        
    } else {
        // 默认用户表情包
        document.getElementById('sticker-upload-input').click();
    }
}

// 触发新的文档导入
function triggerDocImport() {
    closeStickerImportMenu();
    document.getElementById('sticker-import-doc-input').click();
}

function closeStickerPreviewModal() {
    document.getElementById('sticker-preview-modal').classList.remove('visible');
    pendingImportStickers = []; // 清理
}

// =====================
// 文件处理逻辑
// =====================

async function handleDocFileSelect(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    // 重置 input 以便再次选择同一文件
    // 注意：重置必须在处理完 files 引用之后，或者在事件处理函数最后
    // 但为了避免中途出错导致 input 没被重置，可以在最后重置
    
    // 显示加载中提示
    const btn = document.getElementById("upload-sticker-btn");
    const originalText = btn.innerText;
    btn.innerText = "解析中...";
    
    try {
        let allStickers = [];
        
        // 遍历所有选中的文件
        for (const file of files) {
            let stickers = [];
            try {
                if (file.name.endsWith('.zip')) {
                    stickers = await parseZipFile(file);
                } else if (file.name.endsWith('.docx')) {
                    stickers = await parseDocxFile(file);
                } else if (file.name.endsWith('.txt')) {
                    stickers = await parseTxtFile(file);
                } else {
                    console.warn(`跳过不支持的文件格式: ${file.name}`);
                    continue;
                }
                
                // 合并结果
                allStickers.push(...stickers);
            } catch (err) {
                console.error(`解析文件 ${file.name} 失败:`, err);
                // 可以选择报错，或者仅在控制台记录并继续处理其他文件
                // 这里选择继续处理其他文件
            }
        }
        
        if (allStickers.length === 0) {
            alert("未在选中的文件中找到有效的表情包数据。");
        } else {
            showPreviewModal(allStickers);
        }
        
    } catch (e) {
        console.error("导入过程发生错误:", e);
        alert("导入失败: " + e.message);
    } finally {
        btn.innerText = originalText;
        event.target.value = ''; // 最后重置 input
    }
}

// 解析 ZIP 文件
async function parseZipFile(file) {
    if (typeof JSZip === 'undefined') throw new Error("JSZip 库未加载");
    
    const zip = await JSZip.loadAsync(file);
    const stickers = [];
    const validExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'];
    
    // 遍历 ZIP 内容
    const promises = [];
    
    zip.forEach((relativePath, zipEntry) => {
        if (zipEntry.dir) return;
        
        const lowerName = zipEntry.name.toLowerCase();
        // 检查是否是图片
        if (validExtensions.some(ext => lowerName.endsWith(ext))) {
            const promise = zipEntry.async("base64").then(base64 => {
                // 获取文件名（不含扩展名和路径）作为表情名
                // 例如 "folder/smile.png" -> "smile"
                const fileName = zipEntry.name.split('/').pop();
                const name = fileName.replace(/\.[^/.]+$/, "");
                
                // 确定 MIME 类型
                let mime = "image/png";
                if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) mime = "image/jpeg";
                else if (lowerName.endsWith(".gif")) mime = "image/gif";
                else if (lowerName.endsWith(".webp")) mime = "image/webp";
                
                return {
                    name: name,
                    url: `data:${mime};base64,${base64}`,
                    selected: true,
                    id: "sticker_" + Date.now() + Math.random().toString(36).substr(2, 9)
                };
            });
            promises.push(promise);
        }
    });
    
    const results = await Promise.all(promises);
    return results;
}

// 解析 DOCX 文件
async function parseDocxFile(file) {
    if (typeof mammoth === 'undefined') throw new Error("Mammoth 库未加载");
    
    // 使用 mammoth 提取纯文本
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    const text = result.value;
    
    // 按行解析文本
    return parseTextContent(text);
}

// 解析 TXT 文件
async function parseTxtFile(file) {
    const text = await file.text();
    return parseTextContent(text);
}

// 通用文本解析逻辑 (名称 URL)
function parseTextContent(text) {
    const lines = text.split(/\r?\n/);
    const stickers = [];
    
    lines.forEach(line => {
        line = line.trim();
        if (!line) return;
        
        // 尝试分割名称和URL
        // 逻辑：查找 http 或 data:image 的位置
        let splitIndex = -1;
        const httpIndex = line.indexOf("http");
        const dataIndex = line.indexOf("data:image");
        
        if (httpIndex > -1) splitIndex = httpIndex;
        else if (dataIndex > -1) splitIndex = dataIndex;
        
        if (splitIndex > 0) {
            let name = line.substring(0, splitIndex).trim();
            const url = line.substring(splitIndex).trim();
            
            // 清理名称末尾的冒号
            if (name.endsWith(":") || name.endsWith("：")) {
                name = name.slice(0, -1).trim();
            }
            
            if (name && url) {
                stickers.push({
                    name: name,
                    url: url,
                    selected: true,
                    id: "sticker_" + Date.now() + Math.random().toString(36).substr(2, 9)
                });
            }
        }
    });
    
    return stickers;
}

// =====================
// 预览与确认逻辑
// =====================

function showPreviewModal(stickers) {
    pendingImportStickers = stickers;
    const modal = document.getElementById('sticker-preview-modal');
    const grid = document.getElementById('sticker-preview-grid');
    
    // 渲染网格
    renderPreviewGrid();
    
    // 更新计数
    updateSelectionCount();
    
    modal.classList.add('visible');
}

function renderPreviewGrid() {
    const grid = document.getElementById('sticker-preview-grid');
    grid.innerHTML = '';
    
    pendingImportStickers.forEach((sticker, index) => {
        const item = document.createElement('div');
        item.className = `preview-item ${sticker.selected ? 'selected' : ''}`;
        item.onclick = () => toggleStickerSelection(index);
        
        item.innerHTML = `
            <div class="checkbox"></div>
            <img src="${sticker.url}" alt="${sticker.name}">
            <div class="name" title="${sticker.name}">${sticker.name}</div>
        `;
        
        grid.appendChild(item);
    });
}

function toggleStickerSelection(index) {
    if (pendingImportStickers[index]) {
        pendingImportStickers[index].selected = !pendingImportStickers[index].selected;
        // 局部更新样式，比重绘整个 grid 更快
        const items = document.querySelectorAll('#sticker-preview-grid .preview-item');
        if (items[index]) {
            if (pendingImportStickers[index].selected) items[index].classList.add('selected');
            else items[index].classList.remove('selected');
        }
        updateSelectionCount();
    }
}

function toggleSelectAllPreviews(selectAll) {
    pendingImportStickers.forEach(s => s.selected = selectAll);
    
    // 更新所有 UI
    const items = document.querySelectorAll('#sticker-preview-grid .preview-item');
    items.forEach(item => {
        if (selectAll) item.classList.add('selected');
        else item.classList.remove('selected');
    });
    
    updateSelectionCount();
}

function updateSelectionCount() {
    const total = pendingImportStickers.length;
    const selected = pendingImportStickers.filter(s => s.selected).length;
    
    document.getElementById('preview-count').innerText = `解析: ${total} | 选中: ${selected}`;
    document.getElementById('confirm-import-count').innerText = selected;
}

// 确认导入
async function confirmImportStickers() {
    const selectedStickers = pendingImportStickers.filter(s => s.selected);
    
    if (selectedStickers.length === 0) {
        alert("请至少选择一个表情包！");
        return;
    }
    
    try {
        const stickersToSave = selectedStickers.map(s => ({
            id: s.id,
            name: s.name,
            url: s.url,
            categoryId: null // 默认未分类
        }));
        
        // 1. 用户表情包导入
        if (currentImportContext.type === "user") {
            if (window.db && window.db.userStickers) {
                await window.db.userStickers.bulkAdd(stickersToSave);
                
                if (window.state && window.state.userStickers) {
                    window.state.userStickers.push(...stickersToSave);
                }
                
                if (typeof window.renderStickerPanel === 'function') {
                    window.renderStickerPanel();
                }
                
                alert(`成功导入 ${stickersToSave.length} 个表情！`);
                closeStickerPreviewModal();
            } else {
                throw new Error("数据库连接未找到 (window.db.userStickers)");
            }
            
        // 2. 角色专属表情包导入
        } else if (currentImportContext.type === "char_exclusive") {
            const chatId = currentImportContext.chatId || window.state.activeChatId;
            const chat = window.state.chats[chatId];
            
            if (!chat) throw new Error("未找到当前聊天对象");
            
            if (!chat.settings.stickerLibrary) {
                chat.settings.stickerLibrary = [];
            }
            
            // 专属表情包不需要 categoryId
            const exclusiveStickers = stickersToSave.map(s => ({
                name: s.name,
                url: s.url
            }));
            
            chat.settings.stickerLibrary.push(...exclusiveStickers);
            await window.db.chats.put(chat);
            
            if (typeof window.renderCharStickers === 'function') {
                window.renderCharStickers("exclusive");
            }
            
            alert(`成功导入 ${exclusiveStickers.length} 个专属表情！`);
            closeStickerPreviewModal();
            
        // 3. 角色通用表情包导入
        } else if (currentImportContext.type === "char_common") {
            if (window.db && window.db.charStickers) {
                // 通用表情包也不需要 categoryId
                const commonStickers = stickersToSave.map(s => ({
                    id: s.id, // 这里需要 ID
                    name: s.name,
                    url: s.url
                }));
                
                await window.db.charStickers.bulkAdd(commonStickers);
                
                if (window.state && window.state.charStickers) {
                    // 如果 state.charStickers 存在，可能需要同步
                    // 但通常 renderCharStickers 会重新读取 db
                }
                
                if (typeof window.renderCharStickers === 'function') {
                    window.renderCharStickers("common");
                }
                
                alert(`成功导入 ${commonStickers.length} 个通用表情！`);
                closeStickerPreviewModal();
            } else {
                throw new Error("数据库连接未找到 (window.db.charStickers)");
            }
        }
        
    } catch (e) {
        console.error("保存表情包失败:", e);
        alert("保存失败: " + e.message);
    }
}

// 导出全局函数
window.initStickerImport = initStickerImport;
window.openStickerImportMenu = openStickerImportMenu;

// 自动初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStickerImport);
} else {
    initStickerImport();
}
