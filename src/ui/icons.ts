const ICONS = {
	plus: '<path d="M8 3v10M3 8h10"/>',
	chevronRight: '<path d="m6.25 4.5 3.5 3.5-3.5 3.5"/>',
	caret: '<path d="M4.5 6.5h7L8 10z" fill="currentColor" stroke="none"/>',
	code: '<path d="M5.25 4.25 1.75 8l3.5 3.75M10.75 4.25 14.25 8l-3.5 3.75"/>',
	sidebar:
		'<rect x="1.75" y="2.75" width="12.5" height="10.5" rx="1.5"/><path d="M6 2.75v10.5"/>',
	gear: '<circle cx="8" cy="8" r="5" stroke-dasharray="2.1 1.83" stroke-width="2.6" stroke-linecap="butt"/><circle cx="8" cy="8" r="2"/>',
	eye: '<path d="M1.25 8S3.75 3.25 8 3.25 14.75 8 14.75 8 12.25 12.75 8 12.75 1.25 8 1.25 8z"/><circle cx="8" cy="8" r="2.25"/>',
	eyeOff:
		'<path d="M2 2l12 12M6.4 6.45A2.25 2.25 0 0 0 9.55 9.6M4.1 4.6C2.3 5.85 1.25 8 1.25 8S3.75 12.75 8 12.75c1.35 0 2.5-.45 3.5-1.1M6.6 3.4c.45-.1.9-.15 1.4-.15 4.25 0 6.75 4.75 6.75 4.75s-.6 1.15-1.7 2.35"/>',
	filter: '<path d="M2 3.25h12M4.25 8h7.5M6.5 12.75h3"/>',
	check: '<path d="m3 8.5 3 3 7-7"/>',
	info: '<circle cx="8" cy="8" r="6.25"/><path d="M8 7.25v4M8 4.75v.01"/>',
	alert:
		'<path d="M8 1.75 14.75 13.5H1.25z"/><path d="M8 6v3.25M8 11.25v.01"/>',
	undo: '<path d="M5 3.25 2 6.25l3 3M2.25 6.25h7.5a4 4 0 0 1 0 8H6"/>',
	pencil: '<path d="M10.5 2.5 13.5 5.5 5.5 13.5H2.5v-3z"/>',
	trash: '<path d="M2.5 4h11M6 4V2.5h4V4M4 4l.75 9.5h6.5L12 4"/>',
	lock: '<rect x="3" y="7" width="10" height="7" rx="1.5"/><path d="M5.25 7V5a2.75 2.75 0 0 1 5.5 0v2"/>',
	linkExternal:
		'<path d="M9.75 2.25h4v4M13.5 2.5 7.75 8.25M12 9.25v3.5a1 1 0 0 1-1 1H3.25a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3.5"/>',
	beaker:
		'<path d="M5.5 1.75h5M6.5 1.75v4.1L2.95 12.1a1.25 1.25 0 0 0 1.09 1.9h7.92a1.25 1.25 0 0 0 1.09-1.9L9.5 5.85v-4.1M4.4 9.5h7.2"/>',
	stack:
		'<path d="M8 1.75 14.25 5 8 8.25 1.75 5z"/><path d="M1.75 8 8 11.25 14.25 8M1.75 11 8 14.25 14.25 11"/>',
	repo: '<path d="M3 12.5V3a1.25 1.25 0 0 1 1.25-1.25h8.75v9.5H4.25A1.25 1.25 0 0 0 3 12.5a1.25 1.25 0 0 0 1.25 1.25H6"/><path d="M8 11.25v4l1.25-.9 1.25.9v-4"/>',
	device:
		'<rect x="1.75" y="2.5" width="12.5" height="8.75" rx="1.25"/><path d="M5.5 13.75h5M8 11.25v2.5"/>',
	checkCircle:
		'<circle cx="8" cy="8" r="6.25"/><path d="m5.5 8.25 1.75 1.75 3.25-3.5"/>',
};

export type IconName = keyof typeof ICONS;

export const escapeHtml = (value: unknown) =>
	String(value).replace(
		/[&<>"]/g,
		(character) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character] ??
			character,
	);

export const icon = (name: IconName, className = "") =>
	`<svg class="fh-icon ${className}" viewBox="0 0 16 16" aria-hidden="true" focusable="false">${ICONS[name]}</svg>`;

const LOGO_OUTLINE =
	"M13.75 2.75H6.5A1.75 1.75 0 0 0 4.75 4.5v15a1.75 1.75 0 0 0 1.75 1.75h11a1.75 1.75 0 0 0 1.75-1.75V8.25Z";

let logoSequence = 0;

export function logo(size = 20) {
	const id = `fh-logo-${++logoSequence}`;
	return `<svg class="fh-logo" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><mask id="${id}-top" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24"><rect width="24" height="10" fill="#fff"/></mask><mask id="${id}-bottom" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24"><rect y="15.5" width="24" height="8.5" fill="#fff"/></mask><g fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><g mask="url(#${id}-top)"><path d="${LOGO_OUTLINE}"/><path d="M13.75 2.75v5.5h5.5"/></g><path mask="url(#${id}-bottom)" d="${LOGO_OUTLINE}" stroke-dasharray="2 2.25"/></g><rect class="fh-logo-band" x="3" y="11" width="18" height="3.5" rx="1.25"/></svg>`;
}

export const logoTile = (tile = 48, mark = 28) =>
	`<span class="fh-logo-tile" style="--tile:${tile}px">${logo(mark)}</span>`;
