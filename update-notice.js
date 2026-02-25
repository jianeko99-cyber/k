// 更新通知弹窗
(function() {
  const UPDATE_VERSION = '2.17';
  const STORAGE_KEY = 'update_notice_dismissed_version';

  // 检查是否已经关闭过这个版本的通知
  function shouldShowNotice() {
    const dismissedVersion = localStorage.getItem(STORAGE_KEY);
    return dismissedVersion !== UPDATE_VERSION;
  }

  // 创建弹窗HTML
  function createNoticeModal() {
    const modal = document.createElement('div');
    modal.id = 'update-notice-modal';
    modal.innerHTML = `
      <div class="update-notice-overlay"></div>
      <div class="update-notice-content">
        <div class="update-notice-header">
          <img src="https://i.postimg.cc/hPb8mKFN/2F288DC274565F2D6BF6E235E9692B96.png" alt="更新图标" class="update-header-image">
          <h3>2.17 更新内容</h3>
          <p class="update-subtitle">兔K改版 已获得授权</p>
        </div>
        <div class="update-notice-body">
          <div class="update-item">
            <span class="update-number">1</span>
            <p>新增DOCX、TXT导入，新增角色卡批量导入</p>
          </div>
          <div class="update-item">
            <span class="update-number">2</span>
            <p>新增世界书条目开关，新增全局开关，新增注入位置，新增导入DOCX、TXT和ZIP的世界书，可以批量</p>
          </div>
          <div class="update-item">
            <span class="update-number">3</span>
            <p>新增关闭心声、关闭角色自主发微博、动态开关（默认关闭，需要的记得先去打开）</p>
          </div>
          <div class="update-item">
            <span class="update-number">4</span>
            <p>情侣空间新增改名和换头像</p>
          </div>
          <div class="update-item">
            <span class="update-number">5</span>
            <p>新增支持表情包导入文档格式，新增角色识别表情包</p>
          </div>
          <div class="update-item">
            <span class="update-number">6</span>
            <p>游戏大厅新增你画我猜</p>
          </div>
          <div class="update-item">
            <span class="update-number">7</span>
            <p>新增角色查你手机</p>
          </div>
          <div class="update-item">
            <span class="update-number">8</span>
            <p>新增月经APP，这次做的应该比较细致了</p>
          </div>
          <div class="update-item">
            <span class="update-number">9</span>
            <p>新增旁白按钮，可以直接添加灰色系统消息作为上下文</p>
          </div>
          <div class="update-item">
            <span class="update-number">10</span>
            <p>新增旁观者群聊</p>
          </div>
          <div class="update-item">
            <span class="update-number">11</span>
            <p>新增一个表情包输入匹配，几百个表情包翻起来太烦人了</p>
          </div>
          <p class="update-footer-text">还有些别的调整，很细微的就不写了。基本上就是个人风格的自用改版，已获得两位老师的授权。</p>
        </div>
        <div class="update-notice-buttons">
          <button id="update-close-btn" class="update-btn update-btn-close" disabled>
            关闭 (<span id="countdown">5</span>)
          </button>
          <button id="update-dismiss-btn" class="update-btn update-btn-dismiss">
            下次不再弹出
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    return modal;
  }

  // 显示弹窗
  function showNotice() {
    const modal = createNoticeModal();
    
    // 强制显示5秒倒计时
    let countdown = 5;
    const countdownEl = document.getElementById('countdown');
    const closeBtn = document.getElementById('update-close-btn');
    
    const timer = setInterval(() => {
      countdown--;
      countdownEl.textContent = countdown;
      
      if (countdown <= 0) {
        clearInterval(timer);
        closeBtn.disabled = false;
        closeBtn.textContent = '关闭';
      }
    }, 1000);

    // 关闭弹窗的函数
    const closeModal = () => {
      clearInterval(timer);
      modal.remove();
    };

    // 关闭按钮
    closeBtn.addEventListener('click', () => {
      if (!closeBtn.disabled) {
        closeModal();
      }
    });

    // 下次不再弹出按钮
    document.getElementById('update-dismiss-btn').addEventListener('click', () => {
      localStorage.setItem(STORAGE_KEY, UPDATE_VERSION);
      closeModal();
    });

    // 双击遮罩层快速跳过（相当于点击关闭）
    let lastTapTime = 0;
    const overlay = modal.querySelector('.update-notice-overlay');
    
    overlay.addEventListener('click', (e) => {
      const currentTime = new Date().getTime();
      const tapGap = currentTime - lastTapTime;
      
      if (tapGap < 300 && tapGap > 0) {
        // 双击检测成功，快速关闭
        clearInterval(timer);
        closeModal();
      }
      
      lastTapTime = currentTime;
    });

    // 阻止弹窗内容的点击事件冒泡
    modal.querySelector('.update-notice-content').addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  // 页面加载完成后检查并显示
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (shouldShowNotice()) {
        showNotice();
      }
    });
  } else {
    if (shouldShowNotice()) {
      showNotice();
    }
  }
})();
