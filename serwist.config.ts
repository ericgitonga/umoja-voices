import { serwist } from "@serwist/next/config";

// "Configurator mode" (#124) — the alternative to @serwist/next's default
// webpack-plugin integration, which does not work at all under Turbopack
// (this repo's `next build`/`next dev` default bundler, confirmed via
// `npm run build`'s own banner: "Next.js 16.2.11 (Turbopack)"). This mode is
// bundler-agnostic: it globs the already-built `.next`/`public` output after
// `next build` finishes and esbuild-bundles `swSrc` separately, so it works
// regardless of which bundler produced that output. Run via `serwist build`
// in package.json's `build` script, after `next build`.
export default serwist({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
});
