// Simple in-memory store for demo purposes.
// Replace with real DB/ORM (Prisma/Sequelize) in production.
let items = [
  { id: '1', title: 'Sample item', description: 'This is a sample item.' },
];

export function listItems() {
  return items;
}

export function getItem(id) {
  return items.find((i) => i.id === id) || null;
}

export function createItem(payload) {
  const id = String(Date.now());
  const item = { id, ...payload };
  items.push(item);
  return item;
}

export function updateItem(id, payload) {
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) return null;
  items[idx] = { ...items[idx], ...payload };
  return items[idx];
}

export function deleteItem(id) {
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) return false;
  items.splice(idx, 1);
  return true;
}
