import { normalizeSettings, type Settings } from "./settings";

const KEY = "settings";

export async function readSettings(): Promise<Settings> {
	const stored = await chrome.storage.local.get(KEY);
	return normalizeSettings(stored[KEY]);
}

export async function writeSettings(settings: Settings) {
	await chrome.storage.local.set({ [KEY]: settings });
}

export async function updateSettings(change: (settings: Settings) => Settings) {
	const next = change(await readSettings());
	await writeSettings(next);
	return next;
}

export function watchSettings(listener: (settings: Settings) => void) {
	const onChanged = (
		changes: Record<string, chrome.storage.StorageChange>,
		area: string,
	) => {
		const change = changes[KEY];
		if (area === "local" && change)
			listener(normalizeSettings(change.newValue));
	};
	chrome.storage.onChanged.addListener(onChanged);
	return () => chrome.storage.onChanged.removeListener(onChanged);
}
