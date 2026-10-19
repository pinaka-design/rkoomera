// Local dev server for the Webflow loader.
// Serves the bundle at http://localhost:3333/main.js, rebuilt in memory on
// every save (dist/ on disk is left alone), and tells open pages to reload.
import * as esbuild from "esbuild";

const PORT = 3333;

const ctx = await esbuild.context({
  entryPoints: ["src/main.js"],
  bundle: true,
  format: "iife",
  target: "es2020",
  sourcemap: true,
  outfile: "dist/main.js",
  write: false,
  logLevel: "info",
});

await ctx.watch();
await ctx.serve({
  port: PORT,
  servedir: "dist",
  // The Webflow page listens to /esbuild for reloads from another origin
  cors: { origin: "*" },
});

console.log(`\nDev bundle: http://localhost:${PORT}/main.js`);
console.log("Open the Webflow site with ?dev=1 to use it, ?dev=0 to switch back.\n");
