type OpenSettings = { type: "open-settings"; page: string };

const isOpenSettings = (message: unknown): message is OpenSettings =>
	typeof message === "object" &&
	message !== null &&
	(message as { type?: unknown }).type === "open-settings";

chrome.action.onClicked.addListener(() => {
	void chrome.runtime.openOptionsPage();
});

chrome.runtime.onMessage.addListener((message) => {
	if (!isOpenSettings(message)) return;
	void chrome.tabs.create({
		url: chrome.runtime.getURL(`settings.html#${message.page}`),
	});
});
