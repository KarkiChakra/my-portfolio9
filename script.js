const qs = (selector, root = document) => root.querySelector(selector);
const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];

const prefersReducedMotion = () =>
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const initThemeToggle = () => {
  const toggleBtn = qs("#theme-toggle");
  if (!toggleBtn) return;

  const sunIcon = qs(".sun-icon", toggleBtn);
  const moonIcon = qs(".moon-icon", toggleBtn);

  const currentTheme = document.documentElement.getAttribute("data-theme");
  if (currentTheme === "light") {
    if (sunIcon) sunIcon.style.display = "none";
    if (moonIcon) moonIcon.style.display = "block";
  }

  toggleBtn.addEventListener("click", () => {
    let theme = document.documentElement.getAttribute("data-theme");
    if (theme === "light") {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("theme", "dark");
      if (sunIcon) sunIcon.style.display = "block";
      if (moonIcon) moonIcon.style.display = "none";
    } else {
      document.documentElement.setAttribute("data-theme", "light");
      localStorage.setItem("theme", "light");
      if (sunIcon) sunIcon.style.display = "none";
      if (moonIcon) moonIcon.style.display = "block";
    }
  });
};

const setYear = () => {
  const yearEl = qs("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
};

const initMobileNav = () => {
  const toggle = qs(".nav-toggle");
  const navList = qs("#nav-links");
  if (!toggle || !navList) return;

  const isOpen = () => toggle.getAttribute("aria-expanded") === "true";

  const setOpen = (open) => {
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
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
    if (!toggle.contains(e.target) && !navList.contains(e.target)) setOpen(false);
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

const getHeaderOffset = () => {
  const header = qs("#site-header");
  if (!header) return 0;
  return header.getBoundingClientRect().height + 16;
};

const initSmoothScroll = () => {
  const links = qsa('a[href^="#"]');

  links.forEach((link) => {
    link.addEventListener("click", (e) => {
      const href = link.getAttribute("href");
      if (!href || href === "#" || !href.startsWith("#")) return;
      const target = qs(href);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - getHeaderOffset();
      window.scrollTo({ top, behavior: prefersReducedMotion() ? "auto" : "smooth" });
    });
  });
};

const initActiveNavLink = () => {
  const links = qsa(".nav-link");
  if (!links.length) return;

  const map = new Map();
  links.forEach((link) => {
    const href = link.getAttribute("href");
    if (!href?.startsWith("#")) return;
    const section = qs(href);
    if (section) map.set(section, link);
  });
  if (!map.size) return;

  const setActive = (sectionId) => {
    links.forEach((l) => {
      l.classList.remove("is-active");
      l.removeAttribute("aria-current");
    });
    const active = links.find((l) => l.getAttribute("href") === `#${sectionId}`);
    if (active) {
      active.classList.add("is-active");
      active.setAttribute("aria-current", "page");
    }
  };

  const sections = [...map.keys()];
  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => (b.intersectionRatio || 0) - (a.intersectionRatio || 0))[0];
      if (visible?.target?.id) setActive(visible.target.id);
    },
    {
      root: null,
      threshold: [0.2, 0.35, 0.5, 0.65],
      rootMargin: `-${getHeaderOffset()}px 0px -55% 0px`,
    }
  );

  sections.forEach((s) => observer.observe(s));
};

const initTypingEffect = () => {
  const el = qs("#typed");
  if (!el) return;

  const roles = ["Web Developer", "Problem Solver", "Lifelong Learner"];
  const state = {
    i: 0,
    t: "",
    deleting: false,
    pauseUntil: 0,
  };

  const tick = (now) => {
    if (prefersReducedMotion()) {
      el.textContent = roles.join(" | ");
      return;
    }

    if (now < state.pauseUntil) {
      requestAnimationFrame(tick);
      return;
    }

    const full = roles[state.i % roles.length];
    const speed = state.deleting ? 35 : 55;

    if (!state.deleting) {
      state.t = full.slice(0, state.t.length + 1);
      el.textContent = state.t;
      if (state.t === full) {
        state.deleting = true;
        state.pauseUntil = now + 900;
      }
    } else {
      state.t = full.slice(0, Math.max(0, state.t.length - 1));
      el.textContent = state.t;
      if (!state.t) {
        state.deleting = false;
        state.i += 1;
        state.pauseUntil = now + 260;
      }
    }

    window.setTimeout(() => requestAnimationFrame(tick), speed);
  };

  requestAnimationFrame(tick);
};

const initReveal = () => {
  const items = qsa("[data-reveal]");
  if (!items.length) return;
  if (prefersReducedMotion()) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          observer.unobserve(e.target);
        }
      });
    },
    { threshold: 0.18, rootMargin: "0px 0px -10% 0px" }
  );

  items.forEach((el) => observer.observe(el));
};

const initTilt = () => {
  const items = qsa("[data-tilt]");
  if (!items.length || prefersReducedMotion()) return;

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  items.forEach((el) => {
    const onMove = (e) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      const ry = clamp((x - 0.5) * 10, -8, 8);
      const rx = clamp((0.5 - y) * 10, -8, 8);
      el.style.setProperty("--rx", `${rx}deg`);
      el.style.setProperty("--ry", `${ry}deg`);
    };

    const onLeave = () => {
      el.style.setProperty("--rx", `0deg`);
      el.style.setProperty("--ry", `0deg`);
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
  });
};

const initParallax = () => {
  if (prefersReducedMotion()) return;
  const root = document.documentElement;
  let raf = 0;
  const onMove = (e) => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = (e.clientX - cx) / cx;
      const dy = (e.clientY - cy) / cy;
      root.style.setProperty("--par-x", String(Math.round(dx * 22)));
      root.style.setProperty("--par-y", String(Math.round(dy * 16)));
    });
  };
  window.addEventListener("pointermove", onMove, { passive: true });
};

const initCursor = () => {
  const cursor = qs("#cursor");
  const dot = qs("#cursor-dot");
  if (!cursor || !dot) return;

  const finePointer =
    window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (!finePointer || prefersReducedMotion()) return;

  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;
  let tx = x;
  let ty = y;
  let raf = 0;

  const render = () => {
    raf = 0;
    x += (tx - x) * 0.12;
    y += (ty - y) * 0.12;
    cursor.style.left = `${x}px`;
    cursor.style.top = `${y}px`;
    dot.style.left = `${tx}px`;
    dot.style.top = `${ty}px`;
  };

  const onMove = (e) => {
    tx = e.clientX;
    ty = e.clientY;
    cursor.classList.add("is-on");
    dot.classList.add("is-on");
    if (!raf) raf = requestAnimationFrame(render);
  };

  window.addEventListener("pointermove", onMove, { passive: true });

  const hoverables = 'a, button, [role="button"], input, textarea, .card';
  document.addEventListener(
    "pointerover",
    (e) => {
      if (e.target && e.target.closest && e.target.closest(hoverables)) {
        cursor.classList.add("is-hover");
      }
    },
    { passive: true }
  );
  document.addEventListener(
    "pointerout",
    (e) => {
      if (e.target && e.target.closest && e.target.closest(hoverables)) {
        cursor.classList.remove("is-hover");
      }
    },
    { passive: true }
  );
};

const initIntro = () => {
  const intro = qs("#intro");
  if (!intro) return;
  const hide = () => intro.classList.add("is-hidden");
  if (document.readyState === "complete") {
    window.setTimeout(hide, 200);
  } else {
    window.addEventListener("load", () => window.setTimeout(hide, 220));
  }
};

const initPhotoViewer = () => {
  const triggers = qsa("[data-photo-src]");
  const modal = qs("#photo-modal");
  const modalImg = modal ? qs(".photo-modal-img", modal) : null;
  const closeBtn = modal ? qs(".photo-modal-close", modal) : null;

  if (!modal || !modalImg || !closeBtn || !triggers.length) return;

  let lastTrigger = null;

  const open = (trigger) => {
    lastTrigger = trigger;
    const src = trigger.getAttribute("data-photo-src") || "";
    const img = qs("img", trigger);
    const alt = img?.getAttribute("alt") || "Photo";
    modalImg.src = src;
    modalImg.alt = alt;
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
    if (lastTrigger instanceof HTMLElement) lastTrigger.focus();
  };

  triggers.forEach((t) => t.addEventListener("click", () => open(t)));
  closeBtn.addEventListener("click", close);

  modal.addEventListener("click", (e) => {
    if (e.target === modal) close();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("is-open")) close();
  });
};

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

    return { valid };
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

const initParticles = () => {
  const canvas = qs("#fx");
  if (!(canvas instanceof HTMLCanvasElement) || prefersReducedMotion()) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  let w = 0;
  let h = 0;
  let dpr = 1;

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = Math.floor(canvas.clientWidth);
    h = Math.floor(canvas.clientHeight);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const colors = [
    "rgba(124,92,255,0.55)",
    "rgba(40,224,180,0.45)",
    "rgba(74,163,255,0.45)",
    "rgba(255,77,138,0.38)",
  ];

  const rand = (min, max) => min + Math.random() * (max - min);

  const count = () => {
    const area = (w * h) / 1000000;
    return Math.max(26, Math.min(70, Math.round(area * 38)));
  };

  let particles = [];

  const seed = () => {
    particles = Array.from({ length: count() }).map(() => ({
      x: rand(0, w),
      y: rand(0, h),
      r: rand(1.6, 3.8),
      vx: rand(-0.25, 0.25),
      vy: rand(-0.18, 0.18),
      a: rand(0.25, 0.7),
      c: colors[Math.floor(Math.random() * colors.length)],
    }));
  };

  const step = () => {
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = "lighter";

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < -40) p.x = w + 40;
      if (p.x > w + 40) p.x = -40;
      if (p.y < -40) p.y = h + 40;
      if (p.y > h + 40) p.y = -40;

      ctx.beginPath();
      ctx.fillStyle = p.c;
      ctx.globalAlpha = p.a;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    requestAnimationFrame(step);
  };

  resize();
  seed();
  step();

  window.addEventListener("resize", () => {
    resize();
    seed();
  });
};

setYear();
initThemeToggle();
initIntro();
initMobileNav();
initSmoothScroll();
initActiveNavLink();
initTypingEffect();
initReveal();
initTilt();
initParallax();
initCursor();
initPhotoViewer();
initContactForm();
initParticles();
