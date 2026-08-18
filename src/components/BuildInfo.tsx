export function BuildInfo() {
  const text = `v${__APP_VERSION__} · ${__GIT_SHA__} · ${__BUILD_TIME__}`
  return (
    <button data-testid="build-info" className="muted"
      style={{ display: 'block', width: '100%', textAlign: 'center', background: 'transparent', border: 'none', padding: 12, fontSize: 11 }}
      onClick={() => { navigator.clipboard?.writeText(text) }}>
      {text}
    </button>
  )
}
