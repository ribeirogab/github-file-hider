(() => {
	const bus = new EventTarget();
	let current = null;
	let cfg = null;

	function toast(message) {
		let el = document.querySelector(".proto-toast");
		if (!el) {
			el = document.createElement("div");
			el.className = "proto-toast";
			document.body.appendChild(el);
		}
		el.textContent = message;
		el.classList.add("show");
		clearTimeout(el._t);
		el._t = setTimeout(() => el.classList.remove("show"), 1800);
	}

	function go(id) {
		current = id;
		for (const s of document.querySelectorAll("[data-proto-screen]"))
			s.classList.toggle("proto-active", s.dataset.protoScreen === id);
		for (const b of document.querySelectorAll("[data-proto-go]"))
			b.setAttribute("aria-pressed", String(b.dataset.protoGo === id));
		try {
			localStorage.setItem(`fh-proto-screen:${cfg.id}`, id);
		} catch {}
		document.body.dataset.protoCurrent = id;
		window.scrollTo(0, 0);
		bus.dispatchEvent(new CustomEvent("screen", { detail: { screen: id } }));
	}

	function setTheme(theme) {
		window.GH ? GH.setTheme(theme) : (document.documentElement.dataset.ghTheme = theme);
		for (const b of document.querySelectorAll("[data-proto-theme]"))
			b.setAttribute("aria-pressed", String(b.dataset.protoTheme === theme));
		try {
			localStorage.setItem(`fh-proto-theme:${cfg.id}`, theme);
		} catch {}
	}

	function withParams(pr) {
		const u = new URL(location.href);
		u.hash = "";
		if (pr) u.searchParams.set("pr", pr);
		return u.toString();
	}

	const SCENARIOS = [
		{ label: "Page" },
		{ id: "load-more", text: "Load more files", hint: "lazy load" },
		{ id: "link-file", text: "Open direct link to a hidden file", hint: "#diff-…" },
		{ id: "link-comment", text: "Open link to a comment in a hidden file", hint: "#discussion_r…" },
		{ id: "reload", text: "Reload this pull request", hint: "⟳" },
		{ id: "other-pr", text: "", hint: "" },
		{ sep: true },
		{ label: "Settings" },
		{ id: "mode", text: "", hint: "" },
		{ id: "demo", text: "Load demo configuration", hint: "Tests + Lockfiles on" },
		{ id: "first-install", text: "Reset to first install", hint: "all off" },
	];

	function runScenario(id) {
		const GH = window.GH;
		const FH = window.FH;
		if (id === "load-more") {
			if (!GH) return;
			GH.loadMore().then((p) => toast(p.length ? `Loaded ${p.length} more files` : "All files are loaded"));
		}
		if (id === "link-file" || id === "link-comment") {
			if (cfg.screens.some((s) => s.id === "github")) go("github");
			const target = id === "link-file" ? GH.idFor("src/components/CheckoutForm.test.tsx") : "discussion_r1842";
			if (location.hash === `#${target}`) history.replaceState(null, "", location.pathname + location.search);
			setTimeout(() => {
				location.hash = target;
			}, 60);
		}
		if (id === "reload") location.replace(withParams());
		if (id === "other-pr") location.href = withParams(GH && GH.prNumber === 482 ? 483 : 482);
		if (id === "mode" && FH) {
			const next = FH.state.mode === "manual" ? "automatic" : "manual";
			FH.setMode(next);
			toast(`Activation mode: ${next}`);
		}
		if (id === "demo" && FH) {
			FH.loadDemo();
			toast("Demo configuration loaded");
		}
		if (id === "first-install" && FH) {
			FH.resetToFirstInstall();
			toast("First-install defaults restored");
		}
		bus.dispatchEvent(new CustomEvent("scenario", { detail: { id } }));
	}

	function refreshMenu(menu) {
		const GH = window.GH;
		const FH = window.FH;
		const other = menu.querySelector('[data-scenario="other-pr"]');
		if (other && GH) {
			const n = GH.prNumber === 482 ? 483 : 482;
			other.innerHTML = `Open pull request #${n}<small>new PR</small>`;
		}
		const mode = menu.querySelector('[data-scenario="mode"]');
		if (mode && FH)
			mode.innerHTML = `Switch to ${FH.state.mode === "manual" ? "automatic" : "manual"} mode<small>now: ${FH.state.mode}</small>`;
	}

	function init(options) {
		cfg = { defaultTheme: "light", ...options };
		const bar = document.createElement("div");
		bar.className = "proto-bar";
		const screens = cfg.screens
			.map((s) => `<button data-proto-go="${s.id}" aria-pressed="false">${s.label}</button>`)
			.join("");
		const items = SCENARIOS.map((s) => {
			if (s.sep) return "<hr>";
			if (s.label) return `<div class="label">${s.label}</div>`;
			return `<button data-scenario="${s.id}">${s.text}<small>${s.hint}</small></button>`;
		}).join("");
		bar.innerHTML = `
			<span class="proto-tag">PROTOTYPE</span>
			<span class="proto-title">GitHub File Hider <span>/</span> ${cfg.title}</span>
			<span class="proto-seg">${screens}</span>
			<span class="proto-spacer"></span>
			<span class="proto-seg" title="GitHub theme"><button data-proto-theme="light">Light</button><button data-proto-theme="dark">Dark</button></span>
			<div class="proto-menu"><button type="button">Scenarios ▾</button><div class="proto-menu-list">${items}</div></div>`;
		document.body.prepend(bar);
		const menu = bar.querySelector(".proto-menu");
		menu.querySelector(":scope > button").addEventListener("click", () => {
			refreshMenu(menu);
			menu.classList.toggle("open");
		});
		document.addEventListener("click", (e) => {
			if (!menu.contains(e.target)) menu.classList.remove("open");
		});
		bar.addEventListener("click", (e) => {
			const s = e.target.closest("[data-scenario]");
			if (s) {
				menu.classList.remove("open");
				runScenario(s.dataset.scenario);
			}
			const g = e.target.closest("[data-proto-go]");
			if (g) go(g.dataset.protoGo);
			const t = e.target.closest("[data-proto-theme]");
			if (t) setTheme(t.dataset.protoTheme);
		});
		let theme = cfg.defaultTheme;
		let screen = cfg.defaultScreen || cfg.screens[0].id;
		try {
			theme = localStorage.getItem(`fh-proto-theme:${cfg.id}`) || theme;
			const saved = localStorage.getItem(`fh-proto-screen:${cfg.id}`);
			if (saved && cfg.screens.some((s) => s.id === saved)) screen = saved;
		} catch {}
		const param = new URLSearchParams(location.search).get("screen");
		if (param && cfg.screens.some((s) => s.id === param)) screen = param;
		setTheme(theme);
		go(screen);
	}

	window.Proto = {
		init,
		go,
		toast,
		setTheme,
		run: runScenario,
		get screen() {
			return current;
		},
		on(type, cb) {
			bus.addEventListener(type, (e) => cb(e.detail));
		},
	};
})();
