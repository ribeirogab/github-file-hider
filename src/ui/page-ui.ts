import type { ControlViewName, PageModel } from "../filtering-session";
import {
	createAnnouncer,
	createControl,
	createMenu,
	createTooltip,
} from "./in-page";
import { controlView, menuModel } from "./markup";

export type PageUiActions = {
	onMain: (view: ControlViewName) => void;
	onMenuItem: (key: string) => void;
};

export function createPageUi(actions: PageUiActions) {
	const announcer = createAnnouncer();
	const tooltip = createTooltip();
	let model: PageModel | null = null;
	const menu = createMenu({
		anchor: () => control.element,
		menuButton: () => control.menuButton,
		model: () => {
			if (!model) throw new Error("Menu opened before the page model");
			return menuModel(model);
		},
		onRun: actions.onMenuItem,
		beforeOpen: () => tooltip.hide(),
	});
	const control = createControl({
		onMain: actions.onMain,
		onToggleMenu: () => menu.toggle("first"),
		onOpenMenu: (focus) => menu.open(focus),
		announce: announcer.announce,
	});
	return {
		control,
		menu,
		tooltip,
		announcer,
		update(next: PageModel) {
			model = next;
			control.update(controlView(next));
			if (menu.isOpen) menu.render();
		},
		remove() {
			menu.remove();
			control.element.remove();
			tooltip.remove();
			announcer.remove();
		},
	};
}

export type PageUi = ReturnType<typeof createPageUi>;
