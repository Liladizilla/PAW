import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { installBrowserPreviewBridge } from './runtime/browser-preview-bridge'
import './styles.css'

installBrowserPreviewBridge(window)

const root = document.getElementById('root')
if (!root) throw new Error('P.A.W. renderer root is missing from index.html')
createRoot(root).render(<React.StrictMode><App /></React.StrictMode>)
