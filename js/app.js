import {
  loadState, getState, addCard, updateCard, deleteCard, undoDelete,
  toggleColumnCollapse, loadTheme, saveTheme, exportState, importState
} from './state.js';
import { initDragDrop, onCardMoved } from './dragdrop.js';

const SELECTORS = {
  board: '.board',
  addCardBtn: '.add-card-btn',
  cardEditBtn: '.card__edit-btn',
  cardDeleteBtn: '.card__delete-btn',
  modal: '.modal',
  modalOverlay: '.modal__overlay',
  modalForm: '.modal__form',
  modalTitle: '#modal-title',
  modalDescription: '#modal-description',
  modalPriority: '#modal-priority',
  modalDue: '#modal-due',
  modalColumn: '#modal-column',
  modalHeading: '.modal__heading',
  cancelBtn: '.modal__cancel-btn',
  titleCounter: '#title-counter',
  descCounter: '#desc-counter',
  searchInput: '#search-input',
  searchClear: '#search-clear',
  themeToggle: '#theme-toggle',
  menuBtn: '#menu-btn',
  dropdownMenu: '#dropdown-menu',
  exportBtn: '#export-btn',
  importBtn: '#import-btn',
  importFile: '#import-file',
  toastContainer: '#toast-container',
};

let boardEl = null;
let modalData = { cardId: null };
let searchQuery = '';

function qs(selector, ctx = document) {
  return ctx.querySelector(selector);
}

function qsa(selector, ctx = document) {
  return [...ctx.querySelectorAll(selector)];
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isOverdue(iso) {
  if (!iso) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(iso + 'T00:00:00') < today;
}

function populateColumnOptions(selectedId) {
  const state = getState();
  const select = qs(SELECTORS.modalColumn);
  select.innerHTML = state.map(col =>
    `<option value="${col.id}" ${col.id === selectedId ? 'selected' : ''}>${escapeHtml(col.title)}</option>`
  ).join('');
}

function matchesSearch(card) {
  if (!searchQuery) return true;
  const q = searchQuery.toLowerCase();
  return card.title.toLowerCase().includes(q) || card.description.toLowerCase().includes(q);
}

export function renderBoard() {
  const state = getState();
  boardEl.innerHTML = '';

  for (const column of state) {
    const colEl = document.createElement('div');
    colEl.className = 'column' + (column.collapsed ? ' column--collapsed' : '');
    colEl.dataset.column = column.id;

    const collapseIcon = `<svg class="column__collapse-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;

    const header = document.createElement('div');
    header.className = 'column__header';
    header.innerHTML = `
      <div class="column__title-group">
        <span class="column__dot"></span>
        <h2 class="column__title">${escapeHtml(column.title)}</h2>
      </div>
      <div style="display:flex;align-items:center;gap:6px">
        <span class="column__counter" data-count="${column.cards.length}">${column.cards.length}</span>
        ${collapseIcon}
      </div>
    `;
    colEl.appendChild(header);

    const list = document.createElement('div');
    list.className = 'card-list';
    list.dataset.column = column.id;

    let hasVisibleCard = false;

    for (const card of column.cards) {
      const visible = matchesSearch(card);
      if (visible) hasVisibleCard = true;

      const cardEl = document.createElement('div');
      cardEl.className = 'card' + (visible ? '' : ' card--hidden');
      cardEl.draggable = true;
      cardEl.dataset.cardId = card.id;

      const overdue = isOverdue(card.dueDate);

      cardEl.innerHTML = `
        <div class="card__priority" data-priority="${escapeHtml(card.priority)}"></div>
        <div class="card__actions">
          <button class="card__edit-btn" data-card-id="${escapeHtml(card.id)}" title="Edit" aria-label="Edit task">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="card__delete-btn" data-card-id="${escapeHtml(card.id)}" title="Delete" aria-label="Delete task">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
        <div class="card__body">
          <h3 class="card__title">${escapeHtml(card.title)}</h3>
          ${card.description ? `<p class="card__description">${escapeHtml(card.description)}</p>` : ''}
        </div>
        <div class="card__footer">
          <span class="card__badge card__badge--${escapeHtml(card.priority)}">${escapeHtml(card.priority)}</span>
          ${card.dueDate ? `<span class="card__due${overdue ? ' card__due--overdue' : ''}">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            ${formatDate(card.dueDate)}
          </span>` : ''}
        </div>
      `;

      list.appendChild(cardEl);
    }

    if (searchQuery && !hasVisibleCard) {
      list.classList.add('card-list--filtered');
    } else {
      list.classList.remove('card-list--filtered');
    }

    colEl.appendChild(list);

    const addBtn = document.createElement('button');
    addBtn.className = 'add-card-btn';
    addBtn.dataset.column = column.id;
    addBtn.textContent = '+ Add Card';
    colEl.appendChild(addBtn);

    boardEl.appendChild(colEl);
  }
}

function openModal(cardId, columnId) {
  modalData = { cardId, columnId };
  const titleInput = qs(SELECTORS.modalTitle);
  const descInput = qs(SELECTORS.modalDescription);
  const prioritySelect = qs(SELECTORS.modalPriority);
  const dueInput = qs(SELECTORS.modalDue);

  if (cardId) {
    const state = getState();
    let found = null;
    for (const col of state) {
      const card = col.cards.find(c => c.id === cardId);
      if (card) {
        found = { ...card, colId: col.id };
        break;
      }
    }
    if (!found) return;

    qs(SELECTORS.modalHeading).textContent = 'Edit Task';
    titleInput.value = found.title;
    descInput.value = found.description;
    prioritySelect.value = found.priority || 'medium';
    dueInput.value = found.dueDate || '';
    populateColumnOptions(found.colId);
  } else {
    qs(SELECTORS.modalHeading).textContent = 'Add Task';
    titleInput.value = '';
    descInput.value = '';
    prioritySelect.value = 'medium';
    dueInput.value = '';
    populateColumnOptions(columnId);
  }

  updateCounter(qs(SELECTORS.titleCounter), titleInput.value.length, 100);
  updateCounter(qs(SELECTORS.descCounter), descInput.value.length, 500);

  qs(SELECTORS.modal).classList.add('modal--open');
  titleInput.focus();
}

function closeModal() {
  qs(SELECTORS.modal).classList.remove('modal--open');
  modalData = { cardId: null };
}

function updateCounter(el, current, max) {
  el.textContent = `${current}/${max}`;
  el.className = 'form-counter' + (
    current >= max ? ' form-counter--full' : current >= max * 0.85 ? ' form-counter--warn' : ''
  );
}

function setupCounters() {
  const titleInput = qs(SELECTORS.modalTitle);
  const descInput = qs(SELECTORS.modalDescription);
  const titleCounter = qs(SELECTORS.titleCounter);
  const descCounter = qs(SELECTORS.descCounter);

  titleInput.addEventListener('input', () => updateCounter(titleCounter, titleInput.value.length, 100));
  descInput.addEventListener('input', () => updateCounter(descCounter, descInput.value.length, 500));
}

function handleSave(e) {
  e.preventDefault();
  const title = qs(SELECTORS.modalTitle).value.trim();
  const description = qs(SELECTORS.modalDescription).value.trim();
  if (!title) return;

  const priority = qs(SELECTORS.modalPriority).value;
  const dueDate = qs(SELECTORS.modalDue).value;
  const status = qs(SELECTORS.modalColumn).value;

  if (modalData.cardId) {
    updateCard(modalData.cardId, { title, description, priority, dueDate, status });
  } else {
    addCard(modalData.columnId, { title, description, priority, dueDate });
  }

  closeModal();
  renderBoard();
}

function showToast(message, actionLabel, onAction, duration = 5000) {
  const container = qs(SELECTORS.toastContainer);
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');

  const text = document.createElement('span');
  text.textContent = message;
  toast.appendChild(text);

  if (actionLabel && onAction) {
    const btn = document.createElement('button');
    btn.className = 'toast__action';
    btn.textContent = actionLabel;
    btn.addEventListener('click', () => { onAction(); dismiss(toast); });
    toast.appendChild(btn);
  }

  const dismissBtn = document.createElement('button');
  dismissBtn.className = 'toast__dismiss';
  dismissBtn.innerHTML = '&times;';
  dismissBtn.setAttribute('aria-label', 'Dismiss');
  dismissBtn.addEventListener('click', () => dismiss(toast));
  toast.appendChild(dismissBtn);

  container.appendChild(toast);

  const timer = setTimeout(() => dismiss(toast), duration);

  function dismiss(el) {
    if (el.classList.contains('toast--leaving')) return;
    clearTimeout(timer);
    el.classList.add('toast--leaving');
    el.addEventListener('animationend', () => el.remove());
  }
}

function handleDelete(cardId) {
  const deleted = deleteCard(cardId);
  renderBoard();
  if (deleted) {
    showToast('Task deleted', 'Undo', () => {
      undoDelete();
      renderBoard();
    });
  }
}

function handleToggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  saveTheme(next);
}

function handleExport() {
  const json = exportState();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kanban-board-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  closeDropdown();
  showToast('Board exported');
}

function handleImport() {
  qs(SELECTORS.importFile).click();
  closeDropdown();
}

function handleImportFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const success = importState(ev.target.result);
    if (success) {
      renderBoard();
      showToast('Board imported successfully');
    } else {
      showToast('Invalid file format');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

function toggleDropdown(e) {
  e.stopPropagation();
  const menu = qs(SELECTORS.dropdownMenu);
  const isOpen = menu.classList.toggle('dropdown__menu--open');
  qs(SELECTORS.menuBtn).setAttribute('aria-expanded', isOpen);
}

function closeDropdown() {
  qs(SELECTORS.dropdownMenu).classList.remove('dropdown__menu--open');
  qs(SELECTORS.menuBtn).setAttribute('aria-expanded', 'false');
}

function handleBoardClick(e) {
  const card = e.target.closest('[data-card-id]');
  const addBtn = e.target.closest(SELECTORS.addCardBtn);
  const editBtn = e.target.closest(SELECTORS.cardEditBtn);
  const deleteBtn = e.target.closest(SELECTORS.cardDeleteBtn);
  const header = e.target.closest('.column__header');

  if (addBtn) {
    openModal(null, addBtn.dataset.column);
  } else if (editBtn) {
    openModal(editBtn.dataset.cardId, null);
  } else if (deleteBtn) {
    handleDelete(deleteBtn.dataset.cardId);
  } else if (header) {
    const column = header.closest('[data-column]');
    if (column) {
      toggleColumnCollapse(column.dataset.column);
      renderBoard();
    }
  }
}

function handleKeydown(e) {
  if (e.key === 'Escape') {
    if (qs(SELECTORS.modal).classList.contains('modal--open')) {
      closeModal();
      return;
    }
    closeDropdown();
    return;
  }

  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

  if (e.key === 'n' || e.key === 'N') {
    e.preventDefault();
    const firstAddBtn = qs(SELECTORS.addCardBtn, boardEl);
    if (firstAddBtn) openModal(null, firstAddBtn.dataset.column);
  }

  if (e.key === '/') {
    e.preventDefault();
    qs(SELECTORS.searchInput).focus();
  }
}

function bindEvents() {
  qs(SELECTORS.searchInput).addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderBoard();
  });

  qs(SELECTORS.searchClear).addEventListener('click', () => {
    qs(SELECTORS.searchInput).value = '';
    searchQuery = '';
    renderBoard();
    qs(SELECTORS.searchInput).focus();
  });

  qs(SELECTORS.themeToggle).addEventListener('click', handleToggleTheme);

  boardEl.addEventListener('click', handleBoardClick);

  boardEl.addEventListener('dblclick', (e) => {
    const card = e.target.closest('[data-card-id]');
    if (card && !e.target.closest('button')) {
      openModal(card.dataset.cardId, null);
    }
  });

  qs(SELECTORS.modalForm).addEventListener('submit', handleSave);
  qsa(SELECTORS.cancelBtn).forEach(el => el.addEventListener('click', closeModal));
  qs(SELECTORS.modalOverlay).addEventListener('click', closeModal);

  document.addEventListener('keydown', handleKeydown);

  qs(SELECTORS.menuBtn).addEventListener('click', toggleDropdown);

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown')) closeDropdown();
  });

  qs(SELECTORS.exportBtn).addEventListener('click', handleExport);
  qs(SELECTORS.importBtn).addEventListener('click', handleImport);
  qs(SELECTORS.importFile).addEventListener('change', handleImportFile);

  setupCounters();
}

function init() {
  const theme = loadTheme();
  document.documentElement.setAttribute('data-theme', theme);

  loadState();
  boardEl = qs(SELECTORS.board);
  if (!boardEl) return;

  initDragDrop(boardEl);
  onCardMoved(() => renderBoard());
  bindEvents();
  renderBoard();
}

document.addEventListener('DOMContentLoaded', init);
