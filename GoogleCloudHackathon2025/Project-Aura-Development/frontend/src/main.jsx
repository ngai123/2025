import './index.css'
import App from './App.jsx'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Load Locator UI only in development to avoid Windows backslash escape issues
if (import.meta.env.DEV) {
  import("@locator/runtime")
    .then(({ default: setupLocatorUI }) => {
      setupLocatorUI();
    })
    .catch(() => {
      // Silently ignore if Locator is unavailable
    });
}
