/* Domain switching, scroll reveals and nav state.

   All five domains are present in the DOM; CSS hides the ones that do not
   match <html data-track="...">. This script only flips that attribute, keeps
   the buttons in sync, and mirrors the choice into the URL so a domain-specific
   link can be copied straight out of the address bar. */

(function () {
  "use strict";

  var TRACKS = ["ml", "ai", "backend", "fullstack", "embedded"];
  var root = document.documentElement;
  var buttons = Array.prototype.slice.call(document.querySelectorAll("[data-set-track]"));

  function normalise(value) {
    return TRACKS.indexOf(value) > -1 ? value : null;
  }

  function fromLocation() {
    var params = new URLSearchParams(location.search);
    return normalise(params.get("track")) || normalise(location.hash.replace("#", "")) || "ml";
  }

  /* Elements hidden by the domain filter are never observed by the reveal
     observer, so anything newly shown is revealed immediately instead of
     appearing at zero opacity. */
  function revealVisible() {
    var hidden = document.querySelectorAll("[data-reveal]:not(.is-visible)");
    for (var i = 0; i < hidden.length; i++) {
      if (hidden[i].getClientRects().length) hidden[i].classList.add("is-visible");
    }
  }

  function apply(track, pushUrl) {
    root.setAttribute("data-track", track);

    buttons.forEach(function (button) {
      button.setAttribute("aria-pressed", String(button.dataset.setTrack === track));
    });

    if (pushUrl) {
      var url = new URL(location.href);
      url.searchParams.set("track", track);
      url.hash = "";
      history.pushState({ track: track }, "", url);
      revealVisible();
    }
  }

  buttons.forEach(function (button) {
    button.addEventListener("click", function () {
      apply(button.dataset.setTrack, true);
    });
  });

  /* Arrow keys move between domains once a tab has focus. The rail is vertical
     on wide screens and horizontal on narrow ones, so both axes are accepted. */
  var NEXT_KEYS = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
  var tablist = document.querySelector(".tablist");

  if (tablist) {
    tablist.addEventListener("keydown", function (event) {
      var step = NEXT_KEYS[event.key];
      if (!step) return;

      var index = buttons.indexOf(document.activeElement);
      if (index === -1) return;

      event.preventDefault();
      var next = buttons[(index + step + buttons.length) % buttons.length];
      next.focus();
      apply(next.dataset.setTrack, true);
    });
  }

  window.addEventListener("popstate", function () {
    apply(fromLocation(), false);
    revealVisible();
  });

  apply(fromLocation(), false);

  /* ---- reveal on scroll ---- */

  var reveals = document.querySelectorAll("[data-reveal]");

  if (!("IntersectionObserver" in window) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    for (var i = 0; i < reveals.length; i++) reveals[i].classList.add("is-visible");
  } else {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });

    for (var j = 0; j < reveals.length; j++) revealObserver.observe(reveals[j]);
  }

  /* ---- lightbox: enlarge a card figure on click ---- */

  (function () {
    var figures = Array.prototype.slice.call(document.querySelectorAll(".card__media img"));
    if (!figures.length) return;

    var box, image, caption, opener = null;

    function build() {
      box = document.createElement("div");
      box.className = "lightbox";
      box.hidden = true;
      box.setAttribute("role", "dialog");
      box.setAttribute("aria-modal", "true");
      box.setAttribute("aria-label", "Enlarged figure");
      box.innerHTML =
        '<button type="button" class="lightbox__close" aria-label="Close">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
          '<path d="M5 5l14 14M19 5L5 19"/></svg>' +
        "</button>" +
        '<figure class="lightbox__fig">' +
          '<span class="lightbox__frame"><img class="lightbox__img" alt=""></span>' +
          '<figcaption class="lightbox__cap"></figcaption>' +
        "</figure>" +
        '<span class="lightbox__hint label">Esc or click outside to close</span>';

      document.body.appendChild(box);
      image = box.querySelector(".lightbox__img");
      caption = box.querySelector(".lightbox__cap");

      box.addEventListener("click", function (event) {
        // Only the backdrop and the close button dismiss; the figure itself does not.
        if (event.target === box || box.querySelector(".lightbox__close").contains(event.target)) close();
      });
      document.addEventListener("keydown", function (event) {
        if (box.hidden) return;
        if (event.key === "Escape") { close(); return; }
        if (event.key === "Tab") { event.preventDefault(); box.querySelector(".lightbox__close").focus(); }
      });
    }

    function lockScroll(on) {
      var root = document.documentElement;
      if (on) {
        // Compensate for the scrollbar so hiding it does not shift the page.
        var gap = window.innerWidth - root.clientWidth;
        root.style.overflow = "hidden";
        if (gap > 0) root.style.paddingRight = gap + "px";
      } else {
        root.style.overflow = "";
        root.style.paddingRight = "";
      }
    }

    function open(img) {
      if (!box) build();
      opener = img.closest(".card__media") || img;

      image.src = img.currentSrc || img.src;
      image.alt = img.alt || "";
      caption.textContent = img.alt || "";
      // Carry the figure inversion across, so the enlarged view matches the card.
      image.classList.toggle(
        "lightbox__img--figure",
        !!img.closest(".card__media--figure")
      );

      box.hidden = false;
      lockScroll(true);
      box.querySelector(".lightbox__close").focus();
    }

    function close() {
      if (!box || box.hidden) return;
      box.hidden = true;
      lockScroll(false);
      image.removeAttribute("src");
      if (opener && opener.focus) opener.focus();
      opener = null;
    }

    figures.forEach(function (img) {
      var media = img.parentElement;
      media.classList.add("is-zoomable");
      media.setAttribute("role", "button");
      media.setAttribute("tabindex", "0");
      media.setAttribute("aria-label", "Enlarge figure: " + (img.alt || "project figure"));

      media.addEventListener("click", function () { open(img); });
      media.addEventListener("keydown", function (event) {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        open(img);
      });
    });

    /* Figure links that point straight at an image open here too, rather than
       dumping the raw file in a new tab. */
    Array.prototype.forEach.call(
      document.querySelectorAll('.card__note a[href$=".webp"], .card__note a[href$=".png"], .card__note a[href$=".jpg"]'),
      function (link) {
        link.addEventListener("click", function (event) {
          event.preventDefault();
          if (!box) build();
          opener = link;
          image.src = link.getAttribute("href");
          image.alt = link.textContent.trim();
          caption.textContent = link.textContent.trim();
          image.classList.add("lightbox__img--figure");
          box.hidden = false;
          lockScroll(true);
          box.querySelector(".lightbox__close").focus();
        });
      }
    );
  })();

  /* ---- nav: mark the section currently in view ---- */

  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".nav__link"));
  var targets = navLinks
    .map(function (link) { return document.querySelector(link.getAttribute("href")); })
    .filter(Boolean);

  if (targets.length && "IntersectionObserver" in window) {
    var ratios = {};

    var navObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        ratios[entry.target.id] = entry.isIntersecting ? entry.intersectionRatio : 0;
      });

      var bestId = null, bestRatio = 0;
      targets.forEach(function (section) {
        var ratio = ratios[section.id] || 0;
        if (ratio > bestRatio) { bestRatio = ratio; bestId = section.id; }
      });

      navLinks.forEach(function (link) {
        link.classList.toggle(
          "is-current",
          bestId !== null && link.getAttribute("href") === "#" + bestId
        );
      });
    }, { threshold: [0, 0.15, 0.35, 0.6, 1] });

    targets.forEach(function (section) { navObserver.observe(section); });
  }
})();
