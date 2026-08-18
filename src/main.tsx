import React from 'react'
import ReactDOM from 'react-dom/client'
import './i18n'
import './styles.css'
import { AppProvider } from './state/AppContext'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </React.StrictMode>,
)
