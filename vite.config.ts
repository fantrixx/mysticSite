import { defineConfig, type Plugin } from "vite";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL(".", import.meta.url));
const sourceHtml = resolve(rootDir, "index.source.html");

/** In development, serve the source entry as `/`. */
function serveSourceAsIndex(): Plugin {
  return {
    name: "serve-source-as-index",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (!req.url) return next();
        const [pathOnly, query] = req.url.split("?", 2);
        if (pathOnly === "/" || pathOnly === "/index.html") {
          req.url = "/index.source.html" + (query ? `?${query}` : "");
        }
        next();
      });
    },
  };
}

export default defineConfig({
  base: "./",
  server: {
    host: "0.0.0.0",
    port: 43127,
    strictPort: true,
  },
  preview: {
    host: "0.0.0.0",
    port: 43127,
    strictPort: true,
    // preview uses build.outDir; after publish the site lives at repo root
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: sourceHtml,
      },
    },
  },
  plugins: [serveSourceAsIndex()],
});
