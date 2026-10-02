import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { gzipSync } from "node:zlib";

const OUTPUT_DIRECTORY = "tests/fixtures/github";
const REDACTED = "REDACTED";
const SECRET = "token|csrf|nonce|hmac|secret|session";

const redactHiddenInput = (tag) =>
	/type="hidden"/i.test(tag)
		? tag.replace(/\bvalue="[^"]*"/i, `value="${REDACTED}"`)
		: tag;

const RULES = [
	[/<script\b(?![^>]*type="application\/json")[^>]*>[\s\S]*?<\/script>/gi, ""],
	[/<input\b[^>]*>/gi, redactHiddenInput],
	[
		new RegExp(`(\\s[\\w-]*(?:${SECRET})[\\w-]*=")[^"]*(")`, "gi"),
		`$1${REDACTED}$2`,
	],
	[
		new RegExp(`("[\\w-]*(?:${SECRET}|email)[\\w-]*"\\s*:\\s*)"[^"]*"`, "gi"),
		`$1"${REDACTED}"`,
	],
	[
		new RegExp(
			`(&quot;[\\w-]*(?:${SECRET}|email)[\\w-]*&quot;:)&quot;.*?&quot;`,
			"gi",
		),
		`$1&quot;${REDACTED}&quot;`,
	],
];

const LEAKS = [
	/gh[opsu]_[A-Za-z0-9]{20,}/,
	/github_pat_/,
	/_gh_sess/,
	/user_session/,
	/<input\b(?=[^>]*type="hidden")(?![^>]*value="REDACTED")[^>]*\bvalue="[^"]+"/i,
	/\bnonce="(?!REDACTED)/,
];

function sanitize(html) {
	return RULES.reduce(
		(result, [pattern, replacement]) => result.replace(pattern, replacement),
		html,
	);
}

function findLeaks(html) {
	return LEAKS.filter((pattern) => pattern.test(html)).map(String);
}

mkdirSync(OUTPUT_DIRECTORY, { recursive: true });

let failed = false;
for (const input of process.argv.slice(2)) {
	const html = sanitize(readFileSync(input, "utf8"));
	const leaks = findLeaks(html);
	if (leaks.length > 0) {
		failed = true;
		console.error(`${input}: possible secrets remain: ${leaks.join(", ")}`);
		continue;
	}
	const output = join(OUTPUT_DIRECTORY, `${basename(input)}.gz`);
	const compressed = gzipSync(html, { level: 9 });
	writeFileSync(output, compressed);
	console.log(
		`${output}: ${html.length} bytes, ${compressed.length} compressed`,
	);
}

if (failed) process.exitCode = 1;
