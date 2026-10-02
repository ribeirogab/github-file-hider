import type { ControlViewName, PageModel } from "../filtering-session";
import { createAnnouncer, createControl, createTooltip } from "./in-page";
import { controlView } from "./markup";

export type PageUiActions = {
	onMain: (view: ControlViewName) => void;
};

export function createPageUi(actions: PageUiActions) {
	const announcer = createAnnouncer();
	const tooltip = createTooltip();
	const control = createControl({
		onMain: actions.onMain,
		onToggleMenu: () => {},
		onOpenMenu: () => {},
		announce: announcer.announce,
	});
	return {
		control,
		tooltip,
		announcer,
		update(model: PageModel) {
			control.update(controlView(model));
		},
		remove() {
			control.element.remove();
			tooltip.remove();
			announcer.remove();
		},
	};
}

export type PageUi = ReturnType<typeof createPageUi>;
