/**
 * storage.js — localStorage helpers
 */
const Storage = (() => {
  const EXPENSES_KEY = 'et_expenses';
  const SETTINGS_KEY = 'et_settings';

  const DEFAULT_SETTINGS = {
    currency: '$',
    monthlyBudget: 0,
  };

  function getExpenses() {
    try {
      const raw = localStorage.getItem(EXPENSES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveExpenses(expenses) {
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
  }

  function getSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      return raw
        ? Object.assign({}, DEFAULT_SETTINGS, JSON.parse(raw))
        : Object.assign({}, DEFAULT_SETTINGS);
    } catch {
      return Object.assign({}, DEFAULT_SETTINGS);
    }
  }

  function saveSettings(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  function clearAll() {
    localStorage.removeItem(EXPENSES_KEY);
    localStorage.removeItem(SETTINGS_KEY);
  }

  return { getExpenses, saveExpenses, getSettings, saveSettings, clearAll };
})();
