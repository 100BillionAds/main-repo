import { useState, useEffect } from 'react';

export default function Editor() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load items from API
    fetch('/api/items')
      .then((r) => r.json())
      .then((data) => {
        setItems(data.length ? data : [{ id: 'temp', title: 'Start typing...', description: '' }]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleUpdate = async (id, field, value) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
    // Debounce save to API
    if (id.startsWith('temp')) return; // Don't save temp items
    await fetch(`/api/items/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
  };

  const handleAddBlock = async () => {
    const res = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New block', description: '' }),
    });
    const newItem = await res.json();
    setItems((prev) => [...prev, newItem]);
  };

  const handleDelete = async (id) => {
    if (id.startsWith('temp')) {
      setItems((prev) => prev.filter((i) => i.id !== id));
      return;
    }
    await fetch(`/api/items/${id}`, { method: 'DELETE' });
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  if (loading) {
    return <div className="p-6 text-center text-zinc-500">Loading your notes...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {items.map((item) => (
        <div key={item.id} className="group mb-4 rounded-lg border border-zinc-200 dark:border-zinc-800 p-5 hover:shadow-lg hover:border-zinc-300 dark:hover:border-zinc-700 transition relative bg-white dark:bg-zinc-900">
          <input
            className="w-full mb-3 text-xl font-semibold bg-transparent outline-none border-b border-transparent focus:border-zinc-300 dark:focus:border-zinc-700 pb-2 transition"
            value={item.title || ''}
            onChange={(e) => handleUpdate(item.id, 'title', e.target.value)}
            placeholder="Untitled"
          />
          <textarea
            className="w-full resize-none bg-transparent outline-none text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed"
            value={item.description || ''}
            onChange={(e) => handleUpdate(item.id, 'description', e.target.value)}
            placeholder="Write something..."
            rows={4}
          />
          <button
            className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50 transition"
            onClick={() => handleDelete(item.id)}
          >
            Delete
          </button>
        </div>
      ))}
      <button
        className="mt-4 w-full rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-700 px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:border-zinc-400 dark:hover:border-zinc-600 transition"
        onClick={handleAddBlock}
      >
        + Add a new block
      </button>
    </div>
  );
}
