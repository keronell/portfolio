/* Track switching.
   All five tracks are present in the DOM; CSS hides the ones that do not
   match <html data-track="...">. This script only flips that attribute,
   keeps the buttons in sync and mirrors the choice into the URL so a
   track-specific link can be copied straight out of the address bar. */

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
    }
  }

  buttons.forEach(function (button) {
    button.addEventListener("click", function () {
      apply(button.dataset.setTrack, true);
    });
  });

  // Left/right arrows move between tracks once a button has focus.
  document.querySelector(".tablist").addEventListener("keydown", function (event) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;

    var index = buttons.indexOf(document.activeElement);
    if (index === -1) return;

    event.preventDefault();
    var step = event.key === "ArrowRight" ? 1 : -1;
    var next = buttons[(index + step + buttons.length) % buttons.length];
    next.focus();
    apply(next.dataset.setTrack, true);
  });

  window.addEventListener("popstate", function () {
    apply(fromLocation(), false);
  });

  apply(fromLocation(), false);
})();
