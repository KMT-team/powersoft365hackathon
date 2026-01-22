/**
 * flow.js - Landing Page Theme Toggle & Scroll Animations
 * 
 * Manages:
 * 1. Theme persistence (light/dark mode) with system preference fallback
 * 2. Scroll-triggered reveal animations using Intersection Observer
 */

// Initialize theme immediately before page render to prevent flash
(function () {
  const stored = localStorage.getItem("theme");
  const systemLight = window.matchMedia("(prefers-color-scheme: light)").matches;
  const theme = stored ?? (systemLight ? "light" : "dark");
  document.documentElement.setAttribute("data-theme", theme);
})();

document.addEventListener("DOMContentLoaded", () => {
  const themeToggle = document.getElementById("theme-toggle");
  const themeIcon = themeToggle?.querySelector("i");
  const systemTheme = window.matchMedia("(prefers-color-scheme: light)");
  let hasManualTheme =
    localStorage.getItem("theme") === "light" ||
    localStorage.getItem("theme") === "dark";

  /**
   * Update theme toggle icon based on current theme
   */
  function updateThemeIcon() {
    const isLight = document.documentElement.getAttribute("data-theme") === "light";
    if (isLight) {
      themeIcon.classList.remove("fa-moon");
      themeIcon.classList.add("fa-sun");
    } else {
      themeIcon.classList.remove("fa-sun");
      themeIcon.classList.add("fa-moon");
    }
  }

  /**
   * Apply theme by setting data-theme attribute
   * @param {string} theme - "light" or "dark"
   */
  function applyTheme(theme) {
    if (theme === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    updateThemeIcon();
  }

  /**
   * Initialize theme from storage or system preference
   */
  function initTheme() {
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme === "light" || storedTheme === "dark") {
      applyTheme(storedTheme);
      return;
    }
    applyTheme(systemTheme.matches ? "light" : "dark");
  }

  // Toggle theme on button click
  if (themeToggle && themeIcon) {
    themeToggle.addEventListener("click", () => {
      const isLight = document.documentElement.getAttribute("data-theme") === "light";
      const nextTheme = isLight ? "dark" : "light";
      localStorage.setItem("theme", nextTheme);
      hasManualTheme = true;
      applyTheme(nextTheme);
    });
  }

  // Respond to system theme changes if no manual override
  systemTheme.addEventListener("change", (event) => {
    if (hasManualTheme) return;
    applyTheme(event.matches ? "light" : "dark");
  });

  initTheme();

  // ==================== SCROLL ANIMATIONS ====================
  const steps = document.querySelectorAll(".flow-step");
  const revealSections = document.querySelectorAll(".reveal-section");
  
  // Fallback for browsers without Intersection Observer
  if (!("IntersectionObserver" in window)) {
    steps.forEach((step) => step.classList.add("is-visible"));
    revealSections.forEach((section) => section.classList.add("is-visible"));
    return;
  }

  /**
   * Observer that adds 'is-visible' class when element scrolls into view
   * Triggers fade-in and slide animations via CSS transitions
   */
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
        }
      });
    },
    {
      threshold: 0.2,
    }
  );

  steps.forEach((step) => observer.observe(step));
  revealSections.forEach((section) => observer.observe(section));
});
