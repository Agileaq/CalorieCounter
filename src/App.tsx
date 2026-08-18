import { HashRouter, Routes, Route } from 'react-router-dom'
import { BottomNav } from './components/BottomNav'
import Dashboard from './routes/Dashboard'
import Log from './routes/Log'
import Goals from './routes/Goals'

export default function App() {
  return (
    <HashRouter>
      <div className="app">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/log" element={<Log />} />
          <Route path="/goals" element={<Goals />} />
        </Routes>
        <BottomNav />
      </div>
    </HashRouter>
  )
}
