/**
 * CampusFind 2.0 - Authentication UI Controller
 * Connected to Express REST API & MySQL Backend with JWT + HTTP-only cookies
 * Includes seamless offline fallback for file:// browser previews
 */

document.addEventListener('DOMContentLoaded', () => {
  setupLoginForm();
  setupRegisterForm();
  setupPasswordToggles();
});

// Setup Login Form with Real Backend API Integration
function setupLoginForm() {
  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
      showToast('Please enter both college email and password.', 'error');
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Signing In...';

    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Receive and store HTTP-only JWT cookie
        body: JSON.stringify({ email, password })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Login failed. Please check your credentials.');
      }

      // Save user session in localStorage for client-side rendering
      setUserSession(result.user, result.token);
      showToast(`Welcome back, ${result.user.name}!`, 'success');

      setTimeout(() => {
        if (result.user.role === 'admin') {
          window.location.href = 'admin-dashboard.html';
        } else {
          window.location.href = 'dashboard.html';
        }
      }, 700);
    } catch (err) {
      console.warn('Login network or server notice:', err);

      // Graceful fallback if backend is offline or blocked on file:// protocol
      if (err.message.includes('fetch') || err.message.includes('Network') || window.location.protocol === 'file:') {
        showToast('Connecting in Offline Preview Mode (To use live MySQL, visit http://localhost:5000)', 'warning', 5000);
        
        const role = email.toLowerCase().includes('admin') ? 'admin' : 'student';
        const name = role === 'admin' ? 'Campus Security Admin' : 'Rahul Sharma';

        const mockUser = {
          id: role === 'admin' ? 3 : 1,
          name: name,
          email: email,
          role: role,
          department: 'Computer Science & Engineering',
          student_id: '23CSE089'
        };

        setUserSession(mockUser, 'preview_jwt_token_local');
        setTimeout(() => {
          window.location.href = role === 'admin' ? 'admin-dashboard.html' : 'dashboard.html';
        }, 1000);
      } else {
        showToast(err.message, 'error');
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
  });
}

// Setup Register Form with Real Backend API Integration
function setupRegisterForm() {
  const form = document.getElementById('register-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('reg-name').value.trim();
    const student_id = document.getElementById('reg-student-id').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const department = document.getElementById('reg-dept').value;
    const password = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('reg-confirm-password').value;
    const terms = document.getElementById('reg-terms').checked;

    if (!name || !student_id || !email || !password) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }

    if (password !== confirmPassword) {
      showToast('Passwords do not match. Please verify.', 'error');
      return;
    }

    if (!terms) {
      showToast('You must agree to the Campus Code of Conduct.', 'warning');
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Creating Account...';

    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          name,
          email,
          password,
          confirmPassword,
          student_id,
          department
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Registration failed.');
      }

      setUserSession(result.user, result.token);
      showToast('Registration successful! Welcome to CampusFind.', 'success');

      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 800);
    } catch (err) {
      console.warn('Registration network or server notice:', err);

      if (err.message.includes('fetch') || err.message.includes('Network') || window.location.protocol === 'file:') {
        showToast('Registered in Offline Preview Mode. (To use live MySQL, visit http://localhost:5000)', 'warning', 5000);
        const newUser = {
          id: Math.floor(Math.random() * 900) + 100,
          name,
          student_id,
          email,
          department,
          role: 'student'
        };
        setUserSession(newUser, 'preview_jwt_token_local');
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 1000);
      } else {
        showToast(err.message, 'error');
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
  });
}

// Quick Fill Demo Credentials (Populates real MySQL seeded accounts for presentations)
function fillDemoCredentials(role) {
  const emailInput = document.getElementById('login-email');
  const passInput = document.getElementById('login-password');

  if (!emailInput || !passInput) return;

  if (role === 'admin') {
    emailInput.value = 'admin@campusfind.edu';
    passInput.value = 'admin123';
    showToast('Admin demo credentials populated.', 'info');
  } else {
    emailInput.value = 'student@campus.edu';
    passInput.value = 'student123';
    showToast('Student demo credentials populated.', 'info');
  }
}

// Password Visibility Toggle
function setupPasswordToggles() {
  const toggles = document.querySelectorAll('.btn-toggle-password');
  toggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
      const input = toggle.closest('.input-password-wrapper').querySelector('input');
      if (input.type === 'password') {
        input.type = 'text';
        toggle.textContent = '🔒';
      } else {
        input.type = 'password';
        toggle.textContent = '👁';
      }
    });
  });
}
