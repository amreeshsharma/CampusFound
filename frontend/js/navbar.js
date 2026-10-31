/**
 * CampusFind 2.0 - Navbar Controller
 * Handles mobile hamburger toggle, active link highlights, user dropdown, real API logout
 */

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
});

function initNavbar() {
  const toggleBtn = document.querySelector('.nav-toggle');
  const navMenu = document.querySelector('.nav-menu');

  if (toggleBtn && navMenu) {
    toggleBtn.addEventListener('click', () => {
      toggleBtn.classList.toggle('open');
      navMenu.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
      if (!navMenu.contains(e.target) && !toggleBtn.contains(e.target) && navMenu.classList.contains('active')) {
        toggleBtn.classList.remove('open');
        navMenu.classList.remove('active');
      }
    });
  }

  // Highlight active page link
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href && (href === currentPath || href.endsWith(currentPath))) {
      link.classList.add('active');
    }
  });

  // Render auth state in navbar actions container
  updateNavbarAuth();
}

function updateNavbarAuth() {
  const authContainer = document.querySelector('.navbar-actions');
  if (!authContainer) return;

  const session = getUserSession();
  const isPagesFolder = window.location.pathname.includes('/pages/');
  const pagesPrefix = isPagesFolder ? '' : 'pages/';

  if (session && session.user) {
    const initials = session.user.name
      ? session.user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
      : 'U';

    authContainer.innerHTML = `
      <a href="${pagesPrefix}report-lost.html" class="btn btn-outline btn-sm">Report Lost</a>
      <a href="${pagesPrefix}report-found.html" class="btn btn-secondary btn-sm">Report Found</a>
      <a href="${pagesPrefix}notifications.html" class="nav-notification-link" title="Notifications" style="position: relative; font-size: 1.15rem; text-decoration: none; padding: 0.25rem 0.5rem; display: inline-flex; align-items: center;">
        <span>🔔</span>
        <span class="nav-unread-badge" id="navbar-unread-badge" style="display:none; position: absolute; top: 0; right: 2px; background: var(--color-error, #C84B4B); color: #fff; font-size: 0.625rem; font-weight: 700; border-radius: 999px; padding: 1px 5px; min-width: 14px; text-align: center; line-height: 1.3;"></span>
      </a>
      <div class="nav-user">
        <div class="user-avatar-small" title="${session.user.name}">${initials}</div>
        <div class="user-dropdown">
          <div style="padding: 0.5rem 1rem; border-bottom: 1px solid var(--color-border-subtle, #F0EDE6);">
            <div style="font-weight:700; font-size: 0.875rem;">${session.user.name}</div>
            <div style="font-size: 0.75rem; color: var(--color-text-muted, #687B7D);">${session.user.email}</div>
          </div>
          <a href="${pagesPrefix}dashboard.html" class="dropdown-item">📊 Student Dashboard</a>
          ${session.user.role === 'admin' ? `<a href="${pagesPrefix}admin-dashboard.html" class="dropdown-item">🛡️ Admin Console</a>` : ''}
          <a href="${pagesPrefix}profile.html" class="dropdown-item">👤 Profile & Settings</a>
          <a href="${pagesPrefix}my-claims.html" class="dropdown-item">📑 My Claims</a>
          <div class="dropdown-divider"></div>
          <a href="#" onclick="handleLogout(event)" class="dropdown-item" style="color: var(--color-error, #C84B4B);">🚪 Sign Out</a>
        </div>
      </div>
    `;

    // Fetch unread count for navbar badge
    authFetch(`${CONFIG.API_BASE_URL}/notifications/unread-count`)
      .then(res => res.json())
      .then(result => {
        if (result.success && result.unread_count > 0) {
          const badge = document.getElementById('navbar-unread-badge');
          if (badge) {
            badge.textContent = result.unread_count > 99 ? '99+' : result.unread_count;
            badge.style.display = 'inline-block';
          }
        }
      })
      .catch(() => {});
  }
}

async function handleLogout(e) {
  if (e) e.preventDefault();
  try {
    await fetch(`${CONFIG.API_BASE_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    });
  } catch (err) {
    console.warn('Logout API network notice:', err.message);
  } finally {
    clearUserSession();
    showToast('You have been signed out safely.', 'info');
    setTimeout(() => {
      const isPagesFolder = window.location.pathname.includes('/pages/');
      window.location.href = isPagesFolder ? 'login.html' : 'pages/login.html';
    }, 500);
  }
}
