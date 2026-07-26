export default function ProjectLoading() {
  return (
    <div className="flex-1 p-6 animate-pulse">
      <div className="h-7 w-48 rounded bg-muted mb-5" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[0, 1, 2].map(item => <div key={item} className="h-32 rounded-xl bg-card border border-border" />)}
      </div>
    </div>
  )
}
