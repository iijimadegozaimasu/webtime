// 日付を YYYY-MM-DD 形式で取得する関数
function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// URLからドメイン名を抽出する関数
function getDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (e) {
    return "";
  }
}

// 閲覧時間を計算して保存する関数
async function updateTime() {
  const data = await chrome.storage.session.get(["currentDomain", "startTime"]);
  const currentDomain = data.currentDomain;
  const startTime = data.startTime;

  if (currentDomain && startTime > 0) {
    const timeSpent = Date.now() - startTime;
    const today = getTodayString();
    
    // 現在保存されている全データを取得
    const result = await chrome.storage.local.get(null);
    
    // 今日のデータを取得（まだ無ければ空のオブジェクトを作成）
    let todayData = result[today] || {};
    // ドメインの時間を加算
    todayData[currentDomain] = (todayData[currentDomain] || 0) + timeSpent;
    
    // 今日のデータを保存
    await chrome.storage.local.set({ [today]: todayData });

    // --- 過去3日分だけを残す（古いデータを削除する）処理 ---
    // 保存されているキーの中から「YYYY-MM-DD」形式のものだけを取り出して古い順に並べる
    const dates = Object.keys(result)
      .filter(key => key.match(/^\d{4}-\d{2}-\d{2}$/))
      .sort(); 
      
    // 今日を含めて3日分（今日、1日前、2日前）を超えたら一番古いものを削除
    while (dates.length >= 3) {
      const oldestDate = dates.shift(); // 一番古い日付を取り出す
      // ※↑todayData を追加する前（resultの中身）のリストで計算しているため「>= 3」で判定します
      await chrome.storage.local.remove(oldestDate);
    }
  }
}

// 状態（現在のドメインと計測開始時間）を更新する関数
async function setActiveState(domain) {
  await updateTime();
  
  if (domain) {
    await chrome.storage.session.set({
      currentDomain: domain,
      startTime: Date.now()
    });
  } else {
    await chrome.storage.session.set({
      currentDomain: "",
      startTime: 0
    });
  }
}

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  await setActiveState(getDomain(tab.url));
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.url && tab.active) {
    await setActiveState(getDomain(changeInfo.url));
  }
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    await setActiveState("");
  } else {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0) {
      await setActiveState(getDomain(tabs[0].url));
    }
  }
});

chrome.alarms.create("saveTime", { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "saveTime") {
    const data = await chrome.storage.session.get(["currentDomain", "startTime"]);
    if (data.currentDomain && data.startTime > 0) {
      await updateTime();
      await chrome.storage.session.set({ startTime: Date.now() });
    }
  }
});