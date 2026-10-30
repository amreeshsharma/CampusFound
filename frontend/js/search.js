/**
 * CampusFind 2.0 - Live Search & Filter Coordinator
 * Coordinates debounced backend searches across lost and found catalogs
 */

document.addEventListener('DOMContentLoaded', () => {
  initLiveSearch();
});

function initLiveSearch() {
  const searchInput = document.getElementById('search-items-input');
  const itemsContainer = document.getElementById('items-grid-container');

  if (!searchInput || !itemsContainer) return;

  let debounceTimer;

  searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const query = e.target.value.trim();
      const pageType = itemsContainer.getAttribute('data-item-type') || '';
      const categoryFilter = document.getElementById('category-filter');
      const locationFilter = document.getElementById('location-filter');

      const filters = {
        type: pageType,
        search: query
      };

      if (categoryFilter && categoryFilter.value) filters.category_id = categoryFilter.value;
      if (locationFilter && locationFilter.value) filters.location = locationFilter.value;

      if (typeof fetchAndRenderItems === 'function') {
        fetchAndRenderItems(itemsContainer, filters);
      }
    }, 300);
  });
}
