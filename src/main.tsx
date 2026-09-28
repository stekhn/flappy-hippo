import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { ThemeProvider } from './components/ThemeProvider.tsx'
import { STAGE_MOVERS, STAGE_POTS, TEST_MODE } from './game/constants.ts'
import { locale } from './i18n/index.ts'
import './styles.css'

document.documentElement.lang = locale

if (TEST_MODE)
  console.warn(
    `Flappy Hippo: test mode, stages at ${STAGE_MOVERS} and ${STAGE_POTS} points (TEST_MODE in constants.ts)`,
  )

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
