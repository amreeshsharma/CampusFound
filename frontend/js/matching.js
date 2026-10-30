/**
 * CampusFind 2.0 - Rule-Based Smart Item Matching Engine (Client UI)
 * Fetches real matching reasons and score calculations from backend API
 */

async function openMatchModalForCurrentItem(itemId) {
  const modal = document.getElementById('match-explanation-modal');
  if (!modal) return;

  const scoreBadge = document.getElementById('match-score-display');
  const reasonsList = document.getElementById('match-reasons-list');

  if (scoreBadge) scoreBadge.textContent = 'Calculating Similarity...';
  if (reasonsList) reasonsList.innerHTML = '<li style="text-align:center;">Analyzing criteria...</li>';

  openModal('match-explanation-modal');

  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/items/${itemId}/matches`);
    if (!res.ok) throw new Error('Could not compute matches.');

    const result = await res.json();
    const matches = result.data || [];

    if (matches.length === 0) {
      if (scoreBadge) scoreBadge.textContent = 'No Matches Above 40%';
      if (reasonsList) {
        reasonsList.innerHTML = `
          <li style="padding: 1rem; text-align: center; color: var(--color-text-muted);">
            No corresponding lost/found item currently meets the 40% similarity threshold.
          </li>
        `;
      }
      return;
    }

    const topMatch = matches[0];
    if (scoreBadge) {
      scoreBadge.textContent = `${topMatch.matchPercentage}% Match with "${topMatch.matchedItem.title}"`;
    }

    if (reasonsList) {
      reasonsList.innerHTML = topMatch.matchingReasons.map(reason => `
        <li style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--color-border-subtle, #F0EDE6);">
          <span>✅ ${reason}</span>
        </li>
      `).join('');
    }
  } catch (err) {
    if (reasonsList) reasonsList.innerHTML = `<li class="text-error">${err.message}</li>`;
  }
}

// Fallback for direct modal call
function openMatchDetailsModal(matchScore, reasons) {
  const urlParams = new URLSearchParams(window.location.search);
  const itemId = urlParams.get('id');
  if (itemId) {
    openMatchModalForCurrentItem(itemId);
  } else {
    openModal('match-explanation-modal');
  }
}
