const STORAGE_KEY = 'kanban-board-state';
const THEME_KEY = 'kanban-theme';
const TODAY = () => new Date().toISOString().slice(0, 10);
const TOMORROW = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); };
const NEXT_WEEK = () => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10); };

function seedCards() {
  return [
    {
      id: generateId(), title: 'Design system audit', description: 'Review all existing components for consistency',
      status: 'backlog', priority: 'medium', dueDate: NEXT_WEEK(), createdAt: Date.now(), updatedAt: Date.now(),
    },
    {
      id: generateId(), title: 'User onboarding flow', description: 'Map out the new user journey from sign-up to first task',
      status: 'backlog', priority: 'high', dueDate: '', createdAt: Date.now(), updatedAt: Date.now(),
    },
    {
      id: generateId(), title: 'API rate limiting', description: 'Implement rate limiting on public endpoints',
      status: 'in-progress', priority: 'high', dueDate: TOMORROW(), createdAt: Date.now(), updatedAt: Date.now(),
    },
    {
      id: generateId(), title: 'Notification system', description: 'Build email and in-app notification channels',
      status: 'in-progress', priority: 'medium', dueDate: '', createdAt: Date.now(), updatedAt: Date.now(),
    },
    {
      id: generateId(), title: 'Dark mode support', description: 'Add theme toggle and persist preference',
      status: 'review', priority: 'low', dueDate: TODAY(), createdAt: Date.now(), updatedAt: Date.now(),
    },
    {
      id: generateId(), title: 'Performance benchmarks', description: 'Run Lighthouse audit and optimize Core Web Vitals',
      status: 'review', priority: 'medium', dueDate: '', createdAt: Date.now(), updatedAt: Date.now(),
    },
    {
      id: generateId(), title: 'Deploy to staging', description: 'Push latest build to staging environment for QA',
      status: 'done', priority: 'high', dueDate: TODAY(), createdAt: Date.now(), updatedAt: Date.now(),
    },
    {
      id: generateId(), title: 'Write integration tests', description: 'Cover all critical user paths with Playwright',
      status: 'done', priority: 'medium', dueDate: '', createdAt: Date.now(), updatedAt: Date.now(),
    },
  ];
}

const DEFAULT_COLUMNS = [
  { id: 'backlog', title: 'Backlog', cards: [], collapsed: false },
  { id: 'in-progress', title: 'In Progress', cards: [], collapsed: false },
  { id: 'review', title: 'Review', cards: [], collapsed: false },
  { id: 'done', title: 'Done', cards: [], collapsed: false },
];

function buildDefaultState() {
  const state = deepClone(DEFAULT_COLUMNS);
  const cards = seedCards();
  for (const card of cards) {
    const col = state.find(c => c.id === card.status);
    if (col) col.cards.push(card);
  }
  return state;
}

function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function deepClone(data) {
  return JSON.parse(JSON.stringify(data));
}

let boardState = [];
let saveTimeout = null;
let lastDeleted = null;

function persistState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(boardState));
}

function schedulePersist() {
  if (saveTimeout) cancelAnimationFrame(saveTimeout);
  saveTimeout = requestAnimationFrame(() => {
    persistState();
    saveTimeout = null;
  });
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        boardState = parsed;
        return deepClone(boardState);
      }
    }
  } catch (e) {
    console.warn('Failed to parse board state, falling back to defaults.', e);
  }
  boardState = buildDefaultState();
  return deepClone(boardState);
}

export function getState() {
  return deepClone(boardState);
}

export function addCard(columnId, { title, description, priority, dueDate }) {
  const column = boardState.find(c => c.id === columnId);
  if (!column) return null;

  const card = {
    id: generateId(),
    title: title.trim(),
    description: (description || '').trim(),
    status: columnId,
    priority: priority || 'medium',
    dueDate: dueDate || '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  column.cards.push(card);
  schedulePersist();
  return deepClone(card);
}

export function updateCard(cardId, { title, description, status, priority, dueDate }) {
  for (const column of boardState) {
    const card = column.cards.find(c => c.id === cardId);
    if (card) {
      if (title !== undefined) card.title = title.trim();
      if (description !== undefined) card.description = description.trim();
      if (priority !== undefined) card.priority = priority;
      if (dueDate !== undefined) card.dueDate = dueDate;
      if (status !== undefined && status !== column.id) {
        card.status = status;
        card.updatedAt = Date.now();
        column.cards.splice(column.cards.indexOf(card), 1);
        const target = boardState.find(c => c.id === status);
        if (target) target.cards.push(card);
        schedulePersist();
        return deepClone(card);
      }
      card.updatedAt = Date.now();
      schedulePersist();
      return deepClone(card);
    }
  }
  return null;
}

export function deleteCard(cardId) {
  for (const column of boardState) {
    const idx = column.cards.findIndex(c => c.id === cardId);
    if (idx !== -1) {
      const removed = column.cards.splice(idx, 1)[0];
      lastDeleted = { card: deepClone(removed), columnId: column.id };
      schedulePersist();
      return deepClone(removed);
    }
  }
  return null;
}

export function undoDelete() {
  if (!lastDeleted) return null;
  const column = boardState.find(c => c.id === lastDeleted.columnId);
  if (!column) return null;
  column.cards.push(lastDeleted.card);
  lastDeleted = null;
  schedulePersist();
  return deepClone(column.cards[column.cards.length - 1]);
}

export function moveCardToColumn(cardId, targetColumnId) {
  let card = null;
  for (const column of boardState) {
    const idx = column.cards.findIndex(c => c.id === cardId);
    if (idx !== -1) {
      card = column.cards.splice(idx, 1)[0];
      break;
    }
  }
  if (!card) return null;

  card.status = targetColumnId;
  card.updatedAt = Date.now();
  const target = boardState.find(c => c.id === targetColumnId);
  if (!target) return null;

  target.cards.push(card);
  schedulePersist();
  return deepClone(card);
}

export function toggleColumnCollapse(columnId) {
  const column = boardState.find(c => c.id === columnId);
  if (!column) return false;
  column.collapsed = !column.collapsed;
  schedulePersist();
  return column.collapsed;
}

export function loadTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch (_) {}
  return 'dark';
}

export function saveTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
}

export function exportState() {
  return JSON.stringify(boardState, null, 2);
}

export function importState(jsonStr) {
  try {
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed) || parsed.length === 0) return false;
    for (const col of parsed) {
      if (!col.id || !col.title || !Array.isArray(col.cards)) return false;
    }
    boardState = parsed;
    persistState();
    return true;
  } catch (_) {
    return false;
  }
}
