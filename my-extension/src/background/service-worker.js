// Toggle side panel when extension icon is clicked
chrome.action.onClicked.addListener(async (tab) => {
  const windowId = tab.windowId;

  // Open the side panel and let the panel itself handle closing
  await chrome.sidePanel.open({ windowId: windowId });
});
