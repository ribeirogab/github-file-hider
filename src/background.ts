chrome.action.onClicked.addListener(() => {
	void chrome.runtime.openOptionsPage();
});
chrome.runtime.onMessage.addListener((message) => {
	if (message.type === "open-settings") void chrome.runtime.openOptionsPage();
});
