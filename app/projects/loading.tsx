export default function ProjectsLoading() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto animate-pulse">
        <div className="h-8 w-40 rounded bg-muted mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[0, 1, 2].map(item => <div key={item} className="h-64 rounded-xl bg-card border border-border" />)}
        </div>
      </div>
    </div>
  )
}
