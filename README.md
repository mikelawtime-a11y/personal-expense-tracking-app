# Personal Expense Tracker

A simple, privacy-first expense tracking web app that runs entirely in the browser — no backend, no sign-up, no data leaves your device.

**Live demo:** `https://<your-username>.github.io/<repo-name>/`

---

## Features

- **Add / Edit / Delete** expenses with amount, category, date, and description
- **8 categories:** Food, Transport, Housing, Health, Entertainment, Shopping, Education, Other
- **Dashboard** — monthly total, budget progress bar, top category, recent expenses
- **Expense list** — search, filter by category & date range, sort, paginated scroll
- **Reports** — doughnut chart (category breakdown) + bar chart (monthly trend)
- **CSV export** of your current filtered view
- **Settings** — custom currency symbol (€ £ ¥ ₹ …) and monthly budget
- **Persistent** — data stored in browser `localStorage`, survives page refresh
- **Responsive** — works on desktop, tablet, and mobile

---

## Tech Stack

| Piece | Library / Version |
|---|---|
| Styling | Bootstrap 5.3.3 (CDN) |
| Icons | Bootstrap Icons 1.11.3 (CDN) |
| Charts | Chart.js 4.4.3 (CDN) |
| Logic | Vanilla JavaScript (ES6+) |
| Storage | `localStorage` |
| Hosting | GitHub Pages |

No build tools, no npm, no bundler — just open `index.html`.

---

## File Structure

```
/
├── index.html          ← Single-page app shell + modals
├── css/
│   └── styles.css      ← Custom styles on top of Bootstrap
├── js/
│   ├── storage.js      ← localStorage read/write helpers
│   ├── expenses.js     ← CRUD logic + data queries
│   ├── charts.js       ← Chart.js wrappers
│   └── app.js          ← UI wiring, rendering, event handlers
└── README.md
```

---

## Local Usage

Just open `index.html` in any modern browser — no server needed.

---

## Deploy to GitHub Pages (Free Hosting)

1. Create a new GitHub repository (e.g. `expense-tracker`)
2. Push all files to the `main` branch:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<username>/expense-tracker.git
   git push -u origin main
   ```
3. Go to **Settings → Pages → Source → Deploy from branch**
4. Select **Branch: main** and **Folder: / (root)** → Save
5. Your app is live at:
   ```
   https://<username>.github.io/expense-tracker/
   ```

---

## Data & Privacy

All data is stored locally in your browser's `localStorage` under two keys:

| Key | Contents |
|---|---|
| `et_expenses` | Array of expense records |
| `et_settings` | Currency symbol and monthly budget |

Clearing browser site data or clicking **Settings → Clear All Data** will erase everything.
