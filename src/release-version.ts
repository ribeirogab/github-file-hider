export type ReleaseVersion = { version: string; versionName: string };

const TAG = /^v(\d{4})\.(\d{2})\.(\d{2})\.(\d+)$/;

const compare = (a: number[], b: number[]) =>
	a.map((value, index) => value - (b[index] ?? 0)).find((n) => n !== 0) ?? 0;

export function releaseVersion(
	date: Date,
	tags: readonly string[],
): ReleaseVersion {
	const day = date.toISOString().slice(0, 10).replaceAll("-", ".");
	const published = tags.flatMap((tag) => {
		const match = TAG.exec(tag);
		return match ? [match.slice(1).map(Number)] : [];
	});
	const counter =
		Math.max(
			0,
			...published
				.filter(
					(parts) =>
						parts.slice(0, 3).join(".") ===
						day.split(".").map(Number).join("."),
				)
				.map((parts) => parts[3] ?? 0),
		) + 1;
	if (counter > 65535)
		throw new Error(
			"The daily release counter exceeds the Chrome version limit.",
		);
	const versionName = `${day}.${counter}`;
	const components = versionName.split(".").map(Number);
	if (published.some((parts) => compare(components, parts) <= 0))
		throw new Error(
			"The UTC release version must be greater than every published version.",
		);
	return { version: components.join("."), versionName };
}
