import { copy } from "./copy";
import {
	type ControlView,
	isSplit,
	type MenuModel,
	mainInner,
	menuHtml,
	menuInner,
} from "./markup";

const reducedMotion = () =>
	matchMedia("(prefers-reduced-motion: reduce)").matches;

export function createAnnouncer() {
	const element = document.createElement("div");
	element.className = "fh-sr";
	element.setAttribute("role", "status");
	element.setAttribute("aria-live", "polite");
	document.body.append(element);
	let timer = 0;
	return {
		element,
		announce(message: string) {
			clearTimeout(timer);
			element.textContent = "";
			timer = window.setTimeout(() => {
				element.textContent = message;
			}, 150);
		},
		remove: () => element.remove(),
	};
}

export type Announcer = ReturnType<typeof createAnnouncer>;

export function createTooltip() {
	const element = document.createElement("div");
	element.className = "fh-tooltip";
	element.id = "fh-tooltip";
	element.setAttribute("role", "tooltip");
	document.body.append(element);
	let current: HTMLElement | null = null;
	let suppressed: Element | null = null;
	let timer = 0;

	function place(target: HTMLElement) {
		const rect = target.getBoundingClientRect();
		const width = element.offsetWidth;
		const height = element.offsetHeight;
		let top = rect.top - height - 6;
		if (top < 4) top = rect.bottom + 6;
		const left = Math.max(
			8,
			Math.min(rect.left + rect.width / 2 - width / 2, innerWidth - width - 8),
		);
		element.style.left = `${Math.round(left)}px`;
		element.style.top = `${Math.round(top)}px`;
	}

	function show(target: HTMLElement) {
		const text = target.dataset.fhTip;
		if (!text || !target.isConnected) return;
		current = target;
		element.textContent = text;
		place(target);
		element.classList.add("is-open");
		target.setAttribute("aria-describedby", "fh-tooltip");
	}

	function hide() {
		clearTimeout(timer);
		if (!current) return;
		current.removeAttribute("aria-describedby");
		current = null;
		element.classList.remove("is-open");
	}

	const tipTarget = (target: EventTarget | null) =>
		target instanceof Element
			? target.closest<HTMLElement>("[data-fh-tip]")
			: null;

	const onPointerOver = (event: PointerEvent) => {
		const target = tipTarget(event.target);
		if (target === current) return;
		if (target && target === suppressed) return;
		suppressed = null;
		hide();
		if (target) timer = window.setTimeout(() => show(target), 350);
	};
	const onPointerDown = (event: PointerEvent) => {
		suppressed = tipTarget(event.target);
		hide();
	};
	const onFocusIn = (event: FocusEvent) => {
		const target = tipTarget(event.target);
		hide();
		if (target?.matches(":focus-visible")) show(target);
	};
	const onKeyDown = (event: KeyboardEvent) => {
		if (event.key === "Escape") hide();
	};

	document.addEventListener("pointerover", onPointerOver);
	document.addEventListener("pointerdown", onPointerDown, true);
	document.addEventListener("focusin", onFocusIn);
	document.addEventListener("focusout", hide);
	document.addEventListener("keydown", onKeyDown);
	addEventListener("scroll", hide, true);

	return {
		element,
		hide,
		remove() {
			hide();
			element.remove();
			document.removeEventListener("pointerover", onPointerOver);
			document.removeEventListener("pointerdown", onPointerDown, true);
			document.removeEventListener("focusin", onFocusIn);
			document.removeEventListener("focusout", hide);
			document.removeEventListener("keydown", onKeyDown);
			removeEventListener("scroll", hide, true);
		},
	};
}

export type Tooltip = ReturnType<typeof createTooltip>;

type RollElement = HTMLElement & { fhTimer?: number };

function setRoll(element: RollElement | null, value: number) {
	if (!element) return;
	const previous = Number(element.dataset.value);
	if (previous === value) return;
	element.dataset.value = String(value);
	clearTimeout(element.fhTimer);
	if (reducedMotion() || Number.isNaN(previous)) {
		element.innerHTML = `<span>${value}</span>`;
		return;
	}
	element.style.setProperty("--dir", value > previous ? "1" : "-1");
	element.innerHTML = `<span class="fh-roll-out">${previous}</span><span class="fh-roll-in">${value}</span>`;
	element.fhTimer = window.setTimeout(() => {
		element.innerHTML = `<span>${value}</span>`;
	}, 260);
}

export type ControlHandlers = {
	onMain: (view: ControlView["view"]) => void;
	onToggleMenu: () => void;
	onOpenMenu: (focus: "first" | "last") => void;
	announce: (message: string) => void;
};

export function createControl(handlers: ControlHandlers) {
	const element = document.createElement("div");
	element.className = "fh-ctl";
	element.innerHTML = `<button type="button" class="fh-ctl-btn fh-ctl-main"></button><span class="fh-ctl-sep" aria-hidden="true"></span><button type="button" class="fh-ctl-btn fh-ctl-menu" aria-haspopup="menu" aria-expanded="false" aria-controls="fh-menu"></button>`;
	const main = element.querySelector<HTMLButtonElement>(".fh-ctl-main");
	const separator = element.querySelector<HTMLElement>(".fh-ctl-sep");
	const menuButton = element.querySelector<HTMLButtonElement>(".fh-ctl-menu");
	if (!main || !separator || !menuButton) throw new Error("Control markup");
	let current: ControlView | null = null;
	let signature = "";
	let announced: string | null = null;

	main.addEventListener("click", () => {
		if (current) handlers.onMain(current.view);
	});
	menuButton.addEventListener("click", () => handlers.onToggleMenu());
	menuButton.addEventListener("keydown", (event) => {
		if (event.key === "ArrowDown") {
			event.preventDefault();
			handlers.onOpenMenu("first");
		}
		if (event.key === "ArrowUp") {
			event.preventDefault();
			handlers.onOpenMenu("last");
		}
	});

	function announceChange(control: ControlView) {
		const key = `${control.view}|${control.hidden}|${control.match}`;
		if (announced === null) {
			announced = key;
			return;
		}
		if (key === announced) return;
		const previousView = announced.split("|")[0];
		announced = key;
		if (control.view === "filtering")
			handlers.announce(copy.live.hidden(control.hidden));
		else if (control.view === "showing" && previousView !== "showing")
			handlers.announce(copy.live.showing(control.match));
		else if (control.view === "inactive" && previousView !== "inactive")
			handlers.announce(copy.live.off);
	}

	function update(control: ControlView) {
		if (!main || !separator || !menuButton) return;
		const split = isSplit(control.view);
		const nextSignature = `${control.view}|${control.auto}`;
		const hadMainFocus = document.activeElement === main;
		if (nextSignature !== signature) {
			main.innerHTML = mainInner(control);
			menuButton.innerHTML = menuInner(control);
			element.dataset.view = control.view;
			element.toggleAttribute("data-split", split);
			main.hidden = !split;
			separator.hidden = !split;
			signature = nextSignature;
		} else {
			setRoll(main.querySelector<HTMLElement>(".fh-roll"), control.match);
			setRoll(
				menuButton.querySelector<HTMLElement>(".fh-roll"),
				control.hidden,
			);
			const noun = menuButton.querySelector(".fh-ctl-noun");
			if (noun) noun.textContent = copy.filesHidden(control.hidden);
		}
		main.dataset.fhTip =
			control.view === "showing"
				? copy.tipHideAgain
				: copy.tipHide(control.match);
		if (split) {
			menuButton.setAttribute("aria-label", copy.options);
			menuButton.dataset.fhTip = copy.options;
		} else {
			menuButton.removeAttribute("aria-label");
			if (control.view === "empty") menuButton.dataset.fhTip = copy.tipEmpty;
			else delete menuButton.dataset.fhTip;
		}
		current = control;
		if (hadMainFocus && !split) menuButton.focus();
		announceChange(control);
	}

	return {
		element,
		main,
		menuButton,
		update,
		focus: () => menuButton.focus(),
	};
}

export type Control = ReturnType<typeof createControl>;

export type MenuHandlers = {
	anchor: () => HTMLElement;
	menuButton: () => HTMLElement;
	model: () => MenuModel;
	onRun: (key: string) => void;
	beforeOpen: () => void;
};

export function createMenu(handlers: MenuHandlers) {
	let overlay: HTMLDivElement | null = null;
	let typeahead = "";
	let typeTimer = 0;

	const items = () =>
		overlay
			? [...overlay.querySelectorAll<HTMLElement>('[role^="menuitem"]')]
			: [];

	function position() {
		if (!overlay) return;
		const anchor = handlers.anchor().getBoundingClientRect();
		const width = overlay.offsetWidth;
		let left = anchor.left;
		if (left + width > innerWidth - 8) left = Math.max(8, anchor.right - width);
		const top = anchor.bottom + 4;
		overlay.style.left = `${Math.round(left)}px`;
		overlay.style.top = `${Math.round(top)}px`;
		overlay.style.maxHeight = `${Math.max(200, innerHeight - top - 12)}px`;
	}

	function render() {
		if (!overlay) return;
		const active = document.activeElement;
		const focusedKey =
			active instanceof HTMLElement && overlay.contains(active)
				? active.dataset.key
				: null;
		overlay.innerHTML = menuHtml(handlers.model());
		if (focusedKey) {
			const again =
				overlay.querySelector<HTMLElement>(
					`[data-key="${CSS.escape(focusedKey)}"]`,
				) ?? items()[0];
			again?.focus({ preventScroll: true });
		}
		position();
	}

	function onKey(event: KeyboardEvent) {
		const list = items();
		const index = list.indexOf(document.activeElement as HTMLElement);
		const move = (n: number) => list[(n + list.length) % list.length]?.focus();
		if (event.key === "ArrowDown") {
			event.preventDefault();
			move(index + 1);
		} else if (event.key === "ArrowUp") {
			event.preventDefault();
			move(index < 0 ? -1 : index - 1);
		} else if (event.key === "Home" || event.key === "PageUp") {
			event.preventDefault();
			move(0);
		} else if (event.key === "End" || event.key === "PageDown") {
			event.preventDefault();
			move(-1);
		} else if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			const item = list[index];
			if (item?.dataset.key) handlers.onRun(item.dataset.key);
		} else if (event.key === "Escape" || event.key === "Tab") {
			event.preventDefault();
			close();
		} else if (
			event.key.length === 1 &&
			/\S/.test(event.key) &&
			!event.metaKey &&
			!event.ctrlKey &&
			!event.altKey
		) {
			clearTimeout(typeTimer);
			typeahead += event.key.toLowerCase();
			typeTimer = window.setTimeout(() => {
				typeahead = "";
			}, 600);
			const order = [...list.slice(index + 1), ...list.slice(0, index + 1)];
			order
				.find((item) =>
					item
						.querySelector(".fh-al-label")
						?.textContent?.trim()
						.toLowerCase()
						.startsWith(typeahead),
				)
				?.focus();
		}
	}

	function open(focus: "first" | "last" = "first") {
		if (!overlay) {
			handlers.beforeOpen();
			overlay = document.createElement("div");
			overlay.className = "fh-overlay";
			overlay.id = "fh-menu";
			overlay.setAttribute("role", "menu");
			overlay.setAttribute("aria-label", copy.product);
			overlay.tabIndex = -1;
			document.body.append(overlay);
			overlay.addEventListener("keydown", onKey);
			overlay.addEventListener("click", (event) => {
				const item =
					event.target instanceof Element
						? event.target.closest<HTMLElement>('[role^="menuitem"]')
						: null;
				if (item?.dataset.key) handlers.onRun(item.dataset.key);
			});
			handlers.menuButton().setAttribute("aria-expanded", "true");
			render();
		}
		const list = items();
		const target = focus === "last" ? list[list.length - 1] : list[0];
		(target ?? overlay).focus({ preventScroll: true });
	}

	function close({ restore = true } = {}) {
		if (!overlay) return;
		overlay.remove();
		overlay = null;
		handlers.menuButton().setAttribute("aria-expanded", "false");
		if (restore) handlers.menuButton().focus();
	}

	const onOutside = (event: PointerEvent) => {
		const target = event.target as Node;
		if (
			overlay &&
			!overlay.contains(target) &&
			!handlers.anchor().contains(target)
		)
			close({ restore: false });
	};
	const onScroll = () => requestAnimationFrame(position);
	document.addEventListener("pointerdown", onOutside, true);
	addEventListener("resize", position);
	addEventListener("scroll", onScroll, true);

	return {
		open,
		close,
		render,
		toggle(focus: "first" | "last" = "first") {
			if (overlay) close();
			else open(focus);
		},
		get isOpen() {
			return overlay !== null;
		},
		remove() {
			close({ restore: false });
			document.removeEventListener("pointerdown", onOutside, true);
			removeEventListener("resize", position);
			removeEventListener("scroll", onScroll, true);
		},
	};
}

export type Menu = ReturnType<typeof createMenu>;
