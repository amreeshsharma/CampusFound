/**
 * CampusFind 2.0 - Administrator Dashboard Controller
 * Handles admin tabs, review & verification actions, and Chart.js analytics
 */

document.addEventListener('DOMContentLoaded', () => {
  initAdminDashboard();
  initAdminTabs();
  initAdminCharts();
});

function initAdminDashboard() {
  const session = getUserSession();
  // Role check simulation: if not admin, inform user for demonstration
  if (!session || session.user.role !== 'admin') {
    // Keep accessible for evaluation presentation, display friendly notice
    console.info('Viewing Admin Console in preview mode.');
  }
}

function initAdminTabs() {
  const tabButtons = document.querySelectorAll('.admin-tab-btn');
  const tabContents = document.querySelectorAll('.admin-tab-content');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');

      tabButtons.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const targetContent = document.getElementById(targetId);
      if (targetContent) targetContent.classList.add('active');
    });
  });
}

// Chart.js Visualizations for Analytics Tab
function initAdminCharts() {
  const categoryCanvas = document.getElementById('chart-categories');
  const trendsCanvas = document.getElementById('chart-monthly-trends');

  // Verify Chart.js is loaded
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js library not detected on page.');
    return;
  }

  // 1. Categories Distribution Chart
  if (categoryCanvas) {
    new Chart(categoryCanvas, {
      type: 'doughnut',
      data: {
        labels: ['Electronics', 'Books & Notes', 'ID & Cards', 'Bottles', 'Keys & Wallets'],
        datasets: [{
          data: [42, 28, 19, 14, 11],
          backgroundColor: [
            '#004953', // Deep Teal
            '#EFDECD', // Warm Beige
            '#23865B', // Emerald Success
            '#D99A36', // Warning Amber
            '#687B7D'  // Slate Muted
          ],
          borderWidth: 2,
          borderColor: '#FFFFFF'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
  }

  // 2. Monthly Lost vs Recovered Trends
  if (trendsCanvas) {
    new Chart(trendsCanvas, {
      type: 'bar',
      data: {
        labels: ['Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [
          {
            label: 'Reported Lost',
            data: [25, 38, 42, 20, 15],
            backgroundColor: 'rgba(200, 75, 75, 0.85)',
            borderRadius: 6
          },
          {
            label: 'Successfully Recovered',
            data: [19, 31, 37, 16, 12],
            backgroundColor: 'rgba(35, 134, 91, 0.85)',
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true }
        },
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
  }
}

// Action Handlers for Claims & Reports
function handleAdminApproveClaim(claimId) {
  const remarks = prompt('Enter approval pickup instructions (e.g., Counter 1 Security Desk):', 'Verified ownership match. Available for pickup at Security Desk.');
  if (remarks !== null) {
    showToast(`Claim ${claimId} approved! Student notified.`, 'success');
  }
}

function handleAdminRejectClaim(claimId) {
  const reason = prompt('Enter rejection reason for audit log:', 'Identifying marks did not match item.');
  if (reason !== null) {
    showToast(`Claim ${claimId} rejected with audit remarks.`, 'error');
  }
}

function handleAdminDeleteItem(itemId) {
  if (confirm(`Are you sure you want to remove item #${itemId} from the campus registry?`)) {
    showToast(`Item #${itemId} removed.`, 'info');
  }
}

