// ================================
// Helper Functions
// ================================
const qs = (selector, root = document) => root.querySelector(selector);
const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];


// ================================
// Set Current Year
// ================================
const setYear = () => {
  const yearEl = qs("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
};


// ================================
// Mobile Navigation
// ================================
const initMobileNav = () => {
  const toggle = qs(".nav-toggle");
  const navList = qs("#nav-links");
  if (!toggle || !navList) return;

  const isOpen = () => toggle.getAttribute("aria-expanded") === "true";

  const setOpen = (open) => {
    toggle.setAttribute("aria-expanded", open);
    navList.classList.toggle("is-open", open);

    const icon = qs(".nav-toggle-icon", toggle);
    if (icon) icon.style.setProperty("--open", open ? "1" : "0");
  };

  toggle.addEventListener("click", () => setOpen(!isOpen()));

  toggle.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(!isOpen());
    }
  });

  document.addEventListener("click", (e) => {
    if (!isOpen()) return;
    if (!toggle.contains(e.target) && !navList.contains(e.target)) {
      setOpen(false);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen()) {
      setOpen(false);
      toggle.focus();
    }
  });

  qsa(".nav-link", navList).forEach((link) => {
    link.addEventListener("click", () => setOpen(false));
  });
};


// ================================
// Active Nav Link (FINAL FIX - SCROLL BASED)
// ================================
const initActiveNavLink = () => {
  const links = qsa(".nav-link");

  const sections = links
    .map((link) => {
      const id = link.getAttribute("href");
      if (!id?.startsWith("#")) return null;

      const section = qs(id);
      return section ? { link, section } : null;
    })
    .filter(Boolean);

  if (!sections.length) return;

  const setActive = (id) => {
    links.forEach((l) => {
      l.classList.remove("is-active");
      l.removeAttribute("aria-current");
    });

    const active = links.find((l) => l.getAttribute("href") === `#${id}`);
    if (active) {
      active.classList.add("is-active");
      active.setAttribute("aria-current", "page");
    }
  };

  const onScroll = () => {
    let current = "";

    sections.forEach(({ section }) => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;

      if (window.scrollY >= sectionTop - 120) {
        current = section.id;
      }
    });

    if (current) setActive(current);
  };

  window.addEventListener("scroll", onScroll);

  // run once on load
  onScroll();
};


// ================================
// Smooth Scrolling
// ================================
const initSmoothScroll = () => {
  const links = qsa(".nav-link");

  links.forEach((link) => {
    link.addEventListener("click", (e) => {
      const targetId = link.getAttribute("href");
      if (!targetId.startsWith("#")) return;

      const target = qs(targetId);
      if (!target) return;

      e.preventDefault();

      const offset = 90;
      const top = target.offsetTop - offset;

      window.scrollTo({
        top: top,
        behavior: "smooth",
      });
    });
  });
};

const initPhotoViewer = () => {
  const button = qs(".avatar-button");
  const avatarImg = qs(".avatar-photo");
  const modal = qs("#photo-modal");
  const modalImg = modal ? qs(".photo-modal-img", modal) : null;
  const closeBtn = modal ? qs(".photo-modal-close", modal) : null;

  if (!avatarImg || !modal || !modalImg || !closeBtn) return;

  const open = () => {
    modalImg.src = avatarImg.getAttribute("src") || "";
    modalImg.alt = avatarImg.getAttribute("alt") || "Photo";
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    closeBtn.focus();
  };

  const close = () => {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    modalImg.removeAttribute("src");
    document.body.classList.remove("modal-open");
    if (button instanceof HTMLElement) button.focus();
  };

  (button || avatarImg).addEventListener("click", open);
  closeBtn.addEventListener("click", close);

  modal.addEventListener("click", (e) => {
    if (e.target === modal) close();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("is-open")) close();
  });
};


// ================================
// Contact Form (FormSubmit)
// ================================
const initContactForm = () => {
  const form = qs("#contact-form");
  const note = qs("#form-note");
  if (!(form instanceof HTMLFormElement) || !note) return;

  const nameInput = qs("#name", form);
  const emailInput = qs("#email", form);
  const messageInput = qs("#message", form);

  const isFormSubmitEndpoint =
    typeof form.action === "string" &&
    form.action.toLowerCase().includes("formsubmit.co");

  const getValue = (el) =>
    el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
      ? el.value.trim()
      : "";

  const isValidEmail = (email) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email);

  const setError = (field, message = "") => {
    const el = qs(`.field-error[data-for="${field}"]`, form);
    if (el) el.textContent = message;
  };

  const clearErrors = () => {
    ["name", "email", "message"].forEach((f) => setError(f));
    note.textContent = "";
  };

  const validate = () => {
    clearErrors();

    const name = getValue(nameInput);
    const email = getValue(emailInput);
    const message = getValue(messageInput);

    let valid = true;

    if (name.length < 2) {
      setError("name", "Please enter at least 2 characters.");
      valid = false;
    }

    if (!isValidEmail(email)) {
      setError("email", "Please enter a valid email.");
      valid = false;
    }

    if (message.length < 10) {
      setError("message", "Please enter at least 10 characters.");
      valid = false;
    }

    return { valid, name, email, message };
  };

  form.addEventListener("submit", (e) => {
    const result = validate();

    if (!result.valid) {
      e.preventDefault();
      note.textContent = "Please fix the errors above.";
      return;
    }

    if (!isFormSubmitEndpoint) {
      e.preventDefault();
      note.textContent = "Form endpoint not configured.";
      return;
    }

    note.textContent = "Submitting...";
  });
};


// ================================
// Init All
// ================================
setYear();
initMobileNav();
initActiveNavLink(); // ✅ FINAL FIX APPLIED
initSmoothScroll();
initPhotoViewer();
initContactForm();
