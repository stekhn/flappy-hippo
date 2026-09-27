import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { ThemeProvider } from './components/ThemeProvider.tsx'
import { EARLY_STAGES, STAGE_MOVERS, STAGE_POTS } from './game/constants.ts'
import { locale } from './i18n/index.ts'
import './styles.css'

document.documentElement.lang = locale

if (EARLY_STAGES) console.warn(`Flappy Hippo: Stufen bei ${STAGE_POTS} und ${STAGE_MOVERS} Punkten (EARLY_STAGES in constants.ts)`)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
