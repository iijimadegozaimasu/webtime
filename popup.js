// 日付を YYYY-MM-DD 形式で取得する関数
function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get(null, (items) => {
    const container = document.getElementById("container");
    
    // YYYY-MM-DD 形式のキー（日付）を取り出して、新しい順（降順）にソート
    const dates = Object.keys(items)
      .filter(key => key.match(/^\d{4}-\d{2}-\d{2}$/))
      .sort((a, b) => b.localeCompare(a)); 

    if (dates.length === 0) {
      container.innerHTML = "<p class='no-data'>まだ記録がありません。</p>";
      return;
    }

    // 各日付ごとにブロックを作成して表示
    dates.forEach(date => {
      // 日付の見出しを作成
      const h2 = document.createElement("h2");
      h2.textContent = (date === getTodayString()) ? `今日 (${date})` : date;
      container.appendChild(h2);

      const ul = document.createElement("ul");
      const dayData = items[date];

      // 時間の長い順に並び替え
      const sortedDomains = Object.entries(dayData).sort((a, b) => b[1] - a[1]);
      let hasData = false;

      sortedDomains.forEach(([domain, timeMs]) => {
        if (!domain) return;
        
        const minutes = Math.floor(timeMs / (1000 * 60));
        const seconds = Math.floor((timeMs % (1000 * 60)) / 1000);
        
        if (minutes > 0 || seconds > 0) {
          const li = document.createElement("li");
          li.innerHTML = `<span>${domain}</span> <span>${minutes}分 ${seconds}秒</span>`;
          ul.appendChild(li);
          hasData = true; // 1秒以上の記録があった
        }
      });

      // 記録が0秒のものしかなかった場合
      if (!hasData) {
        const li = document.createElement("li");
        li.className = "no-data";
        li.innerHTML = `<span>記録なし</span>`;
        ul.appendChild(li);
      }

      container.appendChild(ul);
    });
  });
});