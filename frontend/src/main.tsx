import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app/App'
import './i18n/config'
import './styles/sonner.css'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
