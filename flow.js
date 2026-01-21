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

  if (themeToggle && themeIcon) {
    themeToggle.addEventListener("click", () => {
      const isLight = document.documentElement.getAttribute("data-theme") === "light";
      const nextTheme = isLight ? "dark" : "light";
      localStorage.setItem("theme", nextTheme);
      hasManualTheme = true;
      applyTheme(nextTheme);
    });
  }

  systemTheme.addEventListener("change", (event) => {
    if (hasManualTheme) return;
    applyTheme(event.matches ? "light" : "dark");
  });

  initTheme();

  const steps = document.querySelectorAll(".flow-step");
  const revealSections = document.querySelectorAll(".reveal-section");
  if (!("IntersectionObserver" in window)) {
    steps.forEach((step) => step.classList.add("is-visible"));
    revealSections.forEach((section) => section.classList.add("is-visible"));
    return;
  }

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
