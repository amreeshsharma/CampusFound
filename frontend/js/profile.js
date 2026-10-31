/**
 * CampusFind 2.0 - User Profile Controller
 * Connected to Express REST API /api/auth/profile & /api/auth/change-password
 */

document.addEventListener('DOMContentLoaded', () => {
  initProfilePage();
});

async function initProfilePage() {
  const session = getUserSession();
  if (!session || !session.user) {
    showToast('Please sign in to view your profile.', 'warning');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 600);
    return;
  }

  const nameInput = document.getElementById('profile-name');
  const emailInput = document.getElementById('profile-email');
  const studentIdInput = document.getElementById('profile-student-id');
  const deptInput = document.getElementById('profile-dept');

  // Fill from cache initially
  if (nameInput) nameInput.value = session.user.name || '';
  if (emailInput) emailInput.value = session.user.email || '';
  if (studentIdInput) studentIdInput.value = session.user.student_id || '';
  if (deptInput) deptInput.value = session.user.department || '';

  // Synchronize with backend API
  try {
    const res = await authFetch(`${CONFIG.API_BASE_URL}/auth/me`);

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.user) {
        setUserSession(data.user, session.token);
        if (nameInput) nameInput.value = data.user.name;
        if (emailInput) emailInput.value = data.user.email;
        if (studentIdInput) studentIdInput.value = data.user.student_id || '';
        if (deptInput) deptInput.value = data.user.department || '';
      }
    }
  } catch (err) {
    console.warn('Profile sync notice:', err.message);
  }

  // Handle Profile Update Form Submission
  const profileForm = document.getElementById('profile-info-form');
  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const updatedName = nameInput.value.trim();
      const updatedDept = deptInput.value.trim();
      const updatedStudentId = studentIdInput.value.trim();

      try {
        const response = await authFetch(`${CONFIG.API_BASE_URL}/auth/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: updatedName,
            department: updatedDept,
            student_id: updatedStudentId
          })
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Failed to update profile.');
        }

        setUserSession(result.user, session.token);
        showToast('Profile information updated successfully in database.', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  // Handle Password Change Form Submission
  const passwordForm = document.getElementById('profile-password-form');
  if (passwordForm) {
    passwordForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const newPass = document.getElementById('profile-new-pass').value;
      const confirmPass = document.getElementById('profile-confirm-pass').value;

      if (newPass.length < 6) {
        showToast('Password must be at least 6 characters long.', 'error');
        return;
      }

      if (newPass !== confirmPass) {
        showToast('New passwords do not match.', 'error');
        return;
      }

      const currentPassword = prompt('For security, please enter your current password to confirm:');
      if (!currentPassword) {
        showToast('Password change cancelled.', 'info');
        return;
      }

      try {
        const response = await authFetch(`${CONFIG.API_BASE_URL}/auth/change-password`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            currentPassword,
            newPassword: newPass,
            confirmPassword: confirmPass
          })
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Failed to update password.');
        }

        showToast('Password updated securely with bcrypt hash.', 'success');
        passwordForm.reset();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }
}
