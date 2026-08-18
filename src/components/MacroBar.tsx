export function MacroBar({ label, current, target }: { label: string; current: number; target: number }) {
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0
  return (
    <div style={{ flex: 1 }}>
      <div className="muted">{label}</div>
      <div style={{ height: 6, background: '#e5e5ea', borderRadius: 999, marginBlock: 4 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)', borderRadius: 999 }} />
      </div>
      <div className="muted">{Math.round(current)} / {target}g</div>
    </div>
  )
}
