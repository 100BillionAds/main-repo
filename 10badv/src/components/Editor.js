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
    return <div className="p-6 text-center text-zinc-500">Loading...</div>;
  }

  return (
    <div className="prose max-w-none p-6">
      {items.map((item) => (
        <div key={item.id} className="group mb-4 rounded border p-4 hover:shadow-sm relative">
          <input
            className="w-full mb-2 text-lg font-semibold bg-transparent outline-none border-b pb-1"
            value={item.title || ''}
            onChange={(e) => handleUpdate(item.id, 'title', e.target.value)}
            placeholder="Title"
          />
          <textarea
            className="w-full resize-none bg-transparent outline-none text-sm text-zinc-700"
            value={item.description || ''}
            onChange={(e) => handleUpdate(item.id, 'description', e.target.value)}
            placeholder="Description or content..."
            rows={3}
          />
          <button
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-xs text-red-600"
            onClick={() => handleDelete(item.id)}
          >
            Delete
          </button>
        </div>
      ))}
      <button
        className="mt-2 rounded border border-dashed px-4 py-2 text-sm hover:bg-zinc-50"
        onClick={handleAddBlock}
      >
        + Add block
      </button>
    </div>
  );
}
