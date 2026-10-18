import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  main: { plugins: [externalizeDepsPlugin()], build: { rollupOptions: { input: { index: resolve('electron/main.ts') } } } },
  preload: { plugins: [externalizeDepsPlugin()], build: { rollupOptions: { input: { index: resolve('electron/preload.ts') } } } },
  renderer: {
    root: resolve('.'),
    // Packaged Electron windows load this entry point from file://. Absolute asset URLs
    // resolve against the filesystem root and leave the app window blank. Keep bundles
    // relative to out/renderer/index.html in packaged builds.
    base: './',
    resolve: { alias: { '@': resolve('src') } },
    plugins: [react()],
    // Build the isolated desktop smoke page too; CI loads it through Electron to prove
    // the packaged-style file:// renderer can initialize WebGL and reach preload IPC.
    build: { rollupOptions: { input: { index: resolve('index.html'), smoke: resolve('smoke.html') } } }
  }
})
