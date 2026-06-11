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

  /* ---------------- Photo strip marquee + lightbox ---------------- */
  const stripTrack = document.getElementById("stripTrack");
  const photolb = document.querySelector(".photolb");

  if (stripTrack && photolb) {
    const COUNT = 18;
    const SPEED = 4; // px per second — slow, smooth
    const stripViewport = stripTrack.parentElement;
    const thumb = (n) => "assets/images/strip/image-strip-" + n + ".jpg";
    const large = (n) => "assets/images/large/image-strip-" + n + ".jpg";

    // Build one set of items in numeric order.
    function buildSet(isClone) {
      const frag = document.createDocumentFragment();
      for (let n = 1; n <= COUNT; n++) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "strip__item";
        btn.dataset.index = String(n);
        if (isClone) {
          btn.setAttribute("aria-hidden", "true");
          btn.tabIndex = -1;
        }
        const img = document.createElement("img");
        img.src = thumb(n);
        img.alt = isClone ? "" : "Photo " + n;
        img.decoding = "async";
        img.draggable = false;
        btn.appendChild(img);
        frag.appendChild(btn);
      }
      return frag;
    }

    // Lay out the marquee so the track is always two identical halves, each at
    // least as wide as the viewport. That keeps translateX(-50%) seamless AND
    // gap-free on any screen width.
    let lastHalves = 0;
    function layoutStrip() {
      stripTrack.innerHTML = "";
      stripTrack.appendChild(buildSet(false));
      const setWidth = stripTrack.scrollWidth || 1; // width of one 18-image set
      const vw = stripViewport.clientWidth || window.innerWidth;
      const setsPerHalf = Math.max(1, Math.ceil(vw / setWidth));
      // We already have 1 set; add the rest to total 2 * setsPerHalf sets so the
      // track is two identical halves, each at least one viewport wide.
      for (let i = 1; i < setsPerHalf * 2; i++) stripTrack.appendChild(buildSet(true));
      const halfWidth = setWidth * setsPerHalf;
      // Override only the CSS animation duration to keep a constant scroll speed,
      // then force a reflow so it restarts cleanly after the rebuild.
      stripTrack.style.animationDuration = "0s";
      void stripTrack.offsetWidth;
      stripTrack.style.animationDuration = (halfWidth / SPEED).toFixed(1) + "s";
      lastHalves = setsPerHalf;
    }

    // Build once images have a measurable width, then keep it responsive.
    function whenReady(cb) {
      const probe = new Image();
      probe.onload = probe.onerror = cb;
      probe.src = thumb(1);
    }
    whenReady(layoutStrip);

    let resizeTimer = null;
    window.addEventListener("resize", () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        const vw = stripViewport.clientWidth || window.innerWidth;
        // Re-layout only if the number of sets per half would change.
        const setWidth = (stripTrack.scrollWidth || 1) / (lastHalves * 2 || 1);
        if (Math.max(1, Math.ceil(vw / setWidth)) !== lastHalves) layoutStrip();
      }, 200);
    });

    const plbImg = photolb.querySelector(".photolb__img");
    const plbClose = photolb.querySelector(".photolb__close");
    const plbPrev = photolb.querySelector(".photolb__prev");
    const plbNext = photolb.querySelector(".photolb__next");
    let current = 1;

    function showPhoto(n) {
      current = ((n - 1 + COUNT) % COUNT) + 1; // wrap 1..18
      plbImg.src = large(current);
      plbImg.alt = "Photo " + current;
    }

    function openPhoto(n) {
      showPhoto(n);
      photolb.hidden = false;
      void photolb.offsetWidth;
      photolb.classList.add("is-open");
      document.body.style.overflow = "hidden";
      stripTrack.style.animationPlayState = "paused"; // freeze marquee behind the lightbox
    }

    function closePhoto() {
      photolb.classList.remove("is-open");
      document.body.style.overflow = "";
      stripTrack.style.animationPlayState = "running";
      window.setTimeout(() => {
        photolb.hidden = true;
        plbImg.removeAttribute("src");
      }, 300);
    }

    stripTrack.addEventListener("click", (e) => {
      const item = e.target.closest(".strip__item");
      if (!item) return;
      openPhoto(parseInt(item.dataset.index, 10));
    });

    plbClose.addEventListener("click", closePhoto);
    plbPrev.addEventListener("click", () => showPhoto(current - 1));
    plbNext.addEventListener("click", () => showPhoto(current + 1));
    photolb.addEventListener("click", (e) => {
      if (e.target === photolb) closePhoto();
    });
    document.addEventListener("keydown", (e) => {
      if (photolb.hidden) return;
      if (e.key === "Escape") closePhoto();
      else if (e.key === "ArrowLeft") showPhoto(current - 1);
      else if (e.key === "ArrowRight") showPhoto(current + 1);
    });
  }
})();
