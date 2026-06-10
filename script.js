(function () {
  "use strict";

  const projects = Array.from(document.querySelectorAll(".project"));
  const preview = document.querySelector(".preview");
  const previewInner = preview.querySelector(".preview__inner");
  const lightbox = document.querySelector(".lightbox");
  const lbStage = lightbox.querySelector(".lightbox__stage");
  const lbTitle = lightbox.querySelector(".lightbox__title");
  const lbMeta = lightbox.querySelector(".lightbox__meta");
  const lbDesc = lightbox.querySelector(".lightbox__desc");
  const lbClose = lightbox.querySelector(".lightbox__close");

  const canHover = window.matchMedia("(hover: hover)").matches;

  /* Read project data from data-* attributes */
  function read(el) {
    const descEl = el.querySelector(".project__desc");
    return {
      title: el.querySelector(".project__title").textContent.trim(),
      meta: Array.from(el.querySelectorAll(".project__meta span"))
        .map((s) => s.textContent.trim())
        .join(" · "),
      desc: descEl ? descEl.innerHTML.trim() : "",
      type: el.dataset.mediaType || "",
      src: el.dataset.mediaSrc || "",
      poster: el.dataset.poster || "",
    };
  }

  /* Build a media node: <video>, <img>, or a styled placeholder */
  function buildMedia(p, opts) {
    opts = opts || {};
    if (p.type === "video" && p.src) {
      const v = document.createElement("video");
      v.src = p.src;
      v.muted = true;
      v.loop = true;
      v.playsInline = true;
      v.autoplay = true;
      if (opts.controls) v.controls = true;
      if (p.poster) v.poster = p.poster;
      // Resume from a given timestamp (e.g. continuing from the hover preview)
      if (opts.startTime) {
        const seek = () => {
          try { v.currentTime = opts.startTime; } catch (e) {}
          v.play().catch(() => {});
        };
        v.addEventListener("loadedmetadata", seek, { once: true });
      }
      return v;
    }
    if (p.type === "image" && p.src) {
      const img = document.createElement("img");
      img.src = p.src;
      img.alt = p.title;
      img.loading = "lazy";
      return img;
    }
    const ph = document.createElement("div");
    ph.className = "media-placeholder";
    ph.textContent = p.title.toUpperCase() + " — MEDIA COMING SOON";
    return ph;
  }

  function stopMedia(container) {
    const v = container.querySelector("video");
    if (v) {
      v.pause();
      v.removeAttribute("src");
      v.load();
    }
    container.innerHTML = "";
  }

  /* ---------------- Cursor-following hover preview ---------------- */
  let rafId = null;
  let pendingX = 0;
  let pendingY = 0;

  function positionPreview() {
    rafId = null;
    const w = preview.offsetWidth;
    const h = preview.offsetHeight;
    const margin = 16;
    let x = pendingX + 28; // offset to the right of cursor
    let y = pendingY;
    // keep within viewport
    x = Math.min(x, window.innerWidth - w / 2 - margin);
    x = Math.max(x, w / 2 + margin);
    y = Math.min(y, window.innerHeight - h / 2 - margin);
    y = Math.max(y, h / 2 + margin);
    preview.style.left = x + "px";
    preview.style.top = y + "px";
  }

  function onMove(e) {
    pendingX = e.clientX;
    pendingY = e.clientY;
    if (rafId === null) rafId = requestAnimationFrame(positionPreview);
  }

  function showPreview(p, e) {
    stopMedia(previewInner);
    previewInner.appendChild(buildMedia(p));
    pendingX = e.clientX;
    pendingY = e.clientY;
    positionPreview();
    preview.classList.add("is-visible");
  }

  function hidePreview() {
    preview.classList.remove("is-visible");
    // clear after the fade so the next hover starts clean
    window.setTimeout(() => {
      if (!preview.classList.contains("is-visible")) stopMedia(previewInner);
    }, 300);
  }

  /* ---------------- Lightbox ---------------- */
  function openLightbox(p, startTime) {
    stopMedia(lbStage);
    lbStage.appendChild(
      buildMedia(p, { controls: p.type === "video", startTime: startTime || 0 })
    );
    lbTitle.textContent = p.title;
    lbMeta.textContent = p.meta;
    lbDesc.innerHTML = p.desc;
    lbDesc.hidden = !p.desc;
    lightbox.hidden = false;
    // force reflow so the transition runs
    void lightbox.offsetWidth;
    lightbox.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    lightbox.classList.remove("is-open");
    document.body.style.overflow = "";
    window.setTimeout(() => {
      lightbox.hidden = true;
      stopMedia(lbStage);
      lbTitle.textContent = "";
      lbMeta.textContent = "";
      lbDesc.innerHTML = "";
    }, 300);
  }

  /* ---------------- Wire up ---------------- */
  projects.forEach((el) => {
    el.tabIndex = 0;
    el.setAttribute("role", "button");

    if (canHover) {
      el.addEventListener("mouseenter", (e) => showPreview(read(el), e));
      el.addEventListener("mousemove", onMove);
      el.addEventListener("mouseleave", hidePreview);
    }

    el.addEventListener("click", () => {
      // Continue playback from wherever the hover preview is
      let startTime = 0;
      const pv = previewInner.querySelector("video");
      if (pv && !isNaN(pv.currentTime)) startTime = pv.currentTime;
      hidePreview();
      openLightbox(read(el), startTime);
    });

    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openLightbox(read(el));
      }
    });
  });

  lbClose.addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !lightbox.hidden) closeLightbox();
  });
})();
