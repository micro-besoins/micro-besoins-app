(function () {
    "use strict";

    /* ------------------------------------------------------------------
     * Configuration
     * ------------------------------------------------------------------ */
    const CONFIG = {
        // Endpoint du back-end. Laisser "auto" pour pointer vers le même hôte,
        // ou renseigner une URL complète (ex: "https://api.microbesoin.fr/login").
        apiUrl: "auto",

        // Chemin de redirection après connexion réussie.
        redirectUrl: "dashboard.html",

        // Mode démo : utile en développement, sans back-end disponible.
        // L'apiUrl est ignoré et la connexion est simulée (actif aussi
        // automatiquement quand la page est ouverte en file://).
        mockMode: false,

        // Comptes acceptés en mode démo (email / mot de passe).
        mock: {
            email: "demo@microbesoin.fr",
            password: "demo1234"
        }
    };

    const REDIRECT_DELAY_MS = 800;

    /* ------------------------------------------------------------------
     * Éléments du DOM
     * ------------------------------------------------------------------ */
    const form = document.getElementById("login-form");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const toggleBtn = document.getElementById("toggle-password");
    const submitBtn = document.getElementById("submit-btn");
    const btnLabel = submitBtn.querySelector(".btn__label");
    const btnSpinner = submitBtn.querySelector(".btn__spinner");
    const apiErrorBox = document.getElementById("api-error");

    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const MIN_PASSWORD_LENGTH = 6;

    /* ------------------------------------------------------------------
     * Afficher / masquer le mot de passe
     * ------------------------------------------------------------------ */
    toggleBtn.addEventListener("click", function () {
        const show = passwordInput.type === "password";
        passwordInput.type = show ? "text" : "password";
        toggleBtn.setAttribute("aria-label", show ? "Masquer le mot de passe" : "Afficher le mot de passe");
        toggleBtn.classList.toggle("is-hidden", show);
    });

    /* ------------------------------------------------------------------
     * Validation côté client
     * ------------------------------------------------------------------ */
    function setFieldState(field, message) {
        const wrapper = field.closest(".form-field");
        const errorEl = wrapper.querySelector("[data-error-for]");
        wrapper.classList.toggle("form-field--invalid", Boolean(message));
        if (errorEl) errorEl.textContent = message || "";
        if (message) field.setAttribute("aria-invalid", "true");
        else field.removeAttribute("aria-invalid");
        return Boolean(message);
    }

    function validateEmail() {
        const value = emailInput.value.trim();
        if (!value) return setFieldState(emailInput, "L'adresse email est obligatoire.");
        if (!EMAIL_RE.test(value)) return setFieldState(emailInput, "Veuillez saisir une adresse email valide.");
        return setFieldState(emailInput, "");
    }

    function validatePassword() {
        const value = passwordInput.value;
        if (!value) return setFieldState(passwordInput, "Le mot de passe est obligatoire.");
        if (value.length < MIN_PASSWORD_LENGTH) {
            return setFieldState(passwordInput, "Le mot de passe doit contenir au moins " + MIN_PASSWORD_LENGTH + " caractères.");
        }
        return setFieldState(passwordInput, "");
    }

    function validateAll() {
        const emailOk = validateEmail();
        const passwordOk = validatePassword();
        return emailOk && passwordOk;
    }

    emailInput.addEventListener("blur", validateEmail);
    passwordInput.addEventListener("blur", validatePassword);
    emailInput.addEventListener("input", function () {
        if (emailInput.closest(".form-field").classList.contains("form-field--invalid")) validateEmail();
    });
    passwordInput.addEventListener("input", function () {
        if (passwordInput.closest(".form-field").classList.contains("form-field--invalid")) validatePassword();
    });

    /* ------------------------------------------------------------------
     * Bandeau d'erreur (retours API)
     * ------------------------------------------------------------------ */
    function showApiError(message) {
        apiErrorBox.textContent = message;
        apiErrorBox.hidden = false;
    }

    function hideApiError() {
        apiErrorBox.hidden = true;
        apiErrorBox.textContent = "";
        apiErrorBox.classList.remove("alert--success");
        apiErrorBox.classList.add("alert--error");
    }

    /* ------------------------------------------------------------------
     * Soumission
     * ------------------------------------------------------------------ */
    function resolveApiUrl() {
        if (CONFIG.apiUrl !== "auto") return CONFIG.apiUrl;
        return window.location.origin + "/api/login";
    }

    function setLoading(loading) {
        submitBtn.disabled = loading;
        btnSpinner.hidden = !loading;
        btnLabel.textContent = loading ? "Connexion en cours…" : "Se connecter";
    }

    function redirect() {
        window.location.href = CONFIG.redirectUrl;
    }

    function extractApiError(payload, status) {
        if (payload && typeof payload.error === "string") return payload.error;
        if (payload && typeof payload.message === "string") return payload.message;
        if (payload && Array.isArray(payload.errors)) return payload.errors.join("\n");
        if (status === 401 || status === 403) return "Email ou mot de passe incorrect.";
        if (status === 422) return "Les données envoyées sont invalides.";
        if (status >= 500) return "Une erreur serveur est survenue. Veuillez réessayer plus tard.";
        return "Une erreur est survenue lors de la connexion.";
    }

    function mockLogin(email, password) {
        return new Promise(function (resolve, reject) {
            setTimeout(function () {
                if (email === CONFIG.mock.email && password === CONFIG.mock.password) {
                    resolve({ ok: true });
                    return;
                }
                const error = new Error("Email ou mot de passe incorrect.");
                error.status = 401;
                reject(error);
            }, 600);
        });
    }

    async function submitLogin(email, password) {
        // Mode démo automatique si activé en config ou si la page est
        // ouverte directement sur le disque (protocole file://), sans back-end.
        if (CONFIG.mockMode || window.location.protocol === "file:") {
            return mockLogin(email, password);
        }

        const response = await fetch(resolveApiUrl(), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email, password: password })
        });

        const payload = await response.json().catch(function () { return null; });

        if (!response.ok) {
            const error = new Error(extractApiError(payload, response.status));
            error.status = response.status;
            throw error;
        }
        return payload;
    }

    form.addEventListener("submit", async function (event) {
        event.preventDefault();
        hideApiError();

        // Validation côté client (champs obligatoires + format email)
        if (!validateAll()) {
            emailInput.focus();
            return;
        }

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        setLoading(true);

        try {
            await submitLogin(email, password);
            setLoading(false);
            showApiError("Connexion réussie, redirection…");
            apiErrorBox.classList.remove("alert--error");
            apiErrorBox.classList.add("alert--success");
            setTimeout(redirect, REDIRECT_DELAY_MS);
        } catch (err) {
            setLoading(false);
            apiErrorBox.classList.remove("alert--success");
            apiErrorBox.classList.add("alert--error");
            let message = err && err.message ? err.message : "Une erreur est survenue lors de la connexion.";
            if (err instanceof TypeError) {
                message = "Impossible de contacter le serveur. Vérifiez qu'il est bien démarré.";
            }
            showApiError(message);
        }
    });
})();