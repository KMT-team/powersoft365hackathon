/**
 * login.js - Authentication UI Controller
 * 
 * Handles:
 * 1. Login/Register toggle with form switching
 * 2. API calls to /api/login, /api/register, /api/guest
 * 3. Theme persistence (light/dark mode)
 * 4. Form validation and error display
 * 5. Password visibility toggle
 */

document.addEventListener("DOMContentLoaded", () => {
  // ==================== DOM ELEMENTS ====================
  const authBox = document.querySelector(".auth-box");
  const form = document.querySelector("form");
  const toggleText = document.getElementById("toggle-text");
  const emailLabel = document.getElementById("email-label");
  const authTitle = document.getElementById("auth-title");
  const authDesc = document.getElementById("auth-description");
  const primaryBtn = document.getElementById("primary-button");
  const forgotLink = document.getElementById("forgot-link");
  const guestLink = document.getElementById("guest-link");
  const registerUsername = document.querySelector('input[name="username"]');
  const confirmPassword = document.getElementById("confirm-password-input");

  // ==================== THEME TOGGLE ====================
  const themeToggle = document.getElementById("theme-toggle");
  const themeIcon = themeToggle.querySelector("i");
  const systemTheme = window.matchMedia("(prefers-color-scheme: light)");
  let hasManualTheme =
    localStorage.getItem("theme") === "light" ||
    localStorage.getItem("theme") === "dark";

  // ==================== COPY CONFIG ====================
  /**
   * Text and labels for login vs register modes
   * Switched dynamically when user toggles between modes
   */
  const modeCopy = {
    login: {
      emailLabel: "Email or username",
      title: 'Welcome, <span class="accent">learner</span>.',
      description: "Sign in or create an account to continue.",
      primary: "Sign in",
      toggle: 'New here? <a href="#" id="toggle-link">Create an account</a>',
      forgotVisible: true,
    },
    register: {
      emailLabel: "Email",
      title: "Create your free account",
      description: 'And start <span class="accent">learning</span> today.',
      primary: "Sign up",
      toggle: '<a href="#" id="toggle-link">I already have an account</a>',
      forgotVisible: false,
    },
  };

  /**
   * Update theme icon (sun/moon) based on current theme
   */
  function updateThemeIcon() {
    const isLight =
      document.documentElement.getAttribute("data-theme") === "light";
    if (isLight) {
      themeIcon.className = "fa-solid fa-lightbulb";
    } else {
      themeIcon.className = "fa-solid fa-moon";
    }
  }

  function applyTheme(theme) {
    if (theme === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    updateThemeIcon();
  }

  function initTheme() {
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme === "light" || storedTheme === "dark") {
      applyTheme(storedTheme);
      return;
    }
    applyTheme(systemTheme.matches ? "light" : "dark");
  }

  function setMode(mode) {
    const copy = modeCopy[mode];
    if (!copy) return;

    authBox.dataset.mode = mode;
    emailLabel.textContent = copy.emailLabel;
    authTitle.innerHTML = copy.title;
    authDesc.innerHTML = copy.description;
    primaryBtn.textContent = copy.primary;
    toggleText.innerHTML = copy.toggle;
    forgotLink.style.display = copy.forgotVisible ? "inline" : "none";

    registerUsername.disabled = mode !== "register";
    confirmPassword.disabled = mode !== "register";
  }

  function showError(fieldName, message) {
    const errorEl = document.querySelector(`[data-error-for="${fieldName}"]`);
    const inputEl = document.querySelector(`[name="${fieldName}"]`);

    if (!errorEl || !inputEl) return;

    errorEl.textContent = message;
    errorEl.classList.add("visible");
    inputEl.classList.add("error-input");
  }

  function clearErrors() {
    document.querySelectorAll(".error").forEach((el) => {
      el.textContent = "";
      el.classList.remove("visible");
    });

    document.querySelectorAll(".error-input").forEach((el) => {
      el.classList.remove("error-input");
    });
  }

  toggleText.addEventListener("click", (e) => {
    const toggleLink = e.target.closest("#toggle-link");
    if (!toggleLink) return;
    e.preventDefault();
    const next = authBox.dataset.mode === "login" ? "register" : "login";
    setMode(next);
  });

  // Guest login - clear localStorage before redirecting
  guestLink.addEventListener("click", async (e) => {
    e.preventDefault();

    // Clear all classroom and exercise data for guest users
    localStorage.removeItem('sim_inventory_v1');
    localStorage.removeItem('sim_inventory_logs_v1');
    localStorage.removeItem('exercise_progress_v1');
    localStorage.removeItem('exercise_completions_v1');
    localStorage.removeItem('exercise_hints_enabled_v1');

    try {
      const res = await fetch("/api/guest", {
        method: "POST",
        credentials: "include"
      });

      if (res.ok) {
        window.location.href = "/dashboard.html";
      } else {
        alert("Guest login failed");
      }
    } catch (err) {
      alert("Network error");
    }
  });

  document.querySelectorAll(".toggle-password").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = btn.previousElementSibling;
      const icon = btn.querySelector("i");

      if (input.type === "password") {
        input.type = "text";
        icon.classList.remove("fa-eye-slash");
        icon.classList.add("fa-eye");
      } else {
        input.type = "password";
        icon.classList.remove("fa-eye");
        icon.classList.add("fa-eye-slash");
      }
    });
  });

  themeToggle.addEventListener("click", () => {
    const isLight =
      document.documentElement.getAttribute("data-theme") === "light";
    const nextTheme = isLight ? "dark" : "light";
    localStorage.setItem("theme", nextTheme);
    hasManualTheme = true;
    applyTheme(nextTheme);
  });

  systemTheme.addEventListener("change", (event) => {
    if (hasManualTheme) return;
    applyTheme(event.matches ? "light" : "dark");
  });

  form.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", () => {
      const errorEl = document.querySelector(`[data-error-for="${input.name}"]`);
      if (errorEl) {
        errorEl.textContent = "";
        errorEl.classList.remove("visible");
        input.classList.remove("error-input");
      }
    });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    clearErrors();

    const mode = authBox.dataset.mode;
    const identifier = form.querySelector('[name="identifier"]').value.trim();
    const password = form.querySelector('[name="password"]').value.trim();
    const username = form.querySelector('[name="username"]')?.value.trim();
    const confirmValue = form
      .querySelector('[name="confirmPassword"]')
      ?.value.trim();

    let hasError = false;

    if (!identifier) {
      showError("identifier", "Please enter your email or username");
      hasError = true;
    }

    if (!password) {
      showError("password", "Please enter your password");
      hasError = true;
    }

    if (mode === "register") {
      if (!username) {
        showError("username", "Please choose a username");
        hasError = true;
      }

      if (!confirmValue) {
        showError("confirmPassword", "Please confirm your password");
        hasError = true;
      }

      if (password && confirmValue && password !== confirmValue) {
        showError("confirmPassword", "Passwords do not match");
        hasError = true;
      }
    }

    if (hasError) return;

    // (Katerina) ADDED: Backend API integration - sends form data to server
    // Calls /api/register or /api/login based on mode, receives session cookie on success
    try {
      const endpoint = mode === "register" ? "/api/register" : "/api/login";
      const body = mode === "register"
        ? { identifier, username, password, confirmPassword: confirmValue }
        : { identifier, password };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body)
      });

      if (response.ok) {
        window.location.href = "/dashboard.html";
      } else {
        const text = await response.text();
        showError("password", text || "Authentication failed");
      }
    } catch (err) {
      showError("password", "Network error");
    }
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest("input") && !e.target.closest(".error")) {
      clearErrors();
    }
  });

  initTheme();
  setMode("login");
});
