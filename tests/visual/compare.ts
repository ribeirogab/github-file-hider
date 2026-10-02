import { mkdir, writeFile } from "node:fs/promises";
import { PNG } from "pngjs";

export type Comparison = {
	different: number;
	total: number;
	sizeMatches: boolean;
};

export function comparePng(actual: Buffer, expected: Buffer) {
	const a = PNG.sync.read(actual);
	const b = PNG.sync.read(expected);
	const sizeMatches = a.width === b.width && a.height === b.height;
	const width = Math.max(a.width, b.width);
	const height = Math.max(a.height, b.height);
	const diff = new PNG({ width, height });
	let different = 0;
	for (let y = 0; y < height; y++)
		for (let x = 0; x < width; x++) {
			const index = (y * width + x) * 4;
			const inA = x < a.width && y < a.height;
			const inB = x < b.width && y < b.height;
			const ia = (y * a.width + x) * 4;
			const ib = (y * b.width + x) * 4;
			const same =
				inA &&
				inB &&
				a.data[ia] === b.data[ib] &&
				a.data[ia + 1] === b.data[ib + 1] &&
				a.data[ia + 2] === b.data[ib + 2] &&
				a.data[ia + 3] === b.data[ib + 3];
			if (!same) different++;
			const gray = inB
				? Math.round(
						((b.data[ib] ?? 0) +
							(b.data[ib + 1] ?? 0) +
							(b.data[ib + 2] ?? 0)) /
							3,
					)
				: 0;
			diff.data[index] = same ? gray : 255;
			diff.data[index + 1] = same ? gray : 0;
			diff.data[index + 2] = same ? gray : 255;
			diff.data[index + 3] = same ? 64 : 255;
		}
	return {
		result: { different, total: width * height, sizeMatches } as Comparison,
		diff: PNG.sync.write(diff),
	};
}

export function sideBySide(left: Buffer, right: Buffer) {
	const a = PNG.sync.read(left);
	const b = PNG.sync.read(right);
	const gap = 16;
	const out = new PNG({
		width: a.width + b.width + gap,
		height: Math.max(a.height, b.height),
	});
	out.data.fill(255);
	PNG.bitblt(a, out, 0, 0, a.width, a.height, 0, 0);
	PNG.bitblt(b, out, 0, 0, b.width, b.height, a.width + gap, 0);
	return PNG.sync.write(out);
}

export async function writeResult(name: string, files: Record<string, Buffer>) {
	const directory = `tests/visual/results/${name}`;
	await mkdir(directory, { recursive: true });
	for (const [file, data] of Object.entries(files))
		await writeFile(`${directory}/${file}`, data);
}
