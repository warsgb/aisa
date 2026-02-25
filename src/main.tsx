import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Hide loading screen when app is ready
const loadingScreen = document.getElementById('loading-screen')
const rootElement = document.getElementById('root')

if (loadingScreen && rootElement) {
  // Fade out loading screen
  loadingScreen.style.transition = 'opacity 0.3s ease-out'
  loadingScreen.style.opacity = '0'

  setTimeout(() => {
    loadingScreen.remove()
    rootElement.classList.add('loaded')
  }, 300)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
