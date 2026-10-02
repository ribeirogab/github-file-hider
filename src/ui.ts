import type { filteringModel } from "./filtering-session";
import { evaluate, matches, presetRules, presets } from "./rules";
import type { Settings } from "./types";
export type Model = ReturnType<typeof filteringModel>;
export function element<K extends keyof HTMLElementTagNameMap>(
	tag: K,
	text = "",
	className = "",
): HTMLElementTagNameMap[K] {
	const node = document.createElement(tag);
	node.textContent = text;
	node.className = className;
	return node;
}
export function button(text: string, action: () => void): HTMLButtonElement {
	const node = element("button", text);
	node.type = "button";
	node.onclick = action;
	return node;
}
export class PageUI {
	readonly control = element("div");
	readonly main = button("Hide files", () => this.action("activate"));
	readonly menuButton = button("▾", () => this.toggle());
	readonly menu = element("div", "", "fh-menu");
	readonly status = element("div", "", "fh-sr");
	private model: Model | null = null;
	private settings: Settings | null = null;
	private announceTimer = 0;
	private lastAnnouncement = "";
	private typeahead = "";
	private typeaheadTime = 0;
	constructor(private action: (action: string) => void) {
		this.control.id = "fh-control";
		this.menu.id = "fh-menu";
		this.menu.setAttribute("role", "menu");
		this.menu.setAttribute("aria-label", "GitHub File Hider settings");
		this.menu.hidden = true;
		this.menuButton.setAttribute("aria-haspopup", "menu");
		this.menuButton.setAttribute("aria-expanded", "false");
		this.menuButton.setAttribute("aria-controls", "fh-menu");
		this.status.setAttribute("role", "status");
		this.status.setAttribute("aria-live", "polite");
		this.control.append(this.main, this.menuButton);
		document.body.append(this.menu, this.status);
		this.main.onclick = () => {
			if (this.model?.view === "empty") this.toggle();
			else {
				this.action("activate");
				this.menuButton.focus();
			}
		};
		this.menuButton.onkeydown = (e) => {
			if (e.key === "ArrowDown" || e.key === "ArrowUp") {
				e.preventDefault();
				this.open(e.key === "ArrowUp");
			}
		};
		this.menu.onkeydown = (e) => this.onMenuKey(e);
		document.addEventListener("pointerdown", this.onOutside);
	}
	private onOutside = (event: PointerEvent) => {
		if (
			!this.control.contains(event.target as Node) &&
			!this.menu.contains(event.target as Node)
		)
			this.close(false);
	};
	close(restore = true) {
		this.menu.hidden = true;
		this.menuButton.setAttribute("aria-expanded", "false");
		if (restore) this.menuButton.focus();
	}
	private toggle() {
		if (this.menu.hidden) this.open();
		else this.close();
	}
	private items() {
		return [
			...this.menu.querySelectorAll<HTMLButtonElement>('[role^="menuitem"]'),
		];
	}
	private open(last = false) {
		this.menu.hidden = false;
		this.menuButton.setAttribute("aria-expanded", "true");
		const rect = this.menuButton.getBoundingClientRect();
		this.menu.style.top = `${Math.min(rect.bottom + 6, innerHeight - 400)}px`;
		this.menu.style.left = `${Math.max(8, Math.min(rect.left, innerWidth - 328))}px`;
		const items = this.items();
		(last ? items.at(-1) : items[0])?.focus();
	}
	private onMenuKey(e: KeyboardEvent) {
		const items = this.items();
		const index = items.indexOf(document.activeElement as HTMLButtonElement);
		if (e.key === "Escape" || e.key === "Tab") {
			e.preventDefault();
			this.close();
			return;
		}
		let next: HTMLButtonElement | undefined;
		if (e.key === "ArrowDown") next = items[(index + 1) % items.length];
		if (e.key === "ArrowUp")
			next = items[(index - 1 + items.length) % items.length];
		if (e.key === "Home") next = items[0];
		if (e.key === "End") next = items.at(-1);
		if (e.key.length === 1 && /[a-z]/i.test(e.key)) {
			this.typeahead =
				performance.now() - this.typeaheadTime > 500
					? e.key
					: this.typeahead + e.key;
			this.typeaheadTime = performance.now();
			next = [...items.slice(index + 1), ...items.slice(0, index + 1)].find(
				(item) =>
					item.textContent
						?.toLowerCase()
						.startsWith(this.typeahead.toLowerCase()),
			);
		}
		if (next) {
			e.preventDefault();
			next.focus();
		}
	}
	private item(label: string, action: string, checked?: boolean) {
		const node = button(label, () => this.action(action));
		node.dataset.action = action;
		node.setAttribute("aria-label", label);
		node.tabIndex = -1;
		node.setAttribute(
			"role",
			checked === undefined ? "menuitem" : "menuitemcheckbox",
		);
		if (checked !== undefined)
			node.setAttribute("aria-checked", String(checked));
		return node;
	}
	render(model: Model, settings: Settings) {
		this.model = model;
		this.settings = settings;
		this.main.hidden = model.view === "filtering";
		this.main.textContent =
			model.view === "showing"
				? "Hide files again"
				: model.view === "empty"
					? "Hide files"
					: `Hide files · ${model.matchCount}`;
		this.main.title =
			model.view === "empty"
				? "Choose which files to hide"
				: `Hide ${model.matchCount} files that match your rules`;
		this.menuButton.textContent =
			model.view === "filtering"
				? `${model.hiddenCount} ${model.hiddenCount === 1 ? "file hidden" : "files hidden"} ▾`
				: "▾";
		this.menuButton.setAttribute(
			"aria-label",
			model.view === "filtering"
				? `${model.hiddenCount} ${model.hiddenCount === 1 ? "file hidden" : "files hidden"}`
				: "GitHub File Hider settings",
		);
		this.renderMenu();
		const announcement = model.filtering
			? `${model.hiddenCount} ${model.hiddenCount === 1 ? "file" : "files"} hidden.`
			: "All files are visible.";
		this.announce(announcement);
	}
	announce(message: string) {
		if (message === this.lastAnnouncement) return;
		this.lastAnnouncement = message;
		clearTimeout(this.announceTimer);
		this.announceTimer = window.setTimeout(() => {
			this.status.textContent = message;
		}, 150);
	}
	private renderMenu() {
		const model = this.model;
		const settings = this.settings;
		if (!model || !settings) return;
		const focused = (document.activeElement as HTMLElement)?.dataset.action;
		const nodes: HTMLElement[] = [];
		if (model.view === "empty")
			nodes.push(
				element("strong", "Choose what to hide"),
				element(
					"p",
					"Turn on a preset or add custom rules. Nothing is hidden until you select Hide files.",
				),
			);
		nodes.push(
			this.item("Hide files in this pull request", "activation", model.active),
		);
		const heading = element(
			"div",
			"Presets · All repositories",
			"fh-menu-heading",
		);
		heading.id = "fh-presets-heading";
		const group = element("div");
		group.setAttribute("role", "group");
		group.setAttribute("aria-labelledby", heading.id);
		for (const preset of presets) {
			const count = model.files.filter(
				(f) =>
					presetRules(settings, preset.id).some((p) => matches(p, f.path)) &&
					!evaluate(f.path, {
						...settings,
						presets: {
							...settings.presets,
							[preset.id]: { ...settings.presets[preset.id], enabled: true },
						},
					}).kept,
			).length;
			group.append(
				this.item(
					`${preset.name} · ${count}`,
					`preset:${preset.id}`,
					settings.presets[preset.id].enabled,
				),
			);
		}
		nodes.push(
			heading,
			group,
			this.item("Custom rules · No custom rules yet", "custom"),
			this.item("Hide in sidebar tree", "tree", settings.treeFiltering),
			this.item("Settings", "settings"),
		);
		this.menu.replaceChildren(...nodes);
		if (focused && !this.menu.hidden)
			this.items()
				.find((item) => item.dataset.action === focused)
				?.focus();
	}
	destroy() {
		this.control.remove();
		this.menu.remove();
		this.status.remove();
		clearTimeout(this.announceTimer);
		document.removeEventListener("pointerdown", this.onOutside);
	}
}
