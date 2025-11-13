import { useState, useEffect } from 'react';

export default function Editor() {
  const [blocks, setBlocks] = useState([
    { id: 'b1', content: 'Welcome to your Notion-like editor. Start typing...' },
  ]);

  useEffect(() => {
    // hydrate from API later
  }, []);

  return (
    <div className="prose max-w-none p-6">
      {blocks.map((b) => (
        <div key={b.id} className="mb-4 rounded border p-4 hover:shadow-sm">
          <textarea
            className="w-full resize-none bg-transparent outline-none"
            value={b.content}
            onChange={(e) => setBlocks((s) => s.map((x) => (x.id === b.id ? { ...x, content: e.target.value } : x)))}
            rows={3}
          />
        </div>
      ))}
      <button
        className="mt-2 rounded border px-3 py-2 text-sm"
        onClick={() => setBlocks((s) => [...s, { id: String(Date.now()), content: '' }])}
      >
        + Add block
      </button>
    </div>
  );
}
