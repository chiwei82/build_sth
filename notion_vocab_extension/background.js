chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("🚀 background.js 啟動！");

  if (request.action === "saveVocab") {
    (async () => {
      const word = request.word;
      console.log("📨 收到單字：", word);

      const [token, pageId] = await Promise.all([
        new Promise((res) => chrome.storage.sync.get("notionToken", (r) => res(r.notionToken))),
        new Promise((res) => chrome.storage.sync.get("notionPageId", (r) => res(r.notionPageId)))
      ]);

      console.log("🔑 Token:", token);
      console.log("📄 Page ID:", pageId);

      try {
        const translationResponse = await fetch(`https://api.mymemory.translated.net/get?q=${word}&langpair=en|zh-TW`);
        const translationData = await translationResponse.json();
        const meaning = translationData.responseData.translatedText || "翻譯失敗";

        const dictResponse = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        const dictData = await dictResponse.json();

        let formattedPOS = "";
        if (Array.isArray(dictData) && dictData[0]?.meanings?.length) {
          const pos = dictData[0].meanings[0].partOfSpeech;
          formattedPOS = `${pos}`;
        }

        const notionResponse = await fetch("https://api.notion.com/v1/pages", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            parent: { database_id: pageId },
            properties: {
              word: { title: [{ text: { content: word } }] },
              type: { rich_text: [{ text: { content: formattedPOS } }] },
              Meaning: { rich_text: [{ text: { content: meaning } }] }
            }
          })
        });

        const notionResult = await notionResponse.json();
        console.log("✅ 寫入成功：", notionResult);
        sendResponse({ success: true, url: `https://www.notion.so/${pageId.replace(/-/g, "")}` });
      } catch (e) {
        console.error("❌ 發生錯誤：", e);
        sendResponse({ success: false, error: e.message });
      }
    })();

    return true; // ✅ 告訴 Chrome「我會非同步使用 sendResponse」
  }
});
