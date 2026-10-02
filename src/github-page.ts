export function toolbarAnchor(): Element | null {
	const toolbar = document.querySelector("[data-file-tree-expanded]");
	return (
		toolbar?.querySelector(
			'[data-direction="horizontal"][data-justify="start"]',
		) ?? null
	);
}
