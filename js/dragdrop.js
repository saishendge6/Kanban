import { moveCardToColumn } from './state.js';

const DRAG_OVER_CLASS = 'column--drag-over';
const SCROLL_THRESHOLD = 80;
const SCROLL_SPEED = 12;

let dragSrcElement = null;
let onCardMovedCallback = null;
let scrollInterval = null;

export function onCardMoved(callback) {
  onCardMovedCallback = callback;
}

export function initDragDrop(container) {
  container.addEventListener('dragstart', onDragStart);
  container.addEventListener('dragend', onDragEnd);
  container.addEventListener('dragover', onDragOver);
  container.addEventListener('dragleave', onDragLeave);
  container.addEventListener('drop', onDrop);
}

function onDragStart(e) {
  const card = e.target.closest('[data-card-id]');
  if (!card) return;

  dragSrcElement = card;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', card.dataset.cardId);

  requestAnimationFrame(() => {
    card.classList.add('card--dragging');
  });
}

function onDragEnd() {
  stopAutoScroll();
  document.querySelectorAll(`.${DRAG_OVER_CLASS}`).forEach(el => {
    el.classList.remove(DRAG_OVER_CLASS);
  });

  if (dragSrcElement) {
    dragSrcElement.classList.remove('card--dragging');
    dragSrcElement = null;
  }
}

function onDragOver(e) {
  const column = e.target.closest('[data-column]');
  if (!column) return;

  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  column.classList.add(DRAG_OVER_CLASS);

  handleAutoScroll(e);
}

function onDragLeave(e) {
  const column = e.target.closest('[data-column]');
  if (!column) return;

  if (!column.contains(e.relatedTarget)) {
    column.classList.remove(DRAG_OVER_CLASS);
  }
}

function onDrop(e) {
  e.preventDefault();
  stopAutoScroll();

  const column = e.target.closest('[data-column]');
  if (!column) return;

  column.classList.remove(DRAG_OVER_CLASS);

  const cardId = e.dataTransfer.getData('text/plain');
  if (!cardId) return;

  const targetColumnId = column.dataset.column;
  const sourceColumnEl = dragSrcElement?.closest('[data-column]');
  const sourceColumnId = sourceColumnEl?.dataset?.column;

  if (!sourceColumnId || sourceColumnId === targetColumnId) return;

  const result = moveCardToColumn(cardId, targetColumnId);
  if (result && onCardMovedCallback) {
    onCardMovedCallback(cardId, sourceColumnId, targetColumnId);
  }
}

function handleAutoScroll(e) {
  const board = e.currentTarget;
  const rect = board.getBoundingClientRect();
  const x = e.clientX - rect.left;

  if (x < SCROLL_THRESHOLD) {
    startAutoScroll(board, -SCROLL_SPEED);
  } else if (x > rect.width - SCROLL_THRESHOLD) {
    startAutoScroll(board, SCROLL_SPEED);
  } else {
    stopAutoScroll();
  }
}

function startAutoScroll(board, amount) {
  if (scrollInterval) return;
  scrollInterval = setInterval(() => {
    board.scrollLeft += amount;
  }, 16);
}

function stopAutoScroll() {
  if (scrollInterval) {
    clearInterval(scrollInterval);
    scrollInterval = null;
  }
}
