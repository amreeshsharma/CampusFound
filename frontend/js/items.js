/**
 * CampusFind 2.0 - Items Management & Live Backend Integration
 * Fully connected to Express REST APIs and MySQL database with image uploads
 * Includes automatic resilience for both live server and offline preview
 */

document.addEventListener('DOMContentLoaded', () => {
  initCategoriesDropdown();
  initItemsPage();
  initItemDetailsPage();
  initReportFormSubmission();
  initReportFormDropzones();
});

// Load real categories from GET /api/categories into dropdown filters
async function initCategoriesDropdown() {
  const categoryFilter = document.getElementById('category-filter');
  const formCategorySelect = document.getElementById('lost-category') || document.getElementById('found-category');

  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/categories`);
    if (!res.ok) return;

    const result = await res.json();
    if (!result.success || !result.data) return;

    // Populate filter dropdown
    if (categoryFilter) {
      categoryFilter.innerHTML = '<option value="">All Categories</option>' +
        result.data.map(c => `<option value="${c.id}">${c.category_name}</option>`).join('');
    }

    // Populate report form dropdown
    if (formCategorySelect) {
      formCategorySelect.innerHTML = '<option value="">Select Category</option>' +
        result.data.map(c => `<option value="${c.id}">${c.category_name}</option>`).join('');
    }
  } catch (err) {
    console.warn('Categories API notice:', err.message);
  }
}

// Render items for lost-items.html or found-items.html from MySQL
async function initItemsPage() {
  const container = document.getElementById('items-grid-container');
  if (!container) return;

  const pageType = container.getAttribute('data-item-type') || '';
  await fetchAndRenderItems(container, { type: pageType });

  // Filter change handlers
  const categoryFilter = document.getElementById('category-filter');
  const locationFilter = document.getElementById('location-filter');

  const onFilterChange = () => {
    const filters = { type: pageType };
    if (categoryFilter && categoryFilter.value) filters.category_id = categoryFilter.value;
    if (locationFilter && locationFilter.value) filters.location = locationFilter.value;
    const searchInput = document.getElementById('search-items-input');
    if (searchInput && searchInput.value.trim()) filters.search = searchInput.value.trim();

    fetchAndRenderItems(container, filters);
  };

  if (categoryFilter) categoryFilter.addEventListener('change', onFilterChange);
  if (locationFilter) locationFilter.addEventListener('change', onFilterChange);
}

// Fetch items from backend API with graceful fallback to MOCK_ITEMS if offline
async function fetchAndRenderItems(container, filters = {}) {
  container.innerHTML = `
    <div style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
      <span class="spinner" style="width: 36px; height: 36px;"></span>
      <p style="margin-top: 1rem; color: var(--color-text-muted);">Loading campus belongings...</p>
    </div>
  `;

  try {
    const queryParams = new URLSearchParams();
    if (filters.type) queryParams.append('type', filters.type);
    if (filters.category_id) queryParams.append('category_id', filters.category_id);
    if (filters.location) queryParams.append('location', filters.location);
    if (filters.search) queryParams.append('search', filters.search);

    const res = await fetch(`${CONFIG.API_BASE_URL}/items?${queryParams.toString()}`);
    if (!res.ok) throw new Error('Could not fetch items from live backend.');

    const result = await res.json();
    renderItemsGrid(result.data, container);
  } catch (err) {
    console.warn('Live items fetch notice, falling back to local dataset:', err.message);

    // Filter local mock items gracefully
    let fallback = typeof MOCK_ITEMS !== 'undefined' ? MOCK_ITEMS : [];
    if (filters.type === 'lost') fallback = fallback.filter(i => i.type === 'lost');
    if (filters.type === 'found') fallback = fallback.filter(i => i.type === 'found');
    if (filters.search) {
      const q = filters.search.toLowerCase();
      fallback = fallback.filter(i => i.title.toLowerCase().includes(q) || i.description.toLowerCase().includes(q));
    }

    // Map properties for consistent rendering
    const normalizedFallback = fallback.map(i => ({
      id: i.id,
      title: i.title,
      description: i.description,
      item_type: i.type,
      category_name: i.category,
      color: i.color,
      location: i.location,
      item_date: i.date,
      image_path: i.image,
      status: i.status,
      qr_token: i.qrToken
    }));

    renderItemsGrid(normalizedFallback, container);
  }
}

function renderItemsGrid(items, container) {
  if (!items || items.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <img src="../assets/images/empty-state.svg" class="empty-state-icon" alt="No items found">
        <h4 class="empty-state-title">No items found matching your filters</h4>
        <p class="empty-state-text">Try adjusting your search criteria or report a new lost/found item.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = items.map(item => {
    const isLost = item.item_type === 'lost';
    const badgeClass = isLost ? 'badge-lost' : 'badge-found';
    const badgeText = isLost ? 'LOST' : 'FOUND';

    // Resolve Image URL
    let imgSrc = '../assets/images/hero-illustration.svg';
    if (item.image_path) {
      if (item.image_path.startsWith('http') || item.image_path.startsWith('../') || item.image_path.startsWith('./')) {
        imgSrc = item.image_path;
      } else {
        imgSrc = `${CONFIG.SERVER_URL}${item.image_path}`;
      }
    }

    // Status Badge
    let statusBadge = '';
    if (item.status === 'claim_pending') statusBadge = '<span class="badge badge-pending">UNDER CLAIM</span>';
    else if (item.status === 'recovered') statusBadge = '<span class="badge badge-recovered">RECOVERED</span>';

    return `
      <article class="item-card">
        <div class="item-card-image-wrap">
          <img src="${imgSrc}" alt="${item.title}" class="item-card-image" onerror="this.src='../assets/images/hero-illustration.svg'">
          <span class="badge ${badgeClass} item-card-badge">${badgeText}</span>
          <span class="item-card-date-badge">📅 ${formatDate(item.item_date)}</span>
        </div>
        <div class="item-card-body">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.35rem;">
            <span class="item-category-pill">${item.category_name || 'General Item'}</span>
            ${statusBadge}
          </div>
          <h3 class="item-title">${item.title}</h3>
          <p class="item-description">${item.description}</p>
          <div class="item-meta">
            <div class="item-meta-item">
              <span>📍</span> <strong>${item.location}</strong>
            </div>
            <div class="item-meta-item">
              <span>🎨</span> Color: ${item.color}
            </div>
            ${item.qr_token ? `
              <div class="item-meta-item" style="color: var(--primary-color, #004953); font-weight:600;">
                <span>📱</span> Tag: <code>${item.qr_token}</code>
              </div>
            ` : ''}
          </div>
          <div style="display: flex; gap: 0.5rem; margin-top: auto;">
            <a href="item-details.html?id=${item.id}" class="btn btn-primary btn-sm btn-block">View Details</a>
            ${!isLost && item.status === 'open' ? `
              <button class="btn btn-secondary btn-sm" onclick="openClaimModal(${item.id})">Claim</button>
            ` : ''}
          </div>
        </div>
      </article>
    `;
  }).join('');
}

// Render Item Details in item-details.html from real MySQL API
async function initItemDetailsPage() {
  const detailsWrap = document.getElementById('item-details-view');
  if (!detailsWrap) return;

  const urlParams = new URLSearchParams(window.location.search);
  const itemId = urlParams.get('id') || 1;

  let item = null;

  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/items/${itemId}`);
    if (res.ok) {
      const result = await res.json();
      item = result.data;
    }
  } catch (err) {
    console.warn('Live item detail fetch notice:', err.message);
  }

  // Fallback to mock item if server unreachable
  if (!item && typeof MOCK_ITEMS !== 'undefined') {
    const foundMock = MOCK_ITEMS.find(i => i.id == itemId) || MOCK_ITEMS[0];
    item = {
      id: foundMock.id,
      title: foundMock.title,
      description: foundMock.description,
      item_type: foundMock.type,
      category_name: foundMock.category,
      color: foundMock.color,
      location: foundMock.location,
      item_date: foundMock.date,
      image_path: foundMock.image,
      status: foundMock.status,
      qr_token: foundMock.qrToken,
      reporter_name: 'Rahul Sharma'
    };
  }

  if (!item) {
    detailsWrap.innerHTML = '<p class="text-error">Item could not be found.</p>';
    return;
  }

  // Populate Fields
  const titleElem = document.getElementById('detail-title');
  const typeBadgeElem = document.getElementById('detail-type-badge');
  const categoryElem = document.getElementById('detail-category');
  const locationElem = document.getElementById('detail-location');
  const dateElem = document.getElementById('detail-date');
  const colorElem = document.getElementById('detail-color');
  const descElem = document.getElementById('detail-description');
  const imageElem = document.getElementById('detail-image');
  const qrBox = document.getElementById('detail-qr-box');
  const claimBtn = document.getElementById('detail-claim-btn');

  if (titleElem) titleElem.textContent = item.title;
  if (categoryElem) categoryElem.textContent = item.category_name || 'General';
  if (locationElem) locationElem.textContent = item.location;
  if (dateElem) dateElem.textContent = formatDate(item.item_date);
  if (colorElem) colorElem.textContent = item.color;
  if (descElem) descElem.textContent = item.description;

  if (imageElem) {
    if (item.image_path) {
      if (item.image_path.startsWith('http') || item.image_path.startsWith('../') || item.image_path.startsWith('./')) {
        imageElem.src = item.image_path;
      } else {
        imageElem.src = `${CONFIG.SERVER_URL}${item.image_path}`;
      }
    } else {
      imageElem.src = '../assets/images/hero-illustration.svg';
    }
  }

  if (typeBadgeElem) {
    typeBadgeElem.className = `badge ${item.item_type === 'lost' ? 'badge-lost' : 'badge-found'}`;
    typeBadgeElem.textContent = item.item_type.toUpperCase();
  }

  if (claimBtn) {
    if (item.item_type === 'found' && item.status === 'open') {
      claimBtn.style.display = 'inline-flex';
      claimBtn.onclick = () => openClaimModal(item.id);
    } else {
      claimBtn.style.display = 'none';
    }
  }

  if (qrBox) {
    if (item.qr_token) {
      qrBox.style.display = 'block';
      const qrTokenText = document.getElementById('detail-qr-token');
      if (qrTokenText) qrTokenText.textContent = item.qr_token;
    } else {
      qrBox.style.display = 'none';
    }
  }
}

// Handle Form Submissions with FormData and Multer Photo Uploads
function initReportFormSubmission() {
  const lostForm = document.getElementById('report-lost-form');
  const foundForm = document.getElementById('report-found-form');

  if (lostForm) {
    lostForm.addEventListener('submit', (e) => handleItemFormSubmit(e, 'lost'));
  }

  if (foundForm) {
    foundForm.addEventListener('submit', (e) => handleItemFormSubmit(e, 'found'));
  }
}

async function handleItemFormSubmit(e, itemType) {
  e.preventDefault();
  const form = e.target;

  const session = getUserSession();
  if (!session || !session.token) {
    showToast('You must be signed in to submit an item report.', 'error');
    setTimeout(() => window.location.href = 'login.html', 800);
    return;
  }

  const submitBtn = form.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner"></span> Uploading & Publishing...';

  const formData = new FormData();
  formData.append('item_type', itemType);

  if (itemType === 'lost') {
    formData.append('title', document.getElementById('lost-title').value.trim());
    formData.append('category_id', document.getElementById('lost-category').value);
    formData.append('color', document.getElementById('lost-color').value.trim());
    formData.append('location', document.getElementById('lost-location').value.trim());
    formData.append('item_date', document.getElementById('lost-date').value);
    formData.append('description', document.getElementById('lost-description').value.trim());
  } else {
    formData.append('title', document.getElementById('found-title').value.trim());
    formData.append('category_id', document.getElementById('found-category').value);
    formData.append('color', document.getElementById('found-color').value.trim());
    formData.append('location', document.getElementById('found-location').value.trim());
    formData.append('item_date', document.getElementById('found-date').value);
    
    const desc = document.getElementById('found-description').value.trim();
    const custody = document.getElementById('found-custody') ? document.getElementById('found-custody').value : '';
    const q = document.getElementById('found-verification-q') ? document.getElementById('found-verification-q').value.trim() : '';
    let fullDesc = desc;
    if (custody) fullDesc += ` [Custody: ${custody}]`;
    if (q) fullDesc += ` [Verification Question: ${q}]`;
    formData.append('description', fullDesc);
  }

  // Append photo file if selected
  const fileInput = document.getElementById('item-image-input');
  if (fileInput && fileInput.files.length > 0) {
    formData.append('image', fileInput.files[0]);
  }

  try {
    const response = await fetch(`${CONFIG.API_BASE_URL}/items`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.token}`
      },
      credentials: 'include',
      body: formData
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Failed to submit item report.');
    }

    showToast(`${itemType === 'lost' ? 'Lost' : 'Found'} item reported successfully to MySQL database!`, 'success', 3500);

    setTimeout(() => {
      window.location.href = itemType === 'lost' ? 'lost-items.html' : 'found-items.html';
    }, 1000);
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnText;
  }
}

// Drag & Drop File Previews
function initReportFormDropzones() {
  const dropzone = document.getElementById('file-dropzone');
  const fileInput = document.getElementById('item-image-input');
  const previewContainer = document.getElementById('file-preview-container');

  if (!dropzone || !fileInput) return;

  dropzone.addEventListener('click', () => fileInput.click());

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
      fileInput.files = e.dataTransfer.files;
      handleFileSelected(fileInput.files[0], previewContainer);
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length) {
      handleFileSelected(fileInput.files[0], previewContainer);
    }
  });
}

function handleFileSelected(file, previewContainer) {
  if (!file || !previewContainer) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    previewContainer.innerHTML = `
      <div class="file-preview">
        <img src="${e.target.result}" alt="Preview" class="preview-thumb">
        <div class="preview-details">
          <div class="preview-name">${file.name}</div>
          <div class="preview-size">${(file.size / 1024).toFixed(1)} KB</div>
        </div>
        <button type="button" class="btn btn-sm btn-outline-secondary" onclick="document.getElementById('file-preview-container').innerHTML=''; document.getElementById('item-image-input').value=''">Remove</button>
      </div>
    `;
    showToast(`Image "${file.name}" ready for upload.`, 'info');
  };
  reader.readAsDataURL(file);
}
