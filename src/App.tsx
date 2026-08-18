import { HashRouter, Routes, Route } from 'react-router-dom'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={
          <main style={{ padding: 16, fontFamily: 'system-ui' }}>
            <h1>Calorie Counter</h1>
            <p>v{__APP_VERSION__} · {__GIT_SHA__} · {__BUILD_TIME__}</p>
          </main>
        } />
      </Routes>
    </HashRouter>
  )
}
