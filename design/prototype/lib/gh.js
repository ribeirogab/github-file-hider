(() => {
	const ICONS = {
		menu: '<path d="M2.5 4h11M2.5 8h11M2.5 12h11"/>',
		search: '<circle cx="7" cy="7" r="4.25"/><path d="M10.25 10.25 13.5 13.5"/>',
		plus: '<path d="M8 3v10M3 8h10"/>',
		chevronDown: '<path d="m4.5 6.25 3.5 3.5 3.5-3.5"/>',
		chevronRight: '<path d="m6.25 4.5 3.5 3.5-3.5 3.5"/>',
		chevronUp: '<path d="m4.5 9.75 3.5-3.5 3.5 3.5"/>',
		caret: '<path d="M4.5 6.5h7L8 10z" fill="currentColor" stroke="none"/>',
		code: '<path d="M5.25 4.25 1.75 8l3.5 3.75M10.75 4.25 14.25 8l-3.5 3.75"/>',
		issue: '<circle cx="8" cy="8" r="6"/><circle cx="8" cy="8" r="1" fill="currentColor"/>',
		pull: '<circle cx="4" cy="3.75" r="1.75"/><circle cx="4" cy="12.25" r="1.75"/><circle cx="12" cy="12.25" r="1.75"/><path d="M4 5.5v5M12 10.5V6.75a2 2 0 0 0-2-2H7.5M9 3.25 7.5 4.75 9 6.25"/>',
		play: '<circle cx="8" cy="8" r="6"/><path d="M6.75 5.75v4.5L10.25 8z" fill="currentColor"/>',
		table: '<rect x="2" y="2.5" width="12" height="11" rx="1.5"/><path d="M2 6h12M6.5 6v7.5"/>',
		shield: '<path d="M8 1.75 2.75 3.5v4c0 3.25 2.25 5.5 5.25 6.75 3-1.25 5.25-3.5 5.25-6.75v-4z"/>',
		graph: '<path d="M2 2v12h12M5 10l3-3 2 2 3.5-4"/>',
		bell: '<path d="M4 11.5V7a4 4 0 0 1 8 0v4.5l1.25 1.25H2.75zM6.5 14h3"/>',
		inbox: '<path d="M2 9.5 3.75 3h8.5L14 9.5V13H2zM2 9.5h3.5l1 1.5h3l1-1.5H14"/>',
		comment: '<path d="M2.5 3.5h11v7.5H8l-3 2.5V11H2.5z"/>',
		conversation: '<path d="M1.75 2.75h9v6h-4.5L4 10.75v-2H1.75zM12.25 5.75h2v6h-1.5v1.75l-2.25-1.75H7"/>',
		commit: '<circle cx="8" cy="8" r="2.75"/><path d="M1.5 8h3.75M10.75 8h3.75"/>',
		checks: '<path d="M2 4.25 3.5 5.75 6 3.25M2 10.25l1.5 1.5L6 9.25M8.5 4.5h5.5M8.5 10.5h5.5"/>',
		fileDiff: '<path d="M3.5 1.75h6l3 3v9.5h-9zM9.5 1.75v3h3M8 6.5v4M6 8.5h4M6 12.25h4"/>',
		sidebar: '<rect x="1.75" y="2.75" width="12.5" height="10.5" rx="1.5"/><path d="M6 2.75v10.5"/>',
		gear: '<circle cx="8" cy="8" r="5" stroke-dasharray="2.1 1.83" stroke-width="2.6" stroke-linecap="butt"/><circle cx="8" cy="8" r="2"/>',
		copy: '<rect x="5.25" y="5.25" width="8.5" height="8.5" rx="1.5"/><path d="M10.75 5.25v-2a1 1 0 0 0-1-1h-6.5a1 1 0 0 0-1 1v6.5a1 1 0 0 0 1 1h2"/>',
		kebab: '<circle cx="3.5" cy="8" r="1.1" fill="currentColor" stroke="none"/><circle cx="8" cy="8" r="1.1" fill="currentColor" stroke="none"/><circle cx="12.5" cy="8" r="1.1" fill="currentColor" stroke="none"/>',
		file: '<path d="M3.75 1.75h5.5l3 3v9.5h-8.5zM9.25 1.75v3h3"/>',
		folder: '<path d="M1.5 3.5c0-.55.45-1 1-1h3.3l1.5 1.5h6.2c.55 0 1 .45 1 1v7.5c0 .55-.45 1-1 1h-11c-.55 0-1-.45-1-1z"/>',
		eye: '<path d="M1.25 8S3.75 3.25 8 3.25 14.75 8 14.75 8 12.25 12.75 8 12.75 1.25 8 1.25 8z"/><circle cx="8" cy="8" r="2.25"/>',
		eyeOff: '<path d="M2 2l12 12M6.4 6.45A2.25 2.25 0 0 0 9.55 9.6M4.1 4.6C2.3 5.85 1.25 8 1.25 8S3.75 12.75 8 12.75c1.35 0 2.5-.45 3.5-1.1M6.6 3.4c.45-.1.9-.15 1.4-.15 4.25 0 6.75 4.75 6.75 4.75s-.6 1.15-1.7 2.35"/>',
		filter: '<path d="M2 3.25h12M4.25 8h7.5M6.5 12.75h3"/>',
		sliders: '<path d="M2 4.5h7M12 4.5h2M2 11.5h2M7 11.5h7"/><circle cx="10.5" cy="4.5" r="1.5"/><circle cx="5.5" cy="11.5" r="1.5"/>',
		x: '<path d="m4 4 8 8M12 4l-8 8"/>',
		check: '<path d="m3 8.5 3 3 7-7"/>',
		info: '<circle cx="8" cy="8" r="6.25"/><path d="M8 7.25v4M8 4.75v.01"/>',
		alert: '<path d="M8 1.75 14.75 13.5H1.25z"/><path d="M8 6v3.25M8 11.25v.01"/>',
		undo: '<path d="M5 3.25 2 6.25l3 3M2.25 6.25h7.5a4 4 0 0 1 0 8H6"/>',
		link: '<path d="M7 9a3 3 0 0 0 4.24 0l2-2a3 3 0 0 0-4.24-4.24l-.75.75M9 7a3 3 0 0 0-4.24 0l-2 2A3 3 0 0 0 7 13.24l.75-.75"/>',
		keyboard: '<rect x="1.25" y="3.75" width="13.5" height="8.5" rx="1.5"/><path d="M4 6.5h.01M6.5 6.5h.01M9 6.5h.01M11.5 6.5h.01M4.75 9.5h6.5"/>',
		pencil: '<path d="M10.5 2.5 13.5 5.5 5.5 13.5H2.5v-3z"/>',
		trash: '<path d="M2.5 4h11M6 4V2.5h4V4M4 4l.75 9.5h6.5L12 4"/>',
		grabber: '<circle cx="6" cy="4" r=".9" fill="currentColor" stroke="none"/><circle cx="10" cy="4" r=".9" fill="currentColor" stroke="none"/><circle cx="6" cy="8" r=".9" fill="currentColor" stroke="none"/><circle cx="10" cy="8" r=".9" fill="currentColor" stroke="none"/><circle cx="6" cy="12" r=".9" fill="currentColor" stroke="none"/><circle cx="10" cy="12" r=".9" fill="currentColor" stroke="none"/>',
		lock: '<rect x="3" y="7" width="10" height="7" rx="1.5"/><path d="M5.25 7V5a2.75 2.75 0 0 1 5.5 0v2"/>',
		pin: '<path d="M9.5 1.75 14.25 6.5l-2 .75-2.5 2.5.25 3-1.5 1.5-6.25-6.25 1.5-1.5 3 .25 2.5-2.5z"/><path d="M2 14l3-3"/>',
		sparkle: '<path d="M8 1.75c.4 3.1 1.15 3.85 4.25 4.25C9.15 6.4 8.4 7.15 8 10.25 7.6 7.15 6.85 6.4 3.75 6 6.85 5.6 7.6 4.85 8 1.75zM12.5 10.5c.2 1.4.6 1.8 2 2-1.4.2-1.8.6-2 2-.2-1.4-.6-1.8-2-2 1.4-.2 1.8-.6 2-2z"/>',
	};

	function icon(name, cls = "") {
		return `<svg class="gh-icon ${cls}" viewBox="0 0 16 16" aria-hidden="true">${ICONS[name] || ""}</svg>`;
	}

	const esc = (s) =>
		String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

	function hashPath(path) {
		let h = 0x811c9dc5;
		for (let i = 0; i < path.length; i++) {
			h ^= path.charCodeAt(i);
			h = Math.imul(h, 0x01000193);
		}
		return (h >>> 0).toString(16).padStart(8, "0");
	}

	const idFor = (path) => `diff-${hashPath(path)}`;

	const TS_RE =
		/(\/\/.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(<\/?[A-Z][\w.]*)|\b(import|from|export|const|let|var|function|return|async|await|if|else|try|catch|finally|throw|for|new|type|interface|as|typeof|instanceof|extends|default|of|in)\b|\b(true|false|null|undefined|\d[\d_]*(?:\.\d+)?)\b|([A-Za-z_$][\w$]*)(?=\s*\()/g;
	const JSON_RE = /("(?:[^"\\]|\\.)*")(\s*:)?|\b(true|false|null|\d+(?:\.\d+)?)\b/g;
	const YAML_RE = /^(\s*-?\s*)([\w'@/.\-^]+)(?=:)|('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")|\b(\d+(?:\.\d+)*)\b/g;
	const MD_RE = /^(#+ .*)$|(`[^`]*`)/g;

	function highlight(text, lang) {
		if (lang === "plain") return esc(text);
		let out = "";
		let last = 0;
		const re = { ts: TS_RE, json: JSON_RE, yaml: YAML_RE, md: MD_RE }[lang];
		re.lastIndex = 0;
		let m = re.exec(text);
		while (m) {
			if (m[0] === "") {
				re.lastIndex++;
				m = re.exec(text);
				continue;
			}
			out += esc(text.slice(last, m.index));
			if (lang === "ts") {
				const cls = m[1] ? "m" : m[2] ? "s" : m[3] ? "c" : m[4] ? "k" : m[5] ? "c" : "e";
				out += `<span class="syn-${cls}">${esc(m[0])}</span>`;
			} else if (lang === "json") {
				if (m[1]) out += `<span class="syn-${m[2] ? "c" : "s"}">${esc(m[1])}</span>${esc(m[2] || "")}`;
				else out += `<span class="syn-c">${esc(m[0])}</span>`;
			} else if (lang === "yaml") {
				if (m[2]) out += `${esc(m[1])}<span class="syn-t">${esc(m[2])}</span>`;
				else out += `<span class="syn-${m[3] ? "s" : "c"}">${esc(m[0])}</span>`;
			} else {
				out += `<span class="syn-${m[1] ? "c" : "s"}">${esc(m[0])}</span>`;
			}
			last = m.index + m[0].length;
			m = re.exec(text);
		}
		return out + esc(text.slice(last));
	}

	function langFor(path) {
		const ext = path.split(".").pop();
		if (["ts", "tsx", "js", "jsx"].includes(ext)) return "ts";
		if (ext === "json") return "json";
		if (["yaml", "yml"].includes(ext)) return "yaml";
		if (ext === "md") return "md";
		return "plain";
	}

	function statFor(file) {
		if (file.stat) return file.stat;
		let add = 0;
		let del = 0;
		for (const h of file.hunks)
			for (const l of h.lines) {
				if (l[0] === "+") add++;
				if (l[0] === "-") del++;
			}
		return { add, del };
	}

	function blocksFor({ add, del }) {
		const total = add + del;
		let a = total ? Math.round((add / total) * 5) : 0;
		let d = total ? 5 - a : 0;
		if (add && !a) {
			a = 1;
			d = 4;
		}
		if (del && !d) {
			d = 1;
			a = 4;
		}
		return `<span class="gh-blocks">${"<i class='a'></i>".repeat(a)}${"<i class='d'></i>".repeat(d)}${"<i></i>".repeat(5 - a - d)}</span>`;
	}

	function buildTree(paths) {
		const root = { name: "", path: "", dirs: new Map(), files: [] };
		for (const p of paths) {
			const parts = p.split("/");
			let node = root;
			for (let i = 0; i < parts.length - 1; i++) {
				const key = parts[i];
				if (!node.dirs.has(key))
					node.dirs.set(key, {
						name: key,
						path: parts.slice(0, i + 1).join("/"),
						dirs: new Map(),
						files: [],
					});
				node = node.dirs.get(key);
			}
			node.files.push(p);
		}
		const compact = (node) => {
			for (const [key, child] of node.dirs) {
				let c = child;
				while (c.dirs.size === 1 && c.files.length === 0) {
					const only = [...c.dirs.values()][0];
					c = { ...only, name: `${c.name}/${only.name}` };
				}
				node.dirs.set(key, c);
				compact(c);
			}
		};
		compact(root);
		return root;
	}

	const byName = (a, b) => (a.toLowerCase() < b.toLowerCase() ? -1 : 1);

	function orderedPaths(node, out = []) {
		const dirs = [...node.dirs.values()].sort((a, b) => byName(a.name, b.name));
		for (const d of dirs) orderedPaths(d, out);
		out.push(...[...node.files].sort((a, b) => byName(a.split("/").pop(), b.split("/").pop())));
		return out;
	}

	function treeHtml(node, depth) {
		const dirs = [...node.dirs.values()].sort((a, b) => byName(a.name, b.name));
		const files = [...node.files].sort((a, b) => byName(a.split("/").pop(), b.split("/").pop()));
		let html = "";
		const pad = (d) => `style="padding-left:${8 + d * 16}px"`;
		for (const d of dirs) {
			html += `<li class="gh-tree-dir" data-dir="${esc(d.path)}"><div class="gh-tree-row" ${pad(depth)}>${icon("chevronDown", "chev")}<svg class="gh-icon folder" viewBox="0 0 16 16">${ICONS.folder}</svg><span class="name">${esc(d.name)}</span></div><ul>${treeHtml(d, depth + 1)}</ul></li>`;
		}
		for (const f of files) {
			const file = byPath.get(f);
			html += `<li class="gh-tree-file" data-path="${esc(f)}"><div class="gh-tree-row" ${pad(depth)} title="${esc(f)}"><span style="width:16px;flex:none"></span>${icon("file")}<span class="name">${esc(f.split("/").pop())}</span><span class="gh-status ${file.status}" title="${file.status}"></span></div></li>`;
		}
		return html;
	}

	function diffHtml(file) {
		const lang = langFor(file.path);
		let rows = "";
		for (const h of file.hunks) {
			let oldN = h.old;
			let newN = h.new;
			const oldCount = h.lines.filter((l) => l[0] !== "+").length;
			const newCount = h.lines.filter((l) => l[0] !== "-").length;
			const header = `@@ -${h.old},${oldCount} +${h.new},${newCount} @@${h.context ? ` ${h.context}` : ""}`;
			rows += `<tr class="hunk"><td class="ln" colspan="2">${icon("chevronUp")}</td><td class="code">${esc(header)}</td></tr>`;
			h.lines.forEach((line, i) => {
				const kind = line[0] === "+" ? "add" : line[0] === "-" ? "del" : "ctx";
				const text = line.slice(1);
				const o = kind === "add" ? "" : oldN++;
				const n = kind === "del" ? "" : newN++;
				rows += `<tr class="${kind}"><td class="ln">${o}</td><td class="ln">${n}</td><td class="code">${highlight(text, lang)}</td></tr>`;
				if (h.comment && h.comment.after === i) rows += commentHtml(h.comment.id);
			});
		}
		return `<table class="gh-diff"><tbody>${rows}</tbody></table>`;
	}

	function avatarColor(name) {
		const colors = ["#bf3989", "#0969da", "#1a7f37", "#9a6700", "#8250df", "#cf222e", "#116329"];
		return colors[Number.parseInt(hashPath(name).slice(0, 4), 16) % colors.length];
	}

	function avatar(name, cls = "") {
		return `<span class="gh-avatar ${cls}" style="background:${avatarColor(name)}">${esc(name.slice(0, 1).toUpperCase())}</span>`;
	}

	function commentHtml(id) {
		const c = window.GH_DATA.comments[id];
		return `<tr class="comment"><td colspan="3" class="gh-comment-cell"><div class="gh-comment" id="${id}"><div class="gh-comment-head">${avatar(c.author, "sm")}<b>${esc(c.author)}</b><span class="age">${esc(c.age)}</span></div><div class="gh-comment-body">${esc(c.body)}</div><div class="gh-comment-reply"><span>Reply…</span></div></div></td></tr>`;
	}

	function fileHtml(file) {
		const st = statFor(file);
		return `<div class="gh-file" id="${idFor(file.path)}" data-path="${esc(file.path)}">
			<div class="gh-file-header">
				<button class="gh-file-collapse" title="Toggle diff contents">${icon("chevronDown")}</button>
				<span class="gh-file-stat">${st.add + st.del} ${blocksFor(st)}</span>
				<a class="gh-file-path" href="#${idFor(file.path)}" title="${esc(file.path)}">${esc(file.path)}</a>
				<button class="gh-file-collapse" title="Copy path">${icon("copy")}</button>
				<div class="gh-file-actions">
					<span data-gh-slot="file-actions"></span>
					<button class="gh-viewed"><span class="box"></span>Viewed</button>
					<button class="gh-file-collapse" title="Comment on this file">${icon("comment")}</button>
					<button class="gh-file-collapse" title="More options">${icon("kebab")}</button>
				</div>
			</div>
			<div class="gh-file-body">${diffHtml(file)}</div>
		</div>`;
	}

	const data = window.GH_DATA;
	const byPath = new Map(data.files.map((f) => [f.path, f]));
	const tree = buildTree(data.files.map((f) => f.path));
	const ordered = orderedPaths(tree);
	const params = new URLSearchParams(location.search);
	const prNumber = data.pulls[params.get("pr")] ? Number(params.get("pr")) : 482;
	const pr = data.pulls[prNumber];
	const INITIAL = 12;
	let loaded = 0;
	let loadingTimer = null;
	let root = null;

	function totals() {
		let add = 0;
		let del = 0;
		for (const f of data.files) {
			const s = statFor(f);
			add += s.add;
			del += s.del;
		}
		return { add, del };
	}

	function pageHtml() {
		const t = totals();
		return `
		<header class="gh-header">
			<div class="gh-header-top">
				<button class="gh-icon-btn">${icon("menu")}</button>
				<span class="gh-mark" aria-hidden="true"></span>
				<div class="gh-crumbs"><span class="owner">${data.repo.owner}</span><span class="sep">/</span><span>${data.repo.name}</span></div>
				<div class="gh-search">${icon("search")}<span>Type <kbd>/</kbd> to search</span></div>
				<button class="gh-icon-btn">${icon("plus")}</button>
				<button class="gh-icon-btn">${icon("issue")}</button>
				<button class="gh-icon-btn">${icon("pull")}</button>
				<button class="gh-icon-btn">${icon("inbox")}</button>
				${avatar("reviewer")}
			</div>
			<nav class="gh-repo-nav">
				<a href="#">${icon("code")}Code</a>
				<a href="#">${icon("issue")}Issues <span class="gh-counter">18</span></a>
				<a href="#" class="selected">${icon("pull")}Pull requests <span class="gh-counter">6</span></a>
				<a href="#">${icon("play")}Actions</a>
				<a href="#">${icon("table")}Projects</a>
				<a href="#">${icon("shield")}Security</a>
				<a href="#">${icon("graph")}Insights</a>
			</nav>
		</header>
		<main>
			<div class="gh-pr-head">
				<div class="gh-pr-title-row">
					<h1 class="gh-pr-title">${esc(pr.title)} <span class="num">#${prNumber}</span></h1>
					<span data-gh-slot="pr-actions"></span>
					<button class="gh-btn">Edit</button>
					<button class="gh-btn primary">${icon("code")}Code ${icon("caret")}</button>
				</div>
				<div class="gh-pr-meta">
					<span class="gh-state">${icon("pull")}Open</span>
					<span><b>${esc(pr.author)}</b> wants to merge ${pr.commits} commits into <span class="gh-branch">${esc(pr.base)}</span> from <span class="gh-branch">${esc(pr.head)}</span></span>
				</div>
				<nav class="gh-pr-tabs">
					<a href="#">${icon("conversation")}Conversation <span class="gh-counter">${pr.conversation}</span></a>
					<a href="#">${icon("commit")}Commits <span class="gh-counter">${pr.commits}</span></a>
					<a href="#">${icon("checks")}Checks <span class="gh-counter">${pr.checks}</span></a>
					<a href="#" class="selected">${icon("fileDiff")}Files changed <span class="gh-counter" data-gh-files-count>${data.files.length}</span></a>
					<span data-gh-slot="tabs-end"></span>
					<div class="gh-diffstat"><span class="add">+${t.add.toLocaleString("en-US")}</span><span class="del">−${t.del.toLocaleString("en-US")}</span>${blocksFor(t)}</div>
				</nav>
			</div>
			<div class="gh-toolbar">
				<div class="gh-toolbar-group">
					<button class="gh-file-collapse" data-gh-toggle-tree title="Toggle file tree">${icon("sidebar")}</button>
					<button class="gh-btn invisible sm">Changes from <b>all commits</b> ${icon("caret")}</button>
					<button class="gh-btn invisible sm">File filter ${icon("caret")}</button>
					<button class="gh-btn invisible sm">Conversations ${icon("caret")}</button>
					<button class="gh-btn invisible sm">${icon("gear")}${icon("caret")}</button>
				</div>
				<span data-gh-slot="toolbar-start"></span>
				<div class="gh-toolbar-end">
					<span data-gh-slot="toolbar-end"></span>
					<div class="gh-viewed-progress"><span data-gh-viewed>0 / ${data.files.length} files viewed</span><span class="bar"><i></i></span></div>
					<button class="gh-btn primary sm">Review changes ${icon("caret")}</button>
				</div>
			</div>
			<div class="gh-layout">
				<aside class="gh-sidebar">
					<span data-gh-slot="tree-top"></span>
					<label class="gh-tree-filter">${icon("search")}<input type="text" placeholder="Filter changed files" data-gh-tree-filter></label>
					<ul class="gh-tree" data-gh-tree>${treeHtml(tree, 0)}</ul>
					<span data-gh-slot="tree-bottom"></span>
				</aside>
				<section class="gh-diff-column" style="min-width:0">
					<span data-gh-slot="diff-top"></span>
					<div class="gh-files" id="gh-files"></div>
					<div class="gh-loading" data-gh-loading><span class="spinner"></span><span data-gh-loading-text></span></div>
					<span data-gh-slot="diff-bottom"></span>
				</section>
			</div>
		</main>`;
	}

	function appendFiles(paths, animate) {
		const container = root.querySelector("#gh-files");
		const frag = document.createElement("div");
		frag.innerHTML = paths.map((p) => fileHtml(byPath.get(p))).join("");
		const nodes = [...frag.children];
		for (const n of nodes) {
			if (animate) n.classList.add("just-loaded");
			container.appendChild(n);
		}
		loaded += paths.length;
		updateLoading();
		document.dispatchEvent(new CustomEvent("gh:files-added", { detail: { paths } }));
	}

	function updateLoading() {
		const el = root.querySelector("[data-gh-loading]");
		const remaining = ordered.length - loaded;
		el.style.display = remaining > 0 ? "" : "none";
		el.querySelector("[data-gh-loading-text]").textContent =
			`Loading ${remaining} more ${remaining === 1 ? "file" : "files"}…`;
	}

	function loadMore() {
		return new Promise((resolve) => {
			if (loaded >= ordered.length) return resolve([]);
			clearTimeout(loadingTimer);
			loadingTimer = setTimeout(() => {
				const next = ordered.slice(loaded);
				appendFiles(next, true);
				resolve(next);
			}, 650);
		});
	}

	function updateViewed() {
		const n = root.querySelectorAll(".gh-file.viewed").length;
		root.querySelector("[data-gh-viewed]").textContent = `${n} / ${data.files.length} files viewed`;
		root.querySelector(".gh-viewed-progress .bar i").style.width = `${(n / data.files.length) * 100}%`;
	}

	function fileEl(path) {
		return root.querySelector(`.gh-file[data-path="${CSS.escape(path)}"]`);
	}

	function treeEl(path) {
		return root.querySelector(`.gh-tree-file[data-path="${CSS.escape(path)}"]`);
	}

	async function scrollToFile(path) {
		if (!fileEl(path)) await loadMore();
		const el = fileEl(path);
		if (!el) return;
		el.scrollIntoView({ behavior: "smooth", block: "start" });
		for (const r of root.querySelectorAll(".gh-tree-row.active")) r.classList.remove("active");
		treeEl(path)?.querySelector(".gh-tree-row").classList.add("active");
	}

	function bind() {
		root.addEventListener("click", (e) => {
			const viewed = e.target.closest(".gh-viewed");
			if (viewed) {
				const f = viewed.closest(".gh-file");
				const on = !f.classList.contains("viewed");
				f.classList.toggle("viewed", on);
				f.classList.toggle("collapsed", on);
				updateViewed();
				return;
			}
			const collapse = e.target.closest(".gh-file-collapse");
			if (collapse && collapse.title === "Toggle diff contents") {
				collapse.closest(".gh-file").classList.toggle("collapsed");
				return;
			}
			if (e.target.closest("[data-gh-toggle-tree]")) {
				root.querySelector(".gh-layout").classList.toggle("no-tree");
				return;
			}
			const row = e.target.closest(".gh-tree-row");
			if (row) {
				const dir = row.parentElement.closest(".gh-tree-dir");
				if (row.parentElement.classList.contains("gh-tree-dir")) {
					dir.classList.toggle("collapsed");
					return;
				}
				const path = row.parentElement.dataset.path;
				if (path) scrollToFile(path);
				return;
			}
			if (e.target.closest('a[href="#"]')) e.preventDefault();
		});
		root.querySelector("[data-gh-tree-filter]").addEventListener("input", (e) => {
			const q = e.target.value.trim().toLowerCase();
			for (const li of root.querySelectorAll(".gh-tree-file"))
				li.classList.toggle("filtered-out", !!q && !li.dataset.path.toLowerCase().includes(q));
			for (const d of [...root.querySelectorAll(".gh-tree-dir")].reverse()) {
				const any = d.querySelector(".gh-tree-file:not(.filtered-out)");
				d.classList.toggle("filtered-out", !any);
			}
		});
		const io = new IntersectionObserver((entries) => {
			if (entries.some((en) => en.isIntersecting)) loadMore();
		});
		io.observe(root.querySelector("[data-gh-loading]"));
	}

	function setTheme(theme) {
		document.documentElement.dataset.ghTheme = theme;
		document.dispatchEvent(new CustomEvent("gh:theme", { detail: { theme } }));
	}

	function mount(el) {
		root = el;
		root.classList.add("gh-root");
		root.innerHTML = pageHtml();
		appendFiles(ordered.slice(0, INITIAL), false);
		bind();
		return root;
	}

	window.GH = {
		mount,
		setTheme,
		get theme() {
			return document.documentElement.dataset.ghTheme || "light";
		},
		loadMore,
		icon,
		idFor,
		fileEl,
		treeEl,
		scrollToFile,
		slot: (name) => root.querySelector(`[data-gh-slot="${name}"]`),
		get root() {
			return root;
		},
		paths: ordered,
		loadedPaths: () => ordered.slice(0, loaded),
		file: (path) => byPath.get(path),
		statFor,
		repo: `${data.repo.owner}/${data.repo.name}`,
		prNumber,
		pr,
		prKey: `${data.repo.owner}/${data.repo.name}#${prNumber}`,
		esc,
	};
})();
