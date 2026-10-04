export type FileStatus = "modified" | "added" | "renamed";

export type DemoFile = {
	path: string;
	status: FileStatus;
	from: string | null;
};

const file = (
	path: string,
	status: FileStatus = "modified",
	from: string | null = null,
): DemoFile => ({ path, status, from });

export const DEMO_PULL_REQUEST = "ribeirogab/github-file-hider-demo#1";

export const EXPANDED_FILE = "docs/payments.md";

export const DEMO_FILES: readonly DemoFile[] = [
	file("README.md"),
	file("docs/payments.md"),
	file("docs/release notes.md", "added"),
	file("e2e/checkout.spec.ts"),
	file("examples/node/package-lock.json"),
	file("package.json"),
	file("pnpm-lock.yaml"),
	file("src/__tests__/checkout.ts"),
	file("src/components/Button.spec.tsx"),
	file("src/components/Button.tsx"),
	file("src/components/CheckoutForm.test.tsx"),
	file("src/components/CheckoutForm.tsx"),
	file("src/config.ts"),
	file("src/generated/client.ts"),
	file("src/legacy/old-checkout.spec.ts"),
	file("src/payments/__tests__/gateway.ts"),
	file("src/payments/checkout.spec.ts"),
	file("src/payments/checkout.ts"),
	file("src/payments/gateway.ts"),
	file("src/payments/retry-policy.spec.ts", "added"),
	file("src/payments/retry-policy.ts", "added"),
	file("src/test-utils.ts"),
	file(
		"src/utils/format-helpers.ts",
		"renamed",
		"src/__tests__/format-helpers.ts",
	),
	file("src/utils/format.test.ts"),
	file("src/utils/format.ts"),
];

export type DiffLine = {
	kind: "context" | "add" | "del";
	oldNumber: number | null;
	newNumber: number | null;
	text: string;
};

const line = (
	kind: DiffLine["kind"],
	oldNumber: number | null,
	newNumber: number | null,
	text: string,
): DiffLine => ({ kind, oldNumber, newNumber, text });

export const PAYMENTS_HUNK = "@@ -1,5 +1,13 @@";

export const PAYMENTS_DIFF: readonly DiffLine[] = [
	line(
		"context",
		1,
		1,
		"The checkout flow charges the customer when the order is confirmed.",
	),
	line("context", 2, 2, ""),
	line(
		"del",
		3,
		null,
		"Failed charges are reported to the customer immediately.",
	),
	line(
		"add",
		null,
		3,
		"Failed charges are retried with exponential backoff before the",
	),
	line("add", null, 4, "customer sees an error."),
	line("add", null, 5, ""),
	line("add", null, 6, "## Retry policy"),
	line("add", null, 7, ""),
	line("add", null, 8, "| Attempt | Delay |"),
	line("add", null, 9, "| ------- | ----- |"),
	line("add", null, 10, "| 1       | 250ms |"),
	line("add", null, 11, "| 2       | 1s    |"),
	line("context", 4, 12, ""),
];
