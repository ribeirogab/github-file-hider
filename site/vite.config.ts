import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";

const root = resolve(import.meta.dirname);

const CONTENT_SECURITY_POLICY = [
	"default-src 'self'",
	"img-src 'self'",
	"style-src 'self'",
	"script-src 'self'",
	"font-src 'self'",
	"connect-src 'self'",
	"base-uri 'self'",
	"form-action 'none'",
	"object-src 'none'",
].join("; ");

const contentSecurityPolicy = (): Plugin => ({
	name: "content-security-policy",
	apply: "build",
	transformIndexHtml: () => [
		{
			tag: "meta",
			attrs: {
				"http-equiv": "Content-Security-Policy",
				content: CONTENT_SECURITY_POLICY,
			},
			injectTo: "head-prepend",
		},
	],
});

export default defineConfig({
	root,
	plugins: [contentSecurityPolicy()],
	build: {
		outDir: resolve(root, "dist"),
		emptyOutDir: true,
		assetsInlineLimit: 0,
		rollupOptions: {
			input: {
				main: resolve(root, "index.html"),
				notFound: resolve(root, "404.html"),
			},
		},
	},
});
