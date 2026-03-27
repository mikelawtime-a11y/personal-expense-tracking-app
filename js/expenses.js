/**
 * expenses.js — Expense CRUD and data queries
 */
const Expenses = (() => {

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* ── CRUD ──────────────────────────────── */

  function getAll() {
    return Storage.getExpenses();
  }

  function getById(id) {
    return getAll().find(e => e.id === id) || null;
  }

  function add(data) {
    const expenses = getAll();
    const expense = {
      id:          generateId(),
      amount:      parseFloat(data.amount),
      category:    data.category,
      date:        data.date,
      description: (data.description || '').trim(),
    };
    expenses.unshift(expense);
    Storage.saveExpenses(expenses);
    return expense;
  }

  function update(id, data) {
    const expenses = getAll();
    const i = expenses.findIndex(e => e.id === id);
    if (i === -1) return null;
    expenses[i] = {
      ...expenses[i],
      amount:      parseFloat(data.amount),
      category:    data.category,
      date:        data.date,
      description: (data.description || '').trim(),
    };
    Storage.saveExpenses(expenses);
    return expenses[i];
  }

  function remove(id) {
    Storage.saveExpenses(getAll().filter(e => e.id !== id));
  }

  /* ── Queries ───────────────────────────── */

  function getFiltered({ search = '', category = '', dateFrom = '', dateTo = '', sort = 'date-desc' } = {}) {
    let list = getAll();

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.description.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q)
      );
    }
    if (category)  list = list.filter(e => e.category === category);
    if (dateFrom)  list = list.filter(e => e.date >= dateFrom);
    if (dateTo)    list = list.filter(e => e.date <= dateTo);

    list.sort((a, b) => {
      switch (sort) {
        case 'date-asc':    return a.date.localeCompare(b.date);
        case 'amount-desc': return b.amount - a.amount;
        case 'amount-asc':  return a.amount - b.amount;
        default:            return b.date.localeCompare(a.date); // date-desc
      }
    });

    return list;
  }

  function getThisMonthTotal() {
    const now   = new Date();
    const prefix = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    return getAll()
      .filter(e => e.date.startsWith(prefix))
      .reduce((s, e) => s + e.amount, 0);
  }

  function getTopCategory(expenses) {
    if (!expenses.length) return null;
    const totals = {};
    expenses.forEach(e => { totals[e.category] = (totals[e.category] || 0) + e.amount; });
    return Object.entries(totals).sort((a, b) => b[1] - a[1])[0][0];
  }

  function getCategoryTotals(expenses) {
    const totals = {};
    expenses.forEach(e => { totals[e.category] = (totals[e.category] || 0) + e.amount; });
    return totals;
  }

  /**
   * Returns [{label, total}] for the last `numMonths` calendar months,
   * computed from the supplied expenses array.
   */
  function getMonthlyTotals(expenses, numMonths) {
    numMonths = numMonths || 6;
    const now = new Date();
    const result = [];
    for (let i = numMonths - 1; i >= 0; i--) {
      const d      = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const prefix = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      const label  = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      const total  = expenses
        .filter(e => e.date.startsWith(prefix))
        .reduce((s, e) => s + e.amount, 0);
      result.push({ label, total });
    }
    return result;
  }

  return {
    getAll, getById, add, update, remove,
    getFiltered, getThisMonthTotal,
    getTopCategory, getCategoryTotals, getMonthlyTotals,
  };
})();
