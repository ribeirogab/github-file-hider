globalThis.captureFixture = (name) => {
	const REDACTED = "REDACTED";
	const SECRET_NAME =
		/csrf|token|hmac|nonce|secret|session|octolytics|analytics|visitor|request-id|user-id|browser-stats|browser-errors/i;
	const SECRET_JSON =
		/("[\w-]*(?:token|csrf|nonce|hmac|secret|session|email)[\w-]*"\s*:\s*)"[^"]*"/gi;
	const SECRET_ESCAPED_JSON =
		/(&quot;[\w-]*(?:token|csrf|nonce|hmac|secret|session|email)[\w-]*&quot;:)&quot;.*?&quot;/gi;

	document.getElementById("fh-capture-link")?.remove();
	const root = document.documentElement.cloneNode(true);

	for (const script of root.querySelectorAll("script")) {
		if (script.type === "application/json")
			script.textContent = script.textContent.replace(
				SECRET_JSON,
				`$1"${REDACTED}"`,
			);
		else script.remove();
	}

	for (const link of root.querySelectorAll("link")) {
		if (link.rel !== "stylesheet") link.remove();
	}

	for (const meta of root.querySelectorAll("meta")) {
		const key =
			meta.getAttribute("name") ||
			meta.getAttribute("http-equiv") ||
			meta.getAttribute("property") ||
			"";
		if (SECRET_NAME.test(key)) meta.setAttribute("content", REDACTED);
	}

	for (const input of root.querySelectorAll('input[type="hidden"]'))
		input.setAttribute("value", REDACTED);

	for (const element of root.querySelectorAll("*")) {
		for (const attribute of [...element.attributes]) {
			if (SECRET_NAME.test(attribute.name))
				element.setAttribute(attribute.name, REDACTED);
		}
	}

	root.setAttribute("data-fixture-url", location.href);
	root.setAttribute("data-fixture-captured-at", new Date().toISOString());

	const html = `<!DOCTYPE html>\n${root.outerHTML.replace(SECRET_ESCAPED_JSON, `$1&quot;${REDACTED}&quot;`)}`;
	const link = document.createElement("a");
	link.id = "fh-capture-link";
	link.textContent = `Download ${name}.html`;
	link.href = URL.createObjectURL(new Blob([html], { type: "text/html" }));
	link.download = `${name}.html`;
	Object.assign(link.style, {
		position: "fixed",
		top: "16px",
		left: "16px",
		zIndex: "2147483647",
		padding: "12px 16px",
		background: "#ffd33d",
		color: "#1f2328",
		font: "600 16px system-ui",
	});
	link.addEventListener("click", () => setTimeout(() => link.remove(), 1000));
	document.body.append(link);
	return { name, bytes: html.length };
};
