document.addEventListener("DOMContentLoaded", async () => {
    // Auth Check - Use backend instead of localStorage
    try {
        const response = await fetch('/api/check-auth', {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            // Not authenticated, redirect to login
            window.location.href = "/login";
            return;
        }

        const data = await response.json();
        console.log('Authenticated as:', data.email);
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = "/login";
        return;
    }

    // Logout - Use backend logout endpoint
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            try {
                await fetch('/api/logout', {
                    method: 'POST',
                    credentials: 'include'
                });
                // Redirect to home after logout
                window.location.href = "/";
            } catch (error) {
                console.error('Logout error:', error);
                alert('Logout failed. Please try again.');
            }
        });
    }

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

    // Sidebar Navigation
    const navItems = document.querySelectorAll(".sidebar-nav .nav-item");
    const pageTitle = document.getElementById("page-title");

    navItems.forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            navItems.forEach(nav => nav.classList.remove("active"));
            item.classList.add("active");

            // Update Title based on company
            const companyName = item.querySelector("span").innerText;
            pageTitle.innerText = `Explore Simulations - ${companyName}`;

            // Optional: You could shuffle cards here or filter them to simulate different data
        });
    });

    // Card Details Toggle Logic
    const infoBtns = document.querySelectorAll(".info-btn");

    infoBtns.forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const card = btn.closest(".flow-card");

            // Toggle the show-details class
            card.classList.toggle("show-details");

            // Optional: Toggle icon state?
            const icon = btn.querySelector("i");
            if (card.classList.contains("show-details")) {
                icon.classList.remove("fa-circle-info");
                icon.classList.add("fa-circle-xmark");
            } else {
                icon.classList.remove("fa-circle-xmark");
                icon.classList.add("fa-circle-info");
            }
        });
    });
});
