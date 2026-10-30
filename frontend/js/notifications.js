/**
 * CampusFind 2.0 - Notifications Controller
 * Manages notification feed, unread counters, and mark-as-read toggles
 */

document.addEventListener('DOMContentLoaded', () => {
  initNotificationsPage();
});

function initNotificationsPage() {
  const container = document.getElementById('notifications-feed-container');
  if (!container) return;

  // Sample Notifications Dataset for Phase 2 Preview
  const notifications = [
    {
      id: 1,
      title: 'Smart Match Detected! (92%)',
      message: 'A found item "Casio Scientific Calculator" matches your lost report from Mech Lab 3.',
      type: 'match',
      time: '25 minutes ago',
      read: false,
      link: 'item-details.html?id=2'
    },
    {
      id: 2,
      title: 'Claim Approved by Security Admin',
      message: 'Your claim for "Noise Cancelling Earbuds" has been approved. You can collect it at Counter 1.',
      type: 'claim_approved',
      time: 'Yesterday',
      read: false,
      link: 'my-claims.html'
    },
    {
      id: 3,
      title: 'Item Report Received',
      message: 'Your lost report for "Blue Hydro Flask Water Bottle" is now live on the public feed.',
      type: 'info',
      time: '3 days ago',
      read: true,
      link: 'lost-items.html'
    }
  ];

  renderNotifications(notifications, container);

  const markAllBtn = document.getElementById('btn-mark-all-read');
  if (markAllBtn) {
    markAllBtn.addEventListener('click', () => {
      notifications.forEach(n => n.read = true);
      renderNotifications(notifications, container);
      showToast('All notifications marked as read.', 'success');
    });
  }
}

function renderNotifications(items, container) {
  if (!items.length) {
    container.innerHTML = `
      <div class="empty-state">
        <img src="../assets/images/empty-state.svg" class="empty-state-icon" alt="No notifications">
        <h4 class="empty-state-title">No new notifications</h4>
        <p class="empty-state-text">You are all caught up! Updates about matching items and claims will appear here.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = items.map(n => `
    <div class="card card-hover" style="margin-bottom: 0.75rem; border-left: 4px solid ${n.read ? 'var(--color-border)' : 'var(--primary-color)'};">
      <div class="card-body" style="padding: 1rem 1.25rem; display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem;">
        <div>
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
            <h4 style="font-size: 0.9375rem; font-weight: 700;">${n.title}</h4>
            ${!n.read ? '<span class="badge badge-match" style="font-size:0.65rem;">NEW</span>' : ''}
          </div>
          <p style="font-size: 0.8125rem; margin-bottom: 0.35rem; color: var(--color-text-muted);">${n.message}</p>
          <span style="font-size: 0.75rem; color: var(--color-text-light);">⏱ ${n.time}</span>
        </div>
        ${n.link ? `<a href="${n.link}" class="btn btn-outline btn-sm">View</a>` : ''}
      </div>
    </div>
  `).join('');
}

