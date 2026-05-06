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
  // sessionストレージから現在の状態を取得（スリープ対策）
  const data = await chrome.storage.session.get(["currentDomain", "startTime"]);
  const currentDomain = data.currentDomain;
  const startTime = data.startTime;

  if (currentDomain && startTime > 0) {
    const timeSpent = Date.now() - startTime;
    
    // localストレージに累計時間を保存
    const result = await chrome.storage.local.get([currentDomain]);
    let totalTime = result[currentDomain] || 0;
    totalTime += timeSpent;
    await chrome.storage.local.set({ [currentDomain]: totalTime });
  }
}

// 状態（現在のドメインと計測開始時間）を更新する関数
async function setActiveState(domain) {
  await updateTime(); // 以前のドメインの時間を精算して保存
  
  if (domain) {
    // 新しいドメインの計測を開始
    await chrome.storage.session.set({
      currentDomain: domain,
      startTime: Date.now()
    });
  } else {
    // 別のアプリを見ている時などは計測をストップ
    await chrome.storage.session.set({
      currentDomain: "",
      startTime: 0
    });
  }
}

// -------------------------------------------------
// 1. タブの切り替えやURL変更の検知
// -------------------------------------------------
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  await setActiveState(getDomain(tab.url));
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.url && tab.active) {
    await setActiveState(getDomain(changeInfo.url));
  }
});

// -------------------------------------------------
// 2. Chromeから別のアプリへ移動した時の検知
// -------------------------------------------------
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Chromeのウィンドウからフォーカスが外れた（別のアプリを見ている）
    await setActiveState("");
  } else {
    // Chromeにフォーカスが戻ってきた
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0) {
      await setActiveState(getDomain(tabs[0].url));
    }
  }
});

// -------------------------------------------------
// 3. バックグラウンド停止対策（定期保存）
// -------------------------------------------------
// 1分ごとに現在までの時間を保存し、計測開始時間をリセットする
chrome.alarms.create("saveTime", { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "saveTime") {
    const data = await chrome.storage.session.get(["currentDomain", "startTime"]);
    // 計測中であれば、1分間のデータを保存して再スタート
    if (data.currentDomain && data.startTime > 0) {
      await updateTime();
      await chrome.storage.session.set({ startTime: Date.now() });
    }
  }
});