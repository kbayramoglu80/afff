const loginView = document.getElementById("login-view");
const dashboardView = document.getElementById("dashboard-view");
const loginForm = document.getElementById("login-form");
const faqForm = document.getElementById("faq-form");
const loginMessage = document.getElementById("login-message");
const dashboardMessage = document.getElementById("dashboard-message");
const faqList = document.getElementById("faq-list");
const contactList = document.getElementById("contact-list");
const faqFormTitle = document.getElementById("faq-form-title");
let csrfToken = "";
let faqs = [];
let contactSubmissions = [];

async function getCsrfToken() {
  const response = await fetch("/api/csrf", { credentials: "same-origin", cache: "no-store" });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Güvenlik anahtarı alınamadı.");
  csrfToken = result.csrfToken;
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    credentials: "same-origin",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.method && options.method !== "GET" ? { "X-CSRF-Token": csrfToken } : {}),
      ...options.headers,
    },
  });
  if (response.status === 204) return null;
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "İstek tamamlanamadı.");
  return result;
}

function showMessage(element, message, success = false) {
  element.textContent = message;
  element.classList.toggle("success", success);
}

function resetFaqForm() {
  faqForm.reset();
  faqForm.elements.id.value = "";
  faqFormTitle.textContent = "Yeni soru";
}

function renderFaqs() {
  faqList.replaceChildren();
  if (!faqs.length) {
    const empty = document.createElement("p");
    empty.textContent = "Henüz soru eklenmemiş.";
    faqList.append(empty);
    return;
  }
  for (const faq of faqs) {
    const row = document.createElement("article");
    row.className = "faq-row";
    const title = document.createElement("h3");
    title.textContent = faq.question;
    const answer = document.createElement("p");
    answer.textContent = faq.answer;
    const actions = document.createElement("div");
    actions.className = "actions";
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "secondary";
    edit.textContent = "Düzenle";
    edit.addEventListener("click", () => {
      faqForm.elements.id.value = faq._id;
      faqForm.elements.question.value = faq.question;
      faqForm.elements.answer.value = faq.answer;
      faqFormTitle.textContent = "Soruyu düzenle";
      faqForm.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "danger";
    remove.textContent = "Sil";
    remove.addEventListener("click", async () => {
      if (!window.confirm(`"${faq.question}" sorusu silinsin mi?`)) return;
      try {
        await apiRequest(`/api/admin/faqs/${encodeURIComponent(faq._id)}`, { method: "DELETE" });
        await loadFaqs();
        showMessage(dashboardMessage, "Soru silindi.", true);
      } catch (error) {
        showMessage(dashboardMessage, error.message);
      }
    });
    actions.append(edit, remove);
    row.append(title, answer, actions);
    faqList.append(row);
  }
}

async function loadFaqs() {
  faqs = await apiRequest("/api/admin/faqs");
  renderFaqs();
}

function renderContactSubmissions() {
  contactList.replaceChildren();
  if (!contactSubmissions.length) {
    const empty = document.createElement("p");
    empty.textContent = "Henüz iletişim talebi yok.";
    contactList.append(empty);
    return;
  }

  for (const submission of contactSubmissions) {
    const row = document.createElement("article");
    row.className = "contact-submission";

    const header = document.createElement("div");
    header.className = "contact-submission-head";
    const name = document.createElement("h3");
    name.textContent = submission.fullName;
    const status = document.createElement("span");
    status.className = "contact-submission-status";
    status.classList.toggle("unread", !submission.isRead);
    status.textContent = submission.isRead ? "Okundu" : "Yeni";
    const received = document.createElement("time");
    received.dateTime = submission.createdAt;
    received.textContent = new Intl.DateTimeFormat("tr-TR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(submission.createdAt));
    header.append(name, status, received);

    const details = document.createElement("div");
    details.className = "contact-submission-meta";
    const phone = document.createElement("a");
    phone.href = `tel:${submission.phone.replace(/[^\d+]/g, "")}`;
    phone.textContent = submission.phone;
    details.append(phone);
    if (submission.email) {
      const email = document.createElement("a");
      email.href = `mailto:${submission.email}`;
      email.textContent = submission.email;
      details.append(email);
    }

    const message = document.createElement("p");
    message.className = "contact-submission-message";
    message.textContent = submission.message;
    const actions = document.createElement("div");
    actions.className = "actions";

    if (!submission.isRead) {
      const markRead = document.createElement("button");
      markRead.type = "button";
      markRead.className = "secondary";
      markRead.textContent = "Okundu işaretle";
      markRead.addEventListener("click", async () => {
        try {
          await apiRequest(`/api/admin/contact-submissions/${encodeURIComponent(submission._id)}`, {
            method: "PATCH",
            body: JSON.stringify({ isRead: true }),
          });
          await loadContactSubmissions();
        } catch (error) {
          showMessage(dashboardMessage, error.message);
        }
      });
      actions.append(markRead);
    }

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "danger";
    remove.textContent = "Sil";
    remove.addEventListener("click", async () => {
      if (!window.confirm(`${submission.fullName} adlı kişinin iletişim talebi silinsin mi?`)) return;
      try {
        await apiRequest(`/api/admin/contact-submissions/${encodeURIComponent(submission._id)}`, {
          method: "DELETE",
        });
        await loadContactSubmissions();
      } catch (error) {
        showMessage(dashboardMessage, error.message);
      }
    });
    actions.append(remove);
    row.append(header, details, message, actions);
    contactList.append(row);
  }
}

async function loadContactSubmissions() {
  contactSubmissions = await apiRequest("/api/admin/contact-submissions");
  renderContactSubmissions();
}

function showDashboard() {
  loginView.hidden = true;
  dashboardView.hidden = false;
}

async function initialize() {
  try {
    await getCsrfToken();
    const sessionState = await apiRequest("/api/admin/session");
    if (sessionState.authenticated) {
      showDashboard();
      await Promise.all([loadFaqs(), loadContactSubmissions()]);
    } else {
      loginView.hidden = false;
    }
  } catch (error) {
    loginView.hidden = false;
    showMessage(loginMessage, error.message);
  }
}

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  showMessage(loginMessage, "");
  const submit = loginForm.querySelector('button[type="submit"]');
  submit.disabled = true;
  try {
    const result = await apiRequest("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({
        password: loginForm.elements.password.value,
      }),
    });
    csrfToken = result.csrfToken;
    loginForm.reset();
    showDashboard();
    await Promise.all([loadFaqs(), loadContactSubmissions()]);
  } catch (error) {
    showMessage(loginMessage, error.message);
  } finally {
    submit.disabled = false;
  }
});

faqForm.addEventListener("submit", async event => {
  event.preventDefault();
  showMessage(dashboardMessage, "");
  const id = faqForm.elements.id.value;
  const payload = {
    question: faqForm.elements.question.value,
    answer: faqForm.elements.answer.value,
  };
  try {
    await apiRequest(id ? `/api/admin/faqs/${encodeURIComponent(id)}` : "/api/admin/faqs", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(payload),
    });
    resetFaqForm();
    await loadFaqs();
    showMessage(dashboardMessage, "Soru kaydedildi.", true);
  } catch (error) {
    showMessage(dashboardMessage, error.message);
  }
});
document.getElementById("new-faq-button").addEventListener("click", resetFaqForm);

document.getElementById("refresh-contact-button").addEventListener("click", async event => {
  const button = event.currentTarget;
  button.disabled = true;
  try {
    await loadContactSubmissions();
    showMessage(dashboardMessage, "İletişim talepleri yenilendi.", true);
  } catch (error) {
    showMessage(dashboardMessage, error.message);
  } finally {
    button.disabled = false;
  }
});

document.getElementById("logout-button").addEventListener("click", async () => {
  try {
    await apiRequest("/api/admin/logout", { method: "POST" });
    window.location.reload();
  } catch (error) {
    showMessage(dashboardMessage, error.message);
  }
});

initialize();
