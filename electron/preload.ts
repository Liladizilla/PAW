import { contextBridge } from 'electron'
contextBridge.exposeInMainWorld('paw', Object.freeze({ platform: process.platform, version: '0.1.0', runtimeStatus: 'not-connected' }))
