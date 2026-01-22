document.addEventListener("DOMContentLoaded", () => {
    // Auth Check
    const userStr = localStorage.getItem("user");
    if (!userStr) {
        window.location.href = "login.html";
        return;
    }

    // Logout
    document.getElementById("logout-btn").addEventListener("click", (e) => {
        e.preventDefault();
        localStorage.removeItem("user");
        window.location.href = "index.html";
    });

    // Theme Logic (Shared)
    const themeToggle = document.getElementById("theme-toggle");
    const themeIcon = themeToggle?.querySelector("i");
    const systemTheme = window.matchMedia("(prefers-color-scheme: light)");
    let hasManualTheme =
        localStorage.getItem("theme") === "light" ||
        localStorage.getItem("theme") === "dark";

    function updateThemeIcon() {
        const isLight = document.documentElement.getAttribute("data-theme") === "light";
        if (!themeIcon) return;
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

    if (themeToggle) {
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
});
