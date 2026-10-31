/**
 * CampusFind 2.0 - Administrator Dashboard Controller
 * Full governance console connecting to real MySQL APIs & Chart.js analytics
 */

// Global Chart.js instances registry for safe canvas re-renders
let chartInstances = {};

document.addEventListener('DOMContentLoaded', () => {
  initAdminDashboard();
  initAdminTabs();
  loadAdminStats();
  loadAdminClaims();
  loadAdminItems();
  loadAdminUsers();
  loadAdminCategories();
  setupAddCategoryForm();
  initAdminCharts();
});

function initAdminDashboard() {
  const session = getUserSession();
  
  // Security Protection: Require Admin Role
  if (!session || !session.user) {
    showToast('Administrator authentication required.', 'warning');
    setTimeout(() => { window.location.href = 'login.html'; }, 600);
    return;
  }

  if (session.user.role !== 'admin') {
    showToast('Access denied: You do not hold administrator credentials.', 'error', 4500);
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
    return;
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
      if (targetContent) {
        targetContent.classList.add('active');
        // Trigger chart resize / re-render if switching to analytics tab
        if (targetId === 'tab-analytics') {
          setTimeout(() => initAdminCharts(), 100);
        }
      }
    });
  });
}

/**
 * 1. Load Admin KPI Counters & Live Audit Activities
 */
async function loadAdminStats() {
  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/dashboard/admin-stats`, {
      credentials: 'include'
    });

    if (!res.ok) throw new Error('Failed to fetch admin statistics.');

    const result = await res.json();
    const data = result.data;

    if (data.kpis) {
      document.getElementById('admin-stat-users').textContent = data.kpis.total_users || 0;
      document.getElementById('admin-stat-lost').textContent = data.kpis.total_lost || 0;
      document.getElementById('admin-stat-found').textContent = data.kpis.total_found || 0;
      document.getElementById('admin-stat-claims').textContent = data.kpis.total_claims || 0;
      document.getElementById('admin-stat-pending-claims').textContent = data.kpis.pending_claims || 0;
      document.getElementById('admin-stat-resolved').textContent = data.kpis.resolved_cases || 0;
    }

    // Render Recent Activities
    renderAdminActivities(data.recent_activities || []);
  } catch (err) {
    console.warn('Admin stats notice:', err.message);
  }
}

function renderAdminActivities(activities) {
  const container = document.getElementById('admin-activities-container');
  if (!container) return;

  if (!activities || activities.length === 0) {
    container.innerHTML = '<p style="text-align:center; color:var(--color-text-muted); padding:1.5rem;">No recent platform activities recorded.</p>';
    return;
  }

  container.innerHTML = activities.map(act => {
    let bulletColor = 'var(--primary-color)';
    if (act.type === 'lost_report') bulletColor = 'var(--color-danger, #C84B4B)';
    if (act.type === 'found_report') bulletColor = 'var(--color-success, #23865B)';
    if (act.type === 'claim_action') bulletColor = 'var(--color-warning, #D99A36)';

    return `
      <div class="activity-item" style="padding: 0.75rem 0; border-bottom: 1px solid var(--color-border-subtle, #F0EDE6);">
        <div class="activity-bullet" style="background-color: ${bulletColor};"></div>
        <div style="flex: 1;">
          <div style="display: flex; justify-content: space-between; align-items: baseline;">
            <strong style="font-size: 0.875rem;">${act.title}</strong>
            <span style="font-size: 0.75rem; color: var(--color-text-muted);">⏱ ${formatDate(act.created_at)}</span>
          </div>
          <div style="font-size: 0.8125rem; color: var(--color-text-dark); margin-top: 0.15rem;">${act.description}</div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * 2. Load Ownership Claims (Claim Management)
 */
async function loadAdminClaims() {
  const tbody = document.getElementById('admin-claims-tbody');
  if (!tbody) return;

  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/claims`, {
      credentials: 'include'
    });

    if (!res.ok) throw new Error('Could not fetch claims.');

    const result = await res.json();
    const claims = result.data || [];

    if (claims.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:2rem; color:var(--color-text-muted);">No ownership claims currently in the registry.</td></tr>`;
      return;
    }

    tbody.innerHTML = claims.map(c => {
      let statusBadge = 'badge-pending';
      let statusText = 'PENDING AUDIT';

      if (c.status === 'approved') {
        statusBadge = 'badge-approved';
        statusText = 'APPROVED';
      } else if (c.status === 'rejected') {
        statusBadge = 'badge-rejected';
        statusText = 'REJECTED';
      } else if (c.status === 'verified') {
        statusBadge = 'badge-verified';
        statusText = 'VERIFIED';
      }

      const initials = c.claimant_name
        ? c.claimant_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
        : 'ST';

      let actionButtons = '';
      if (c.status === 'pending' || c.status === 'verified') {
        actionButtons = `
          <div style="display: flex; gap: 0.35rem;">
            <button class="btn btn-success btn-sm" onclick="handleAdminApproveClaim(${c.id})">Approve</button>
            <button class="btn btn-danger btn-sm" onclick="handleAdminRejectClaim(${c.id})">Reject</button>
          </div>
        `;
      } else if (c.status === 'approved') {
        actionButtons = `<span style="font-size:0.75rem; color:var(--color-success); font-weight:600;">✅ Handover Verified</span>`;
      } else {
        actionButtons = `<span style="font-size:0.75rem; color:var(--color-text-muted);">❌ Mismatch Audit</span>`;
      }

      return `
        <tr>
          <td><strong>CLM-${c.id}</strong></td>
          <td>
            <div class="table-user-cell">
              <div class="table-user-avatar">${initials}</div>
              <div>
                <div style="font-weight:600;">${c.claimant_name || 'Student'}</div>
                <div style="font-size:0.75rem; color:var(--color-text-muted);">${c.claimant_student_id || c.claimant_email}</div>
              </div>
            </div>
          </td>
          <td>
            <div style="font-weight:600;">${c.item_title}</div>
            <div style="font-size:0.75rem; color:var(--color-text-muted);">${c.category_name || ''} &bull; ${c.color || ''}</div>
          </td>
          <td style="font-size: 0.8125rem; max-width: 260px; line-height: 1.4;">
            "${c.verification_details}"
          </td>
          <td><span class="badge ${statusBadge}">${statusText}</span></td>
          <td>${actionButtons}</td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.warn('Admin claims notice:', err.message);
  }
}

async function handleAdminApproveClaim(claimId) {
  const remarks = prompt(
    'Enter approval remarks & student collection instructions:',
    'Verified ownership match. Available for physical pickup at Security Desk (Counter 1).'
  );
  if (remarks === null) return;

  try {
    const rawId = typeof claimId === 'string' && claimId.startsWith('CLM-') ? claimId.replace('CLM-', '') : claimId;
    const res = await fetch(`${CONFIG.API_BASE_URL}/claims/${rawId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        status: 'approved',
        admin_remarks: remarks
      })
    });

    const result = await res.json();
    if (!res.ok) {
      showToast(result.message || 'Failed to approve claim.', 'error');
      return;
    }

    showToast(`Claim #${rawId} APPROVED! Item marked recovered and student notified.`, 'success', 5000);
    await loadAdminClaims();
    await loadAdminStats();
    await loadAdminItems();
  } catch (err) {
    showToast('Network error while approving claim.', 'error');
  }
}

async function handleAdminRejectClaim(claimId) {
  const reason = prompt(
    'Enter rejection reason for audit log:',
    'Submitted verification details did not match physical item.'
  );
  if (reason === null) return;

  try {
    const rawId = typeof claimId === 'string' && claimId.startsWith('CLM-') ? claimId.replace('CLM-', '') : claimId;
    const res = await fetch(`${CONFIG.API_BASE_URL}/claims/${rawId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        status: 'rejected',
        admin_remarks: reason
      })
    });

    const result = await res.json();
    if (!res.ok) {
      showToast(result.message || 'Failed to reject claim.', 'error');
      return;
    }

    showToast(`Claim #${rawId} REJECTED with audit notes.`, 'info', 4500);
    await loadAdminClaims();
    await loadAdminStats();
  } catch (err) {
    showToast('Network error while rejecting claim.', 'error');
  }
}

/**
 * 3. Load Items Registry (Item Management)
 */
async function loadAdminItems() {
  const tbody = document.getElementById('admin-items-tbody');
  if (!tbody) return;

  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/items`);
    if (!res.ok) throw new Error('Could not fetch items.');

    const result = await res.json();
    const items = result.data || [];

    if (items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:2rem; color:var(--color-text-muted);">No items currently registered.</td></tr>`;
      return;
    }

    tbody.innerHTML = items.map(item => {
      const isLost = item.item_type === 'lost';
      const typeBadge = isLost ? 'badge-lost' : 'badge-found';

      let statusBadge = 'badge-found';
      let statusText = 'OPEN';
      if (item.status === 'claim_pending') {
        statusBadge = 'badge-pending';
        statusText = 'CLAIM PENDING';
      } else if (item.status === 'recovered') {
        statusBadge = 'badge-recovered';
        statusText = 'RECOVERED';
      } else if (item.status === 'closed') {
        statusBadge = 'badge';
        statusText = 'CLOSED';
      }

      return `
        <tr>
          <td>#${item.id}</td>
          <td>
            <strong style="color: var(--primary-color);">${item.title}</strong>
            <div style="font-size:0.75rem; color:var(--color-text-muted);">${formatDate(item.item_date)}</div>
          </td>
          <td><span class="badge ${typeBadge}">${item.item_type.toUpperCase()}</span></td>
          <td>${item.category_name || 'General'}</td>
          <td>${item.location}</td>
          <td>${item.qr_token ? `<code>${item.qr_token}</code>` : '—'}</td>
          <td><span class="badge ${statusBadge}">${statusText}</span></td>
          <td>
            <div style="display:flex; gap:0.35rem;">
              <a href="item-details.html?id=${item.id}" class="btn btn-outline-secondary btn-sm" style="font-size:0.75rem; padding:0.25rem 0.5rem;">View</a>
              <button class="btn btn-danger btn-sm" onclick="handleAdminDeleteItem(${item.id})" style="font-size:0.75rem; padding:0.25rem 0.5rem;">Delete</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.warn('Admin items notice:', err.message);
  }
}

async function handleAdminDeleteItem(itemId) {
  if (!confirm(`Are you sure you want to permanently remove item #${itemId} from the campus registry?`)) {
    return;
  }

  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/items/${itemId}`, {
      method: 'DELETE',
      credentials: 'include'
    });

    const result = await res.json();
    if (!res.ok) {
      showToast(result.message || 'Failed to delete item.', 'error');
      return;
    }

    showToast(`Item #${itemId} removed from registry.`, 'info');
    await loadAdminItems();
    await loadAdminStats();
  } catch (err) {
    showToast('Network error while deleting item.', 'error');
  }
}

/**
 * 4. Load Registered Users (User Management)
 */
async function loadAdminUsers() {
  const tbody = document.getElementById('admin-users-tbody');
  if (!tbody) return;

  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/users`, {
      credentials: 'include'
    });

    if (!res.ok) throw new Error('Could not fetch users.');

    const result = await res.json();
    const users = result.data || [];

    if (users.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:2rem; color:var(--color-text-muted);">No users found.</td></tr>`;
      return;
    }

    tbody.innerHTML = users.map(u => {
      const initials = u.name
        ? u.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
        : 'U';
      const roleBadge = u.role === 'admin'
        ? '<span class="badge badge-match" style="background:var(--primary-color); color:#fff;">ADMIN</span>'
        : '<span class="badge badge-found">STUDENT</span>';

      return `
        <tr>
          <td>
            <div class="table-user-cell">
              <div class="table-user-avatar">${initials}</div>
              <span style="font-weight:600;">${u.name}</span>
            </div>
          </td>
          <td>${u.student_id || '—'}</td>
          <td>${u.email}</td>
          <td>${u.department || 'General'}</td>
          <td>${roleBadge}</td>
          <td style="font-size:0.8125rem; color:var(--color-text-muted);">${formatDate(u.created_at)}</td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.warn('Admin users notice:', err.message);
  }
}

/**
 * 5. Category Management & Add Category Form
 */
async function loadAdminCategories() {
  const tbody = document.getElementById('admin-categories-tbody');
  if (!tbody) return;

  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/categories`);
    if (!res.ok) throw new Error('Could not fetch categories.');

    const result = await res.json();
    const categories = result.data || [];

    tbody.innerHTML = categories.map(cat => `
      <tr>
        <td>#${cat.id}</td>
        <td><strong>${cat.category_name}</strong></td>
        <td style="font-size:0.8125rem; color:var(--color-text-muted);">${cat.description || '—'}</td>
        <td>
          <span class="badge badge-found" style="font-size:0.75rem;">${cat.item_count || 0} Items</span>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.warn('Admin categories notice:', err.message);
  }
}

function setupAddCategoryForm() {
  const form = document.getElementById('admin-add-category-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nameInput = document.getElementById('new-cat-name');
    const descInput = document.getElementById('new-cat-desc');

    const category_name = nameInput ? nameInput.value.trim() : '';
    const description = descInput ? descInput.value.trim() : '';

    if (!category_name) {
      showToast('Category name is required.', 'error');
      return;
    }

    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ category_name, description })
      });

      const result = await res.json();
      if (!res.ok) {
        showToast(result.message || 'Failed to create category.', 'error');
        return;
      }

      showToast(`Category "${category_name}" added successfully!`, 'success');
      form.reset();
      await loadAdminCategories();
    } catch (err) {
      showToast('Network error while adding category.', 'error');
    }
  });
}

/**
 * 6. Visual Analytics with Chart.js (Real MySQL Data)
 */
async function initAdminCharts() {
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js CDN library is not available.');
    return;
  }

  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/dashboard/analytics`, {
      credentials: 'include'
    });

    if (!res.ok) return;

    const result = await res.json();
    const analytics = result.data;
    if (!analytics) return;

    // Destroy existing chart instances to prevent canvas flickering / memory leaks
    Object.keys(chartInstances).forEach(key => {
      if (chartInstances[key]) {
        chartInstances[key].destroy();
      }
    });

    // Chart 1: Lost vs Found Distribution (Doughnut)
    const lostFoundCanvas = document.getElementById('chart-lost-found');
    if (lostFoundCanvas && analytics.lostVsFound) {
      chartInstances['lostFound'] = new Chart(lostFoundCanvas, {
        type: 'doughnut',
        data: {
          labels: analytics.lostVsFound.labels,
          datasets: [{
            data: analytics.lostVsFound.counts,
            backgroundColor: [
              '#C84B4B', // Coral Red (Lost)
              '#004953'  // Deep Teal (Found)
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

    // Chart 2: Monthly Item Reports (Bar Chart)
    const monthlyCanvas = document.getElementById('chart-monthly-trends');
    if (monthlyCanvas && analytics.monthlyReports) {
      chartInstances['monthly'] = new Chart(monthlyCanvas, {
        type: 'bar',
        data: {
          labels: analytics.monthlyReports.labels,
          datasets: [
            {
              label: 'Reported Lost',
              data: analytics.monthlyReports.lost,
              backgroundColor: 'rgba(200, 75, 75, 0.85)',
              borderRadius: 6
            },
            {
              label: 'Found in Custody',
              data: analytics.monthlyReports.found,
              backgroundColor: 'rgba(0, 73, 83, 0.85)',
              borderRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { beginAtZero: true, ticks: { stepSize: 1 } }
          },
          plugins: {
            legend: { position: 'bottom' }
          }
        }
      });
    }

    // Chart 3: Claim Status Distribution (Doughnut)
    const claimCanvas = document.getElementById('chart-claim-status');
    if (claimCanvas && analytics.claimStatus) {
      chartInstances['claimStatus'] = new Chart(claimCanvas, {
        type: 'doughnut',
        data: {
          labels: analytics.claimStatus.labels,
          datasets: [{
            data: analytics.claimStatus.counts,
            backgroundColor: [
              '#D99A36', // Pending Amber
              '#23865B', // Approved Emerald
              '#C84B4B', // Rejected Red
              '#004953'  // Verified Teal
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

    // Chart 4: Item Categories Distribution (Bar Chart)
    const categoryCanvas = document.getElementById('chart-categories');
    if (categoryCanvas && analytics.categoriesDistribution) {
      chartInstances['categories'] = new Chart(categoryCanvas, {
        type: 'bar',
        data: {
          labels: analytics.categoriesDistribution.labels,
          datasets: [{
            label: 'Reported Items',
            data: analytics.categoriesDistribution.counts,
            backgroundColor: '#004953',
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { beginAtZero: true, ticks: { stepSize: 1 } }
          },
          plugins: {
            legend: { display: false }
          }
        }
      });
    }

  } catch (err) {
    console.warn('Analytics visuals notice:', err.message);
  }
}
