const API_BASE_URL = "http://127.0.0.1:3000/api/v1";

const STORAGE_KEYS = {
  accessToken: "absher_access_token",
  refreshToken: "absher_refresh_token",
  user: "absher_user",
};

const state = {
  currentPage: "welcomePage",
  user: null,
  accessToken: localStorage.getItem(STORAGE_KEYS.accessToken) || "",
  refreshToken: localStorage.getItem(STORAGE_KEYS.refreshToken) || "",
  isRefreshing: false,
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

function showPage(pageId) {
  $$(".page").forEach((page) => {
    page.classList.remove("active");
    page.classList.add("hidden");
  });

  const page = document.getElementById(pageId);

  if (page) {
    page.classList.remove("hidden");
    page.classList.add("active");
    state.currentPage = pageId;
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

function showLoading(message = "جاري التحميل...") {
  const loadingOverlay = $("#loadingOverlay");
  const loadingText = $("#loadingText");

  if (loadingText) {
    loadingText.textContent = message;
  }

  if (loadingOverlay) {
    loadingOverlay.classList.add("active");
  }
}

function hideLoading() {
  const loadingOverlay = $("#loadingOverlay");

  if (loadingOverlay) {
    loadingOverlay.classList.remove("active");
  }
}

function showToast(message, type = "info") {
  const toast = $("#toast");

  if (!toast) {
    return;
  }

  toast.textContent = message;
  toast.className = `toast ${type} show`;

  clearTimeout(window.toastTimer);

  window.toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3500);
}

function showFormMessage(elementId, message, type = "error") {
  const element = document.getElementById(elementId);

  if (!element) {
    return;
  }

  element.textContent = message;
  element.className = `form-message ${type}`;
  element.classList.remove("hidden");
}

function hideFormMessage(elementId) {
  const element = document.getElementById(elementId);

  if (!element) {
    return;
  }

  element.textContent = "";
  element.classList.add("hidden");
}

function saveAuth(data) {
  if (data?.tokens?.accessToken) {
    state.accessToken = data.tokens.accessToken;
    localStorage.setItem(
      STORAGE_KEYS.accessToken,
      data.tokens.accessToken,
    );
  }

  if (data?.tokens?.refreshToken) {
    state.refreshToken = data.tokens.refreshToken;
    localStorage.setItem(
      STORAGE_KEYS.refreshToken,
      data.tokens.refreshToken,
    );
  }

  if (data?.user) {
    state.user = data.user;
    localStorage.setItem(
      STORAGE_KEYS.user,
      JSON.stringify(data.user),
    );
  }
}

function clearAuth() {
  state.accessToken = "";
  state.refreshToken = "";
  state.user = null;

  localStorage.removeItem(STORAGE_KEYS.accessToken);
  localStorage.removeItem(STORAGE_KEYS.refreshToken);
  localStorage.removeItem(STORAGE_KEYS.user);
}

function getStoredUser() {
  try {
    const storedUser = localStorage.getItem(STORAGE_KEYS.user);

    if (!storedUser) {
      return null;
    }

    return JSON.parse(storedUser);
  } catch (error) {
    console.error("Failed to parse stored user:", error);
    return null;
  }
}

function getErrorMessage(errorData, fallback = "حدث خطأ غير متوقع") {
  if (!errorData) {
    return fallback;
  }

  if (typeof errorData.message === "string") {
    return errorData.message;
  }

  if (Array.isArray(errorData.message)) {
    return errorData.message.join("، ");
  }

  if (Array.isArray(errorData.details)) {
    return errorData.details
      .map((item) => {
        if (item?.field && Array.isArray(item?.constraints)) {
          return `${item.field}: ${item.constraints.join("، ")}`;
        }

        return item?.message || "";
      })
      .filter(Boolean)
      .join("، ");
  }

  return fallback;
}

async function refreshAccessToken() {
  if (!state.refreshToken || state.isRefreshing) {
    return false;
  }

  state.isRefreshing = true;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refreshToken: state.refreshToken,
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      clearAuth();
      return false;
    }

    if (data?.tokens?.accessToken) {
      state.accessToken = data.tokens.accessToken;

      localStorage.setItem(
        STORAGE_KEYS.accessToken,
        data.tokens.accessToken,
      );
    }

    if (data?.tokens?.refreshToken) {
      state.refreshToken = data.tokens.refreshToken;

      localStorage.setItem(
        STORAGE_KEYS.refreshToken,
        data.tokens.refreshToken,
      );
    }

    return true;
  } catch (error) {
    console.error("Refresh token error:", error);
    return false;
  } finally {
    state.isRefreshing = false;
  }
}

async function api(endpoint, options = {}, retry = true) {
  const headers = {
    ...(options.headers || {}),
  };

  if (!headers["Content-Type"] && options.body) {
    headers["Content-Type"] = "application/json";
  }

  if (state.accessToken) {
    headers.Authorization = `Bearer ${state.accessToken}`;
  }

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (error) {
    console.error("API connection error:", error);

    throw new Error(
      "تعذر الاتصال بالخادم. تأكد أن Backend يعمل على المنفذ 3000",
    );
  }

  const data = await response.json().catch(() => null);

  if (response.status === 401 && retry && state.refreshToken) {
    const refreshed = await refreshAccessToken();

    if (refreshed) {
      return api(endpoint, options, false);
    }

    clearAuth();
    showPage("welcomePage");

    throw new Error("انتهت جلسة الدخول، يرجى تسجيل الدخول من جديد");
  }

  if (!response.ok) {
    const message = getErrorMessage(
      data,
      `حدث خطأ في الخادم (${response.status})`,
    );

    const error = new Error(message);
    error.status = response.status;
    error.data = data;

    throw error;
  }

  return data;
}

async function login(identifier, password) {
  showLoading("جاري تسجيل الدخول...");

  try {
    const data = await api(
      "/auth/login",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier,
          password,
        }),
      },
      false,
    );

    saveAuth(data);

    renderUser(data.user);

    hideLoading();
    showToast("تم تسجيل الدخول بنجاح", "success");

    showPage("homePage");

    return data;
  } catch (error) {
    hideLoading();

    throw error;
  }
}

async function register(fullName, email, phone, password) {
  showLoading("جاري إنشاء الحساب...");

  try {
    const data = await api(
      "/auth/register",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName,
          email,
          phone,
          password,
        }),
      },
      false,
    );

    saveAuth(data);

    renderUser(data.user);

    hideLoading();
    showToast("تم إنشاء الحساب بنجاح", "success");

    showPage("homePage");

    return data;
  } catch (error) {
    hideLoading();

    throw error;
  }
}

async function loadProfile() {
  const data = await api("/auth/me");

  state.user = data;

  localStorage.setItem(
    STORAGE_KEYS.user,
    JSON.stringify(data),
  );

  renderUser(data);

  return data;
}

function renderUser(user) {
  if (!user) {
    return;
  }

  const userNameElements = $$(".user-name");

  userNameElements.forEach((element) => {
    element.textContent = user.fullName || "مستخدم أبشر بي";
  });

  const userEmailElements = $$(".user-email");

  userEmailElements.forEach((element) => {
    element.textContent = user.email || "—";
  });

  const userPhoneElements = $$(".user-phone");

  userPhoneElements.forEach((element) => {
    element.textContent = user.phone || "—";
  });

  const userStatusElements = $$(".user-status");

  userStatusElements.forEach((element) => {
    element.textContent = user.status || "active";
  });

  const userRoleElements = $$(".user-role");

  userRoleElements.forEach((element) => {
    element.textContent =
      Array.isArray(user.roles) && user.roles.length
        ? user.roles.join("، ")
        : "customer";
  });

  const permissionsContainer = $("#permissionsList");

  if (permissionsContainer) {
    permissionsContainer.innerHTML = "";

    if (
      Array.isArray(user.permissions) &&
      user.permissions.length > 0
    ) {
      user.permissions.forEach((permission) => {
        const item = document.createElement("div");

        item.className = "permission-item";

        item.innerHTML = `
          <span class="permission-icon">✓</span>
          <span>${escapeHtml(permission)}</span>
        `;

        permissionsContainer.appendChild(item);
      });
    } else {
      permissionsContainer.innerHTML = `
        <div class="empty-permissions">
          لا توجد صلاحيات إضافية
        </div>
      `;
    }
  }
}

function escapeHtml(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function logout() {
  showLoading("جاري تسجيل الخروج...");

  try {
    if (state.accessToken) {
      await api(
        "/auth/logout",
        {
          method: "POST",
        },
        false,
      );
    }
  } catch (error) {
    console.warn("Logout request failed:", error);
  } finally {
    clearAuth();

    hideLoading();

    showToast("تم تسجيل الخروج", "success");

    showPage("welcomePage");
  }
}

function setupNavigation() {
  const navigationMap = {
    "#goLogin": "loginPage",
    "#goRegister": "registerPage",
    "#backToWelcomeFromLogin": "welcomePage",
    "#backToWelcomeFromRegister": "welcomePage",
    "#goHome": "homePage",
  };

  Object.entries(navigationMap).forEach(([selector, pageId]) => {
    const element = $(selector);

    if (!element) {
      return;
    }

    element.addEventListener("click", (event) => {
      event.preventDefault();
      hideAllMessages();
      showPage(pageId);
    });
  });

  const logoutButton = $("#logoutButton");

  if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
      await logout();
    });
  }

  $$(".nav-item").forEach((item) => {
    item.addEventListener("click", (event) => {
      event.preventDefault();

      const page = item.dataset.page;

      if (!page) {
        return;
      }

      if (page === "home") {
        showPage("homePage");
        return;
      }

      showToast("هذه الخدمة سيتم تفعيلها في المرحلة التالية", "info");
    });
  });
}

function hideAllMessages() {
  hideFormMessage("loginMessage");
  hideFormMessage("registerMessage");
}

function setupPasswordToggles() {
  $$(".password-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.dataset.target;

      if (!targetId) {
        return;
      }

      const input = document.getElementById(targetId);

      if (!input) {
        return;
      }

      if (input.type === "password") {
        input.type = "text";
        button.textContent = "إخفاء";
      } else {
        input.type = "password";
        button.textContent = "إظهار";
      }
    });
  });
}

function setupLoginForm() {
  const form = $("#loginForm");

  if (!form) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    hideFormMessage("loginMessage");

    const identifierInput = $("#loginIdentifier");
    const passwordInput = $("#loginPassword");

    const identifier = identifierInput?.value.trim() || "";
    const password = passwordInput?.value || "";

    if (!identifier) {
      showFormMessage(
        "loginMessage",
        "أدخل البريد الإلكتروني أو رقم الهاتف",
      );

      return;
    }

    if (!password) {
      showFormMessage(
        "loginMessage",
        "أدخل كلمة المرور",
      );

      return;
    }

    try {
      await login(identifier, password);

      form.reset();
    } catch (error) {
      showFormMessage(
        "loginMessage",
        error.message || "تعذر تسجيل الدخول",
      );
    }
  });
}

function setupRegisterForm() {
  const form = $("#registerForm");

  if (!form) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    hideFormMessage("registerMessage");

    const fullNameInput = $("#registerFullName");
    const emailInput = $("#registerEmail");
    const phoneInput = $("#registerPhone");
    const passwordInput = $("#registerPassword");

    const fullName = fullNameInput?.value.trim() || "";
    const email = emailInput?.value.trim() || "";
    const phone = phoneInput?.value.trim() || "";
    const password = passwordInput?.value || "";

    if (fullName.length < 2) {
      showFormMessage(
        "registerMessage",
        "أدخل الاسم بشكل صحيح",
      );

      return;
    }

    if (!email) {
      showFormMessage(
        "registerMessage",
        "أدخل البريد الإلكتروني",
      );

      return;
    }

    if (!phone) {
      showFormMessage(
        "registerMessage",
        "أدخل رقم الهاتف",
      );

      return;
    }

    if (password.length < 8) {
      showFormMessage(
        "registerMessage",
        "كلمة المرور يجب أن تكون 8 أحرف أو أكثر",
      );

      return;
    }

    try {
      await register(
        fullName,
        email,
        phone,
        password,
      );

      form.reset();
    } catch (error) {
      showFormMessage(
        "registerMessage",
        error.message || "تعذر إنشاء الحساب",
      );
    }
  });
}

function setupServiceButtons() {
  $$(".service-card").forEach((card) => {
    card.addEventListener("click", () => {
      const service = card.dataset.service;

      const serviceMessages = {
        orders: "قسم الطلبات سيتم تفعيله في المرحلة التالية",
        stores: "قسم المتاجر سيتم تفعيله في المرحلة التالية",
        favorites: "قسم المفضلة سيتم تفعيله في المرحلة التالية",
        addresses: "قسم العناوين سيتم تفعيله في المرحلة التالية",
      };

      showToast(
        serviceMessages[service] ||
          "هذه الخدمة سيتم تفعيلها قريبًا",
        "info",
      );
    });
  });
}

function setupSearch() {
  const searchInput = $("#globalSearch");

  if (!searchInput) {
    return;
  }

  searchInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();

    const value = searchInput.value.trim();

    if (!value) {
      showToast("اكتب ما تريد البحث عنه أولًا", "info");
      return;
    }

    showToast(
      `سيتم البحث عن: ${value}`,
      "info",
    );
  });
}

async function initializeApp() {
  setupNavigation();
  setupPasswordToggles();
  setupLoginForm();
  setupRegisterForm();
  setupServiceButtons();
  setupSearch();

  const storedUser = getStoredUser();

  if (storedUser) {
    state.user = storedUser;
    renderUser(storedUser);
  }

  if (state.accessToken) {
    showLoading("جاري التحقق من جلسة الدخول...");

    try {
      await loadProfile();

      hideLoading();

      showPage("homePage");

      return;
    } catch (error) {
      console.warn("Stored session is invalid:", error);

      clearAuth();
    }

    hideLoading();
  }

  showPage("welcomePage");
}

document.addEventListener("DOMContentLoaded", () => {
  initializeApp().catch((error) => {
    console.error("Application initialization error:", error);

    hideLoading();

    showPage("welcomePage");

    showToast(
      "حدث خطأ أثناء تشغيل التطبيق",
      "error",
    );
  });
});
