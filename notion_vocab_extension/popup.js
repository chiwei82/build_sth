document.getElementById("save").addEventListener("click", () => {
  const token = document.getElementById("token").value;
  const pageId = document.getElementById("pageId").value;

  chrome.storage.sync.set({ notionToken: token, notionPageId: pageId }, () => {
    alert("儲存成功");
  });
});