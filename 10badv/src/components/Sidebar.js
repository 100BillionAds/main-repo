export default function Sidebar({ className = '' }) {
  return (
    <aside className={`hidden md:block w-64 bg-white/80 dark:bg-black/80 border-r ${className}`}>
      <div className="p-4 sticky top-0">
        <div className="mb-6 text-lg font-semibold">Workspace</div>
        <div className="space-y-2">
          <a className="block rounded px-3 py-2 hover:bg-gray-100" href="#">Quick Notes</a>
          <a className="block rounded px-3 py-2 hover:bg-gray-100" href="#">Projects</a>
          <a className="block rounded px-3 py-2 hover:bg-gray-100" href="#">Settings</a>
        </div>
      </div>
    </aside>
  );
}
