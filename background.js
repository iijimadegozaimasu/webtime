let currentDomain = "";
let startTime = 0;
let isIdle = false; // 離席中かどうかのフラグ

// 何秒操作がなければ「離席」とみなすか（最小15秒。ここでは60秒に設定）
chrome.idle.setDetectionInterval(60);

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
function updateTime() {
  // ドメインがあり、計測が開始されていて、かつ離席中でない場合のみ保存
  if (currentDomain && startTime > 0 && !isIdle) {
    const timeSpent = Date.now() - startTime;
    
    chrome.storage.local.get([currentDomain], (result) => {
      let totalTime = result[currentDomain] || 0;
      totalTime += timeSpent;
      chrome.storage.local.set({ [currentDomain]: totalTime });
    });
  }
}

// -------------------------------------------------
// 1. タブの切り替えやURL変更の検知（前回と同じ）
// -------------------------------------------------
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    updateTime();
    currentDomain = getDomain(tab.url);
    startTime = Date.now();
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url && tab.active) {
    updateTime();
    currentDomain = getDomain(changeInfo.url);
    startTime = Date.now();
  }
});

// -------------------------------------------------
// 2. Chromeから別のアプリへ移動した時の検知
// -------------------------------------------------
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Chromeのウィンドウからフォーカスが外れた（別のアプリを見ている）
    updateTime(); // ここまでの時間を保存
    startTime = 0; // 計測を一旦ストップ
  } else {
    // Chromeにフォーカスが戻ってきた
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        currentDomain = getDomain(tabs[0].url);
        startTime = Date.now(); // 計測再開
      }
    });
  }
});

// -------------------------------------------------
// 3. PCの前から離席した時の検知
// -------------------------------------------------
chrome.idle.onStateChanged.addListener((newState) => {
  if (newState === "active") {
    // 操作を再開した時
    isIdle = false;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        currentDomain = getDomain(tabs[0].url);
        startTime = Date.now(); // 計測再開
      }
    });
  } else {
    // "idle"（操作なし）または "locked"（画面ロック）になった時
    updateTime(); // 離席するまでの時間を保存
    isIdle = true; // 離席フラグをオン
    startTime = 0; // 計測を一旦ストップ
  }
});