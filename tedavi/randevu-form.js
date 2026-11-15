for (const form of document.querySelectorAll("[data-appointment-form]")) {
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const submit = form.querySelector('button[type="submit"]');
    const status = form.querySelector("[data-appointment-status]");
    const fields = new FormData(form);
    submit.disabled = true;
    status.className = "appointment-status";
    status.textContent = "";

    try {
      const csrfResponse = await fetch("/api/csrf", {
        credentials: "same-origin",
        cache: "no-store",
      });
      const csrfResult = await csrfResponse.json();
      if (!csrfResponse.ok) throw new Error(csrfResult.error || "Güvenlik anahtarı alınamadı.");

      const response = await fetch("/api/contact", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfResult.csrfToken,
        },
        body: JSON.stringify({
          fullName: fields.get("fullName"),
          phone: fields.get("phone"),
          email: fields.get("email"),
          message: fields.get("message"),
          consent: fields.has("consent"),
          requestType: "appointment",
          treatment: form.closest("[data-treatment-name]").dataset.treatmentName,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Randevu talebi gönderilemedi.");

      status.classList.add("success");
      status.textContent = "Talebiniz iletildi. Randevu için sizinle iletişime geçeceğiz.";
      form.reset();
    } catch (error) {
      status.classList.add("error");
      status.textContent = error.message || "Form gönderilemedi. Lütfen tekrar deneyin.";
    } finally {
      submit.disabled = false;
    }
  });
}
