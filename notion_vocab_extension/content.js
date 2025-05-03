let debounceTimer = null;
let isSaving = false;
let lastMouseX = 0;
let lastMouseY = 0;

// 追蹤滑鼠位置（用於 popup 定位）
document.addEventListener("mousemove", (e) => {
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
});

// 主體偵測選字變化
document.addEventListener("selectionchange", () => {
  if (isSaving) return;

  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) {
      removeIcon();
      return;
    }

    const text = selection.toString().trim();
    if (!text || text.length > 50) {
      removeIcon();
      return;
    }

    const anchorNode = selection.anchorNode;
    if (
      !anchorNode ||
      anchorNode.nodeType !== Node.TEXT_NODE ||
      isInsideIgnoredElement(anchorNode)
    ) {
      removeIcon();
      return;
    }

    showPopupAtMouse(text);
  }, 250); // debounce 250ms
});

// 顯示 popup icon
function showPopupAtMouse(text) {
  removeIcon();

  const selection = window.getSelection();
  const range = selection.getRangeAt(0);

  // get 選取範圍的 rectangular position
  const rects = range.getClientRects();
  const lastRect = rects[rects.length - 1];
  const absoluteX = lastRect.right + window.scrollX;
  const absoluteY = lastRect.bottom + window.scrollY;

  const iconWrapper = document.createElement("button");
  iconWrapper.id = "myext-vocab-float-icon";
  iconWrapper.setAttribute("aria-label", "Click to save vocab");
  iconWrapper.style.position = "absolute"; // 原本是 fixed
  iconWrapper.style.left = `${absoluteX}px`;
  iconWrapper.style.top = `${absoluteY}px`; // 顯示在文字上方一點
  iconWrapper.style.width = "28px";
  iconWrapper.style.height = "28px";
  iconWrapper.style.padding = "0";
  iconWrapper.style.border = "none"; // 改為無框線，原本是 "10px"
  iconWrapper.style.background = "rgba(1,1,1,0.6)";
  iconWrapper.style.cursor = "pointer";
  iconWrapper.style.zIndex = "999999";
  iconWrapper.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";
  iconWrapper.style.borderRadius = "30%";

  const iconImg = document.createElement("img");
  iconImg.src = chrome.runtime.getURL("icons/icon.gif");
  iconImg.alt = "Save vocab";
  iconImg.style.width = "100%";
  iconImg.style.height = "100%";
  iconImg.style.display = "block";

  iconWrapper.appendChild(iconImg);

  iconWrapper.onclick = () => {
    isSaving = true;
    removeIcon();
    window.getSelection().removeAllRanges();

    showToast("loading"); // loading Toast

    chrome.runtime.sendMessage(
      { action: "saveVocab", word: text },
      (response) => {
        isSaving = false;
        if (chrome.runtime.lastError) {
          console.error("❌ 傳送失敗：", chrome.runtime.lastError.message);
          showToast("error");
        } else {
          console.log("✅ 單字已傳送：", response);
          showToast("success", response.url);
        }
      }
    );
  };

  document.body.appendChild(iconWrapper);
}

// 判斷是否選到輸入框、按鈕之類的區域
function isInsideIgnoredElement(node) {
  let el = node.parentElement;
  while (el) {
    if (["INPUT", "TEXTAREA", "BUTTON"].includes(el.tagName)) {
      return true;
    }
    el = el.parentElement;
  }
  return false;
}

// 清除現有 popup
function removeIcon() {
  const existing = document.getElementById("myext-vocab-float-icon");
  if (existing) existing.remove();
}


// loading Toast
function showToast(status, linkUrl = "") {
  const existingToast = document.getElementById("myext-toast");
  if (existingToast) existingToast.remove();

  const toast = document.createElement("div");
  toast.id = "myext-toast";
  toast.style.position = "fixed";
  toast.style.bottom = "20px";
  toast.style.right = "20px";
  toast.style.padding = "12px 16px";
  toast.style.background = "rgba(0, 0, 0, 0.85)";
  toast.style.color = "#fff";
  toast.style.borderRadius = "8px";
  toast.style.fontSize = "16px";
  toast.style.display = "flex";
  toast.style.flexDirection = "column";
  toast.style.alignItems = "flex-start";
  toast.style.gap = "4px";
  toast.style.zIndex = "999999";
  toast.style.opacity = "0";
  toast.style.transition = "opacity 0.5s";
  toast.style.overflow = "hidden";
  toast.style.maxWidth = "300px";

  // 文字訊息區塊
  const message = document.createElement("div");
  if (status === "loading") {
    message.textContent = "⌛ 正在儲存單字...";
  } else if (status === "success") {
    message.textContent = "✅ 已成功儲存！";
  } else if (status === "error") {
    message.textContent = "❌ 發生錯誤";
  } else {
    message.textContent = status; // 支援自定文字
  }
  toast.appendChild(message);

  // 超連結
  if (status === "success" && linkUrl) {
    const link = document.createElement("a");
    link.href = linkUrl;
    link.textContent = "前往查看";
    link.target = "_blank";
    link.style.color = "#4FC3F7";
    link.style.textDecoration = "underline";
    link.style.fontSize = "14px";
    link.style.cursor = "pointer";
    link.style.alignSelf = "flex-end";
    toast.appendChild(link);
  }

  // 進度條
  const progressBar = document.createElement("div");
  progressBar.style.position = "absolute";
  progressBar.style.left = "0";
  progressBar.style.bottom = "0";
  progressBar.style.height = "4px";
  progressBar.style.backgroundColor = "#4FC3F7";
  progressBar.style.width = "100%";
  progressBar.style.transition = "width 2s linear";
  toast.appendChild(progressBar);

  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    progressBar.style.width = "0%";
  });

  // 進度條計時 + 滑鼠控制暫停
  let timeoutId;
  let removeToast = () => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 500);
  };

  const startTimeout = () => {
    timeoutId = setTimeout(removeToast, 2000);
  };

  const pauseTimeout = () => clearTimeout(timeoutId);

  toast.addEventListener("mouseenter", pauseTimeout);
  toast.addEventListener("mouseleave", startTimeout);

  startTimeout();
}

