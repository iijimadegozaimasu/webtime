// 日付を YYYY-MM-DD 形式で取得する関数
function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ミリ秒を見やすい時間文字列（〇時間〇分〇秒）に変換する関数
function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}時間 ${minutes}分`; // 1時間以上の場合は秒を省略してスッキリさせる
  } else if (minutes > 0) {
    return `${minutes}分 ${seconds}秒`;
  } else {
    return `${seconds}秒`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get(null, (items) => {
    const container = document.getElementById("container");
    
    // YYYY-MM-DD 形式のキー（日付）を取り出して、新しい順にソート
    const dates = Object.keys(items)
      .filter(key => key.match(/^\d{4}-\d{2}-\d{2}$/))
      .sort((a, b) => b.localeCompare(a)); 

    if (dates.length === 0) {
      container.innerHTML = "<p class='no-data'>まだ記録がありません。</p>";
      return;
    }

    // 各日付ごとにブロックを作成して表示
    dates.forEach(date => {
      const dayData = items[date];

      // --- 1日の総時間を計算 ---
      let totalDayMs = 0;
      Object.values(dayData).forEach(timeMs => {
        totalDayMs += timeMs;
      });

      // 日付と総時間の見出しを作成
      const h2 = document.createElement("h2");
      const titleText = (date === getTodayString()) ? `今日 (${date})` : date;
      
      // 見出しの左右に文字を振り分けるためのスタイル設定
      h2.style.display = "flex";
      h2.style.justifyContent = "space-between";
      h2.innerHTML = `<span>${titleText}</span> <span>総計: ${formatTime(totalDayMs)}</span>`;
      container.appendChild(h2);

      const ul = document.createElement("ul");
      
      // 時間の長い順に並び替え
      const sortedDomains = Object.entries(dayData).sort((a, b) => b[1] - a[1]);
      let hasData = false;

      sortedDomains.forEach(([domain, timeMs]) => {
        if (!domain) return;
        
        // 1秒(1000ミリ秒)以上の記録のみ表示
        if (timeMs >= 1000) {
          const li = document.createElement("li");
          li.innerHTML = `<span>${domain}</span> <span>${formatTime(timeMs)}</span>`;
          ul.appendChild(li);
          hasData = true;
        }
      });

      // 記録が1秒未満のものしかなかった場合
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