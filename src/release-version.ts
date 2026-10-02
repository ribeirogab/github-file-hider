export function releaseVersion(date: Date, tags: string[]) {
	const day = date.toISOString().slice(0, 10).replaceAll("-", ".");
	const counters = tags
		.map((tag) =>
			new RegExp(`^v${day.replaceAll(".", "\\.")}\\.(\\d+)$`).exec(tag),
		)
		.filter((match) => match !== null)
		.map((match) => Number(match[1]));
	const counter = Math.max(0, ...counters) + 1;
	if (counter > 65535)
		throw new Error(
			"The daily release counter exceeds the Chrome version limit.",
		);
	const versionName = `${day}.${counter}`;
	const version = versionName.split(".").map(Number).join(".");
	const components = version.split(".").map(Number);
	for (const tag of tags) {
		if (!/^v\d{4}\.\d{2}\.\d{2}\.\d+$/.test(tag)) continue;
		const previous = tag.slice(1).split(".").map(Number);
		const difference =
			components.map((n, i) => n - (previous[i] ?? 0)).find((n) => n !== 0) ??
			0;
		if (difference <= 0)
			throw new Error(
				"The UTC release version must be greater than every published version.",
			);
	}
	return { version, versionName };
}
