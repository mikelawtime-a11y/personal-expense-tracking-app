/**
 * app.js — Main application logic: UI wiring, rendering, events
 */
const App = (() => {

  /* ── Category helpers ─────────────────── */
  const CATEGORY_EMOJI = {
    Food: '🍔', Transport: '🚗', Housing: '🏠', Health: '💊',
    Entertainment: '🎬', Shopping: '🛍️', Education: '📚', Other: '📦',
  };
  const CATEGORIES = Object.keys(CATEGORY_EMOJI);

  /* ── State ────────────────────────────── */
  let currentTab         = 'dashboard';
  let activeRange        = 'this-month';
  let pendingDeleteId    = null;
  let pendingCallback    = null;

  /* ── Bootstrap instances ──────────────── */
  let expenseModal, confirmModal, bsToast;

  /* ── Init ─────────────────────────────── */
  function init() {
    expenseModal = new bootstrap.Modal(document.getElementById('expenseModal'));
    confirmModal = new bootstrap.Modal(document.getElementById('confirmModal'));
    bsToast      = new bootstrap.Toast(document.getElementById('appToast'), { delay: 3000 });

    populateCategoryFilter();
    setDefaultDate();
    syncCurrencySymbol();
    bindEvents();
    renderDashboard();
  }

  /* ── Event Binding ────────────────────── */
  function bindEvents() {
    // Tab navigation
    document.querySelectorAll('[data-tab]').forEach(link => {
      link.addEventListener('click', e => { e.preventDefault(); switchTab(link.dataset.tab); });
    });

    // Add expense buttons
    document.getElementById('btn-add-expense').addEventListener('click',   () => openAddModal());
    document.getElementById('btn-add-expense-2').addEventListener('click', () => openAddModal());

    // Save expense
    document.getElementById('btn-save-expense').addEventListener('click', saveExpense);

    // Form: clear validation state on change
    ['expense-amount', 'expense-category', 'expense-date'].forEach(id => {
      document.getElementById(id).addEventListener('change', () => {
        document.getElementById(id).classList.remove('is-invalid');
      });
    });

    // Filters — live
    ['filter-category', 'filter-date-from', 'filter-date-to', 'filter-sort'].forEach(id => {
      document.getElementById(id).addEventListener('change', renderExpensesList);
    });
    document.getElementById('filter-search').addEventListener('input', renderExpensesList);

    // Export CSV
    document.getElementById('btn-export-csv').addEventListener('click', exportCSV);

    // Range buttons (Reports)
    document.querySelectorAll('.range-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeRange = btn.dataset.range;
        renderReports();
      });
    });

    // Settings
    document.getElementById('btn-save-settings').addEventListener('click', saveSettings);
    document.getElementById('btn-clear-data').addEventListener('click', () => {
      openConfirm('Delete ALL expenses and reset settings? This cannot be undone.', 'Yes, clear all', () => {
        Storage.clearAll();
        syncCurrencySymbol();
        renderAll();
        showToast('All data cleared.', 'danger');
      });
    });

    // Confirm dialog "yes" button
    document.getElementById('btn-confirm-yes').addEventListener('click', () => {
      confirmModal.hide();
      if (pendingDeleteId) {
        Expenses.remove(pendingDeleteId);
        pendingDeleteId = null;
        renderAll();
        showToast('Expense deleted.', 'danger');
      } else if (pendingCallback) {
        const cb = pendingCallback;
        pendingCallback = null;
        cb();
      }
    });

    // Reset form when modal fully closes
    document.getElementById('expenseModal').addEventListener('hidden.bs.modal', resetForm);
  }

  /* ── Tab Switching ────────────────────── */
  function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab-view').forEach(el => {
      el.classList.toggle('d-none', el.id !== 'view-' + tab);
    });
    document.querySelectorAll('[data-tab]').forEach(link => {
      link.classList.toggle('active', link.dataset.tab === tab);
    });
    if (tab === 'dashboard') renderDashboard();
    if (tab === 'expenses')  renderExpensesList();
    if (tab === 'reports')   renderReports();
    if (tab === 'settings')  loadSettingsForm();
  }

  /* ── Dashboard ────────────────────────── */
  function renderDashboard() {
    const settings   = Storage.getSettings();
    const currency   = settings.currency || '$';
    const budget     = parseFloat(settings.monthlyBudget) || 0;
    const thisMonth  = Expenses.getThisMonthTotal();
    const allExpenses = Expenses.getAll();

    // Cards
    document.getElementById('dash-this-month').textContent  = fmt(thisMonth, currency);
    document.getElementById('dash-total-count').textContent = allExpenses.length;

    const budgetLeftEl = document.getElementById('dash-budget-left');
    if (budget > 0) {
      const left = budget - thisMonth;
      budgetLeftEl.textContent  = fmt(Math.abs(left), currency) + (left < 0 ? ' over' : '');
      budgetLeftEl.className    = 'fw-bold fs-6 text-truncate ' + (left < 0 ? 'text-danger' : 'text-success');
    } else {
      budgetLeftEl.textContent = '—';
      budgetLeftEl.className   = 'fw-bold fs-6 text-truncate text-muted';
    }

    const topCat = Expenses.getTopCategory(allExpenses);
    document.getElementById('dash-top-category').textContent =
      topCat ? (CATEGORY_EMOJI[topCat] || '') + ' ' + topCat : '—';

    // Budget progress bar
    const bar       = document.getElementById('dash-budget-bar');
    const barLabel  = document.getElementById('dash-budget-label');
    if (budget > 0) {
      const pct = Math.min((thisMonth / budget) * 100, 100);
      bar.style.width  = pct + '%';
      bar.className    = 'progress-bar' + (pct >= 100 ? ' bg-danger' : pct >= 80 ? ' bg-warning' : '');
      barLabel.textContent = currency + thisMonth.toFixed(2) + ' of ' + currency + budget.toFixed(2);
    } else {
      bar.style.width      = '0%';
      bar.className        = 'progress-bar';
      barLabel.textContent = 'No budget set';
    }

    // Recent 5 expenses
    const recent    = Expenses.getFiltered({ sort: 'date-desc' }).slice(0, 5);
    const container = document.getElementById('dash-recent-list');
    if (!recent.length) {
      container.innerHTML = emptyState('bi-receipt', 'No expenses yet.<br>Tap <strong>Add Expense</strong> to get started!');
    } else {
      container.innerHTML = recent.map(e => expenseItemHTML(e, currency)).join('');
      wireListButtons(container);
    }
  }

  /* ── Expenses List ────────────────────── */
  function renderExpensesList() {
    const settings  = Storage.getSettings();
    const currency  = settings.currency || '$';
    const filters   = {
      search:   document.getElementById('filter-search').value,
      category: document.getElementById('filter-category').value,
      dateFrom: document.getElementById('filter-date-from').value,
      dateTo:   document.getElementById('filter-date-to').value,
      sort:     document.getElementById('filter-sort').value,
    };

    const list      = Expenses.getFiltered(filters);
    const container = document.getElementById('expenses-list-container');
    const footer    = document.getElementById('expenses-count-label');

    if (!list.length) {
      container.innerHTML = emptyState('bi-search', 'No expenses match your filters.');
      footer.textContent  = '';
    } else {
      container.innerHTML = list.map(e => expenseItemHTML(e, currency)).join('');
      wireListButtons(container);
      const total = list.reduce((s, e) => s + e.amount, 0);
      footer.textContent  = `${list.length} expense${list.length !== 1 ? 's' : ''} · Total: ${fmt(total, currency)}`;
    }
  }

  /* ── Reports ──────────────────────────── */
  function renderReports() {
    const allExpenses    = Expenses.getAll();
    const rangeExpenses  = filterByRange(allExpenses, activeRange);
    const categoryTotals = Expenses.getCategoryTotals(rangeExpenses);

    // Pie — filtered by range
    Charts.renderPie(categoryTotals);

    // Bar — always all expenses, last 6 months for context
    Charts.renderBar(Expenses.getMonthlyTotals(allExpenses, 6));

    // Stats table
    const settings     = Storage.getSettings();
    const currency     = settings.currency || '$';
    const statsEl      = document.getElementById('reports-stats-table');
    const grandTotal   = rangeExpenses.reduce((s, e) => s + e.amount, 0);

    if (!rangeExpenses.length) {
      statsEl.innerHTML = emptyState('bi-bar-chart', 'No data for this period.');
      return;
    }

    statsEl.innerHTML = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amt]) => {
        const pct   = grandTotal > 0 ? (amt / grandTotal) * 100 : 0;
        const color = Charts.colorFor(cat);
        return `
          <div class="stat-row">
            <span class="stat-dot" style="background:${color}"></span>
            <span class="stat-name">${CATEGORY_EMOJI[cat] || '📦'} ${escapeHTML(cat)}</span>
            <div class="stat-track">
              <div class="stat-fill" style="width:${pct.toFixed(1)}%;background:${color}"></div>
            </div>
            <span class="stat-amount">${fmt(amt, currency)}</span>
            <span class="stat-pct">${pct.toFixed(1)}%</span>
          </div>`;
      })
      .join('');
  }

  function filterByRange(expenses, range) {
    const now = new Date();
    switch (range) {
      case 'this-month': {
        const prefix = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
        return expenses.filter(e => e.date.startsWith(prefix));
      }
      case 'last-3': {
        const d = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        const from = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-01';
        return expenses.filter(e => e.date >= from);
      }
      case 'this-year':
        return expenses.filter(e => e.date.startsWith(String(now.getFullYear())));
      default:
        return expenses;
    }
  }

  /* ── Settings ─────────────────────────── */
  function loadSettingsForm() {
    const s = Storage.getSettings();
    document.getElementById('setting-currency').value = s.currency    || '$';
    document.getElementById('setting-budget').value   = s.monthlyBudget > 0 ? s.monthlyBudget : '';
  }

  function saveSettings() {
    const currency = document.getElementById('setting-currency').value.trim() || '$';
    const budget   = parseFloat(document.getElementById('setting-budget').value) || 0;
    Storage.saveSettings({ currency, monthlyBudget: budget });
    syncCurrencySymbol();
    showToast('Settings saved!', 'success');
  }

  function syncCurrencySymbol() {
    const currency = Storage.getSettings().currency || '$';
    document.getElementById('amount-currency-symbol').textContent = currency;
  }

  /* ── Add / Edit Modal ─────────────────── */
  function openAddModal() {
    document.getElementById('expenseModalLabel').textContent   = 'Add Expense';
    document.getElementById('btn-save-label').textContent      = 'Save';
    document.getElementById('expense-id').value                = '';
    setDefaultDate();
    expenseModal.show();
  }

  function openEditModal(id) {
    const e = Expenses.getById(id);
    if (!e) return;
    document.getElementById('expenseModalLabel').textContent   = 'Edit Expense';
    document.getElementById('btn-save-label').textContent      = 'Update';
    document.getElementById('expense-id').value                = e.id;
    document.getElementById('expense-amount').value            = e.amount;
    document.getElementById('expense-category').value          = e.category;
    document.getElementById('expense-date').value              = e.date;
    document.getElementById('expense-description').value       = e.description;
    expenseModal.show();
  }

  function saveExpense() {
    const amountEl   = document.getElementById('expense-amount');
    const categoryEl = document.getElementById('expense-category');
    const dateEl     = document.getElementById('expense-date');
    const amount     = parseFloat(amountEl.value);
    const category   = categoryEl.value;
    const date       = dateEl.value;

    // Manual validation
    let valid = true;
    if (!amount || amount <= 0) { amountEl.classList.add('is-invalid');   valid = false; }
    else                         { amountEl.classList.remove('is-invalid'); }
    if (!category)               { categoryEl.classList.add('is-invalid'); valid = false; }
    else                         { categoryEl.classList.remove('is-invalid'); }
    if (!date)                   { dateEl.classList.add('is-invalid');     valid = false; }
    else                         { dateEl.classList.remove('is-invalid'); }
    if (!valid) return;

    const data = {
      amount, category, date,
      description: document.getElementById('expense-description').value,
    };

    const id = document.getElementById('expense-id').value;
    if (id) {
      Expenses.update(id, data);
      showToast('Expense updated!', 'success');
    } else {
      Expenses.add(data);
      showToast('Expense added!', 'success');
    }

    expenseModal.hide();
    renderAll();
  }

  function resetForm() {
    document.getElementById('expense-form').reset();
    ['expense-amount', 'expense-category', 'expense-date'].forEach(id => {
      document.getElementById(id).classList.remove('is-invalid');
    });
    document.getElementById('expense-id').value = '';
  }

  function setDefaultDate() {
    document.getElementById('expense-date').value = new Date().toISOString().slice(0, 10);
  }

  /* ── Delete Confirm ───────────────────── */
  function confirmDelete(id) {
    pendingDeleteId = id;
    pendingCallback = null;
    document.getElementById('confirm-message').textContent       = 'Delete this expense?';
    document.getElementById('btn-confirm-yes').textContent       = 'Yes, delete';
    confirmModal.show();
  }

  function openConfirm(message, btnLabel, callback) {
    pendingDeleteId = null;
    pendingCallback = callback;
    document.getElementById('confirm-message').textContent  = message;
    document.getElementById('btn-confirm-yes').textContent  = btnLabel || 'Yes';
    confirmModal.show();
  }

  /* ── CSV Export ───────────────────────── */
  function exportCSV() {
    const expenses = Expenses.getFiltered({
      search:   document.getElementById('filter-search').value,
      category: document.getElementById('filter-category').value,
      dateFrom: document.getElementById('filter-date-from').value,
      dateTo:   document.getElementById('filter-date-to').value,
      sort:     document.getElementById('filter-sort').value,
    });

    if (!expenses.length) { showToast('No expenses to export.', 'warning'); return; }

    const header = 'Date,Category,Description,Amount\n';
    const rows   = expenses.map(e => {
      const safeDesc = e.description.replace(/"/g, '""');
      return `${e.date},${e.category},"${safeDesc}",${e.amount.toFixed(2)}`;
    }).join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'expenses-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('CSV exported!', 'success');
  }

  /* ── Rendering Helpers ────────────────── */
  function renderAll() {
    renderDashboard();
    if (currentTab === 'expenses') renderExpensesList();
    if (currentTab === 'reports')  renderReports();
  }

  function wireListButtons(container) {
    container.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => openEditModal(btn.dataset.id));
    });
    container.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => confirmDelete(btn.dataset.id));
    });
  }

  function expenseItemHTML(expense, currency) {
    const emoji = CATEGORY_EMOJI[expense.category] || '📦';
    const color = Charts.colorFor(expense.category);
    const bg    = color + '22'; // ~13% opacity
    const dateStr = new Date(expense.date + 'T00:00:00')
      .toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' });
    const desc  = escapeHTML(expense.description) || expense.category;
    const id    = escapeHTML(expense.id);

    return `
      <div class="expense-item">
        <div class="expense-emoji" style="background:${bg}">${emoji}</div>
        <div class="expense-info">
          <div class="expense-desc">${desc}</div>
          <div class="expense-meta">${escapeHTML(expense.category)} · ${dateStr}</div>
        </div>
        <span class="expense-amount">${fmt(expense.amount, currency)}</span>
        <div class="expense-actions">
          <button class="btn btn-sm btn-outline-secondary btn-edit" data-id="${id}" title="Edit">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger btn-delete" data-id="${id}" title="Delete">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>`;
  }

  function emptyState(icon, message) {
    return `<div class="empty-state"><i class="bi ${icon}"></i><p>${message}</p></div>`;
  }

  function fmt(amount, currency) {
    return (currency || '$') + amount.toFixed(2);
  }

  // Safe HTML escaping to prevent XSS
  function escapeHTML(str) {
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(String(str)));
    return d.innerHTML;
  }

  function populateCategoryFilter() {
    const sel = document.getElementById('filter-category');
    CATEGORIES.forEach(cat => {
      const opt    = document.createElement('option');
      opt.value    = cat;
      opt.textContent = CATEGORY_EMOJI[cat] + ' ' + cat;
      sel.appendChild(opt);
    });
  }

  function showToast(message, type) {
    const map = {
      success: 'bg-success',
      danger:  'bg-danger',
      warning: 'bg-warning text-dark',
      info:    'bg-info text-dark',
    };
    const el = document.getElementById('appToast');
    el.className = 'toast align-items-center text-white border-0 ' + (map[type] || 'bg-success');
    document.getElementById('toast-message').textContent = message;
    bsToast.show();
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', App.init);
