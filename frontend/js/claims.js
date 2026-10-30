/**
 * CampusFind 2.0 - Ownership Claim Controller
 * Handles claim submission modal, verification details, and claims tracking in my-claims.html
 */

document.addEventListener('DOMContentLoaded', () => {
  initClaimsPage();
  setupClaimForm();
});

function openClaimModal(itemId) {
  const item = MOCK_ITEMS.find(i => i.id === itemId) || MOCK_ITEMS[0];
  const modalItemTitle = document.getElementById('claim-modal-item-title');
  const modalItemId = document.getElementById('claim-item-id-input');

  if (modalItemTitle) modalItemTitle.textContent = item.title;
  if (modalItemId) modalItemId.value = item.id;

  openModal('claim-submission-modal');
}

function setupClaimForm() {
  const form = document.getElementById('claim-submission-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const verificationAnswer = document.getElementById('claim-verification-details').value.trim();
    const contactPhone = document.getElementById('claim-contact-phone').value.trim();

    if (!verificationAnswer) {
      showToast('Please provide descriptive ownership details or answers to verification questions.', 'error');
      return;
    }

    closeModal('claim-submission-modal');
    showToast('Your ownership claim has been submitted for Admin verification! Track it under "My Claims".', 'success', 4500);

    form.reset();
  });
}

function initClaimsPage() {
  const container = document.getElementById('claims-list-container');
  if (!container) return;

  // Phase 2 Sample Claims Dataset for UI Preview
  const claims = [
    {
      id: 'CLM-1092',
      itemTitle: 'Casio Scientific Calculator fx-991EX',
      category: 'Electronics',
      submittedDate: '2026-10-29',
      status: 'pending',
      verificationDetails: 'Has sticker "Rahul S." on rear battery cover with minor scratch on top left.',
      adminRemarks: 'Pending physical inspection at Campus Security Desk.'
    },
    {
      id: 'CLM-1044',
      itemTitle: 'Noise Cancelling Wireless Earbuds Case',
      category: 'Electronics',
      submittedDate: '2026-10-27',
      status: 'approved',
      verificationDetails: 'Left earbud has minor dent near charging contact; case serial number starts with SN-78.',
      adminRemarks: 'Approved! Verified serial number match. Available for pickup at Security Desk (Counter 1).'
    },
    {
      id: 'CLM-0988',
      itemTitle: 'Stainless Steel Water Flask',
      category: 'Bottles & Containers',
      submittedDate: '2026-10-22',
      status: 'rejected',
      verificationDetails: 'Silver color with superhero stickers.',
      adminRemarks: 'Color and stickers did not match deposited item.'
    }
  ];

  renderClaimsTable(claims, container);
}

function renderClaimsTable(claims, container) {
  if (!claims.length) {
    container.innerHTML = `
      <div class="empty-state">
        <img src="../assets/images/empty-state.svg" class="empty-state-icon" alt="No claims found">
        <h4 class="empty-state-title">No ownership claims submitted yet</h4>
        <p class="empty-state-text">When you find your lost belonging in the Found Items catalog, submit an ownership claim to verify and recover it.</p>
        <a href="found-items.html" class="btn btn-primary btn-sm">Browse Found Items</a>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="table-responsive">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Claim ID</th>
            <th>Item Details</th>
            <th>Submission Date</th>
            <th>Verification Details</th>
            <th>Claim Status</th>
            <th>Admin Remarks</th>
          </tr>
        </thead>
        <tbody>
          ${claims.map(c => {
            let statusBadge = 'badge-pending';
            if (c.status === 'approved') statusBadge = 'badge-approved';
            if (c.status === 'rejected') statusBadge = 'badge-rejected';

            return `
              <tr>
                <td><strong>${c.id}</strong></td>
                <td>
                  <div style="font-weight:600;">${c.itemTitle}</div>
                  <div style="font-size:0.75rem; color:var(--color-text-muted);">${c.category}</div>
                </td>
                <td>${formatDate(c.submittedDate)}</td>
                <td style="max-width:280px; font-size:0.8125rem;">${c.verificationDetails}</td>
                <td><span class="badge ${statusBadge}">${c.status.toUpperCase()}</span></td>
                <td style="font-size:0.8125rem; color: ${c.status === 'approved' ? 'var(--color-success)' : 'inherit'};">
                  ${c.adminRemarks}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

