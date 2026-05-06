document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get(null, (items) => {
    const list = document.getElementById("timeList");
    
    // lastDate（日付データ）を除外し、時間の長い順に並び替え
    const sortedItems = Object.entries(items)
      .filter(([key]) => key !== "lastDate") // ← この行で日付データを非表示にしています
      .sort((a, b) => b[1] - a[1]);

    sortedItems.forEach(([domain, timeMs]) => {
      if (!domain) return;
      
      // ミリ秒を「分」に変換（秒を見たい場合は / 1000 にする）
      const minutes = Math.floor(timeMs / (1000 * 60));
      const seconds = Math.floor((timeMs % (1000 * 60)) / 1000);
      
      if (minutes > 0 || seconds > 0) {
        const li = document.createElement("li");
        li.innerHTML = `<span>${domain}</span> <span>${minutes}分 ${seconds}秒</span>`;
        list.appendChild(li);
      }
    });
  });
});