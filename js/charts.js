/**
 * charts.js — Chart.js wrappers for pie and bar charts
 */
const Charts = (() => {

  const CATEGORY_COLORS = {
    Food:          '#f59e0b',
    Transport:     '#3b82f6',
    Housing:       '#8b5cf6',
    Health:        '#10b981',
    Entertainment: '#f97316',
    Shopping:      '#ec4899',
    Education:     '#06b6d4',
    Other:         '#94a3b8',
  };

  function colorFor(category) {
    return CATEGORY_COLORS[category] || '#94a3b8';
  }

  let pieChart = null;
  let barChart = null;

  /* ── Doughnut / Pie ── */
  function renderPie(categoryTotals) {
    const canvas = document.getElementById('chart-pie');
    if (!canvas) return;

    if (pieChart) { pieChart.destroy(); pieChart = null; }

    const labels = Object.keys(categoryTotals);
    const data   = Object.values(categoryTotals);

    if (!labels.length) {
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const currency = Storage.getSettings().currency || '$';

    pieChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: labels.map(colorFor),
          borderWidth: 2,
          borderColor: '#fff',
          hoverOffset: 6,
        }],
      },
      options: {
        responsive: true,
        cutout: '60%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { padding: 14, font: { size: 12 }, usePointStyle: true },
          },
          tooltip: {
            callbacks: {
              label: ctx => {
                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                const pct   = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
                return ` ${currency}${ctx.parsed.toFixed(2)}  (${pct}%)`;
              },
            },
          },
        },
      },
    });
  }

  /* ── Bar ── */
  function renderBar(monthlyData) {
    const canvas = document.getElementById('chart-bar');
    if (!canvas) return;

    if (barChart) { barChart.destroy(); barChart = null; }

    const currency = Storage.getSettings().currency || '$';
    const labels   = monthlyData.map(m => m.label);
    const data     = monthlyData.map(m => m.total);

    barChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Total Spent',
          data,
          backgroundColor: 'rgba(79,70,229,0.75)',
          borderColor:     'rgba(79,70,229,1)',
          borderWidth: 1,
          borderRadius: 5,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` ${currency}${ctx.parsed.y.toFixed(2)}`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: v => currency + v.toLocaleString(),
            },
            grid: { color: '#f1f1f1' },
          },
          x: { grid: { display: false } },
        },
      },
    });
  }

  return { renderPie, renderBar, colorFor };
})();
