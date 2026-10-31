/**
 * CampusFind 2.0 - Notifications Controller
 * Manages live notification feed, unread badge counters, and real MySQL mark-as-read toggles
 */

document.addEventListener('DOMContentLoaded', () => {
  initNotificationsPage();
});

async function initNotificationsPage() {
  const container = document.getElementById('notifications-feed-container');
  if (!container) return;

  const session = getUserSession();
  if (!session) {
    container.innerHTML = `
      <div class="empty-state">
        <img src="../assets/images/empty-state.svg" class="empty-state-icon" alt="Login required">
        <h4 class="empty-state-title">Sign in to view your notifications</h4>
        <p class="empty-state-text">Receive real-time match alerts and claim resolution updates.</p>
        <a href="login.html" class="btn btn-primary btn-sm">Log In</a>
      </div>
    `;
    return;
  }

  await loadNotifications(container);

  // Mark all as read button
  const markAllBtn = document.getElementById('btn-mark-all-read');
  if (markAllBtn) {
    markAllBtn.addEventListener('click', async () => {
      try {
        const res = await fetch(`${CONFIG.API_BASE_URL}/notifications/read-all`, {
          method: 'PUT',
          credentials: 'include'
        });
        const result = await res.json();
        if (res.ok) {
          showToast('All notifications marked as read.', 'success');
          await loadNotifications(container);
          // Update navbar badge
          const navBadge = document.getElementById('navbar-unread-badge');
          if (navBadge) navBadge.style.display = 'none';
        } else {
          showToast(result.message || 'Failed to update notifications.', 'error');
        }
      } catch (err) {
        showToast('Network error while marking notifications as read.', 'error');
      }
    });
  }
}

async function loadNotifications(container) {
  container.innerHTML = `
    <div style="text-align: center; padding: 3rem;">
      <span class="spinner" style="width: 32px; height: 32px;"></span>
      <p style="margin-top: 0.75rem; color: var(--color-text-muted); font-size: 0.875rem;">Loading notification feed...</p>
    </div>
  `;

  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/notifications`, {
      credentials: 'include'
    });

    if (res.status === 401) {
      window.location.href = 'login.html';
      return;
    }

    if (!res.ok) throw new Error('Could not load notifications from API.');

    const result = await res.json();
    renderNotificationsList(result.data || [], container);

    // Update unread count in header if element exists
    const unreadPill = document.getElementById('notifications-unread-pill');
    if (unreadPill) {
      unreadPill.textContent = `${result.unread_count || 0} Unread`;
      unreadPill.style.display = result.unread_count > 0 ? 'inline-block' : 'none';
    }

    // Update sidebar badge
    const sidebarBadge = document.querySelector('.sidebar-link.active .sidebar-badge');
    if (sidebarBadge) {
      sidebarBadge.textContent = result.unread_count || 0;
      sidebarBadge.style.display = result.unread_count > 0 ? 'inline-block' : 'none';
    }
  } catch (err) {
    console.warn('Notifications fetch notice, falling back to local dataset:', err.message);

    // Offline preview fallback
    const fallbackNotifications = [
      {
        id: 1,
        message: 'A found item "Casio Scientific Calculator" matches your lost report from Mech Lab 3.',
        notification_type: 'match',
        is_read: 0,
        created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString()
      },
      {
        id: 2,
        message: 'Your claim for "Noise Cancelling Earbuds" has been approved. Collect it at Security Desk Counter 1.',
        notification_type: 'claim_approved',
        is_read: 0,
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 3,
        message: 'Your lost report for "Blue Hydro Flask Water Bottle" is now live on the public feed.',
        notification_type: 'general',
        is_read: 1,
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    renderNotificationsList(fallbackNotifications, container);
  }
}

function renderNotificationsList(notifications, container) {
  if (!notifications.length) {
    container.innerHTML = `
      <div class="empty-state">
        <img src="../assets/images/empty-state.svg" class="empty-state-icon" alt="No notifications">
        <h4 class="empty-state-title">No notifications yet</h4>
        <p class="empty-state-text">You are all caught up! Updates regarding matching items, claim audits, and handover statuses will appear here.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = notifications.map(n => {
    const isUnread = !n.is_read;
    let icon = '🔔';
    let typeBadge = '<span class="badge" style="font-size:0.65rem;">GENERAL</span>';

    if (n.notification_type === 'match') {
      icon = '🎯';
      typeBadge = '<span class="badge badge-match" style="font-size:0.65rem;">SMART MATCH</span>';
    } else if (n.notification_type === 'claim_approved') {
      icon = '✅';
      typeBadge = '<span class="badge badge-approved" style="font-size:0.65rem;">CLAIM APPROVED</span>';
    } else if (n.notification_type === 'claim_rejected') {
      icon = '❌';
      typeBadge = '<span class="badge badge-rejected" style="font-size:0.65rem;">CLAIM REJECTED</span>';
    } else if (n.notification_type === 'claim_submitted') {
      icon = '📑';
      typeBadge = '<span class="badge badge-pending" style="font-size:0.65rem;">CLAIM RECORDED</span>';
    } else if (n.notification_type === 'item_recovered') {
      icon = '🏆';
      typeBadge = '<span class="badge badge-recovered" style="font-size:0.65rem;">ITEM RECOVERED</span>';
    }

    const formattedTime = formatDate(n.created_at);

    return `
      <div class="card card-hover" style="margin-bottom: 0.75rem; border-left: 4px solid ${isUnread ? 'var(--primary-color, #004953)' : 'var(--color-border, #E2D9CC)'}; background: ${isUnread ? '#FFFFFF' : '#FAF8F5'};">
        <div class="card-body" style="padding: 1rem 1.25rem; display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem;">
          <div style="display: flex; gap: 0.85rem; align-items: flex-start; flex: 1;">
            <div style="font-size: 1.4rem; line-height: 1; padding-top: 0.15rem;">${icon}</div>
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem; flex-wrap: wrap;">
                ${typeBadge}
                ${isUnread ? '<span class="badge badge-match" style="font-size:0.6rem; background: var(--color-error, #C84B4B); color:#fff;">UNREAD</span>' : ''}
                <span style="font-size: 0.75rem; color: var(--color-text-muted);">⏱ ${formattedTime}</span>
              </div>
              <p style="font-size: 0.875rem; margin: 0; line-height: 1.5; color: var(--color-text-dark);">${n.message}</p>
            </div>
          </div>
          <div style="display: flex; gap: 0.35rem; align-items: center;">
            ${isUnread ? `
              <button class="btn btn-outline-secondary btn-sm" onclick="handleMarkSingleRead(${n.id})" style="font-size: 0.75rem; padding: 0.25rem 0.5rem;" title="Mark as read">
                ✓ Read
              </button>
            ` : ''}
            <button class="btn btn-outline-secondary btn-sm" onclick="handleDeleteNotification(${n.id})" style="font-size: 0.75rem; padding: 0.25rem 0.5rem; color: var(--color-error);" title="Delete notification">
              🗑
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function handleMarkSingleRead(notifId) {
  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/notifications/${notifId}/read`, {
      method: 'PUT',
      credentials: 'include'
    });
    if (res.ok) {
      showToast('Notification marked as read.', 'info');
      const container = document.getElementById('notifications-feed-container');
      if (container) await loadNotifications(container);
    }
  } catch (err) {
    console.error('Mark read error:', err);
  }
}

async function handleDeleteNotification(notifId) {
  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/notifications/${notifId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (res.ok) {
      showToast('Notification removed.', 'info');
      const container = document.getElementById('notifications-feed-container');
      if (container) await loadNotifications(container);
    }
  } catch (err) {
    console.error('Delete notification error:', err);
  }
}
