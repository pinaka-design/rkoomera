/*
 * rkoomera — main entry for the Webflow site.
 * Loaded via jsDelivr in Site settings > Custom code > Footer.
 *
 * How it works:
 * Add data-module="name" to any element in Webflow.
 * On page load, every registered module whose name matches runs once per element.
 */
(function () {
  "use strict";

  var modules = {};

  // Register a module: rk.register("name", function (el) { ... })
  function register(name, init) {
    modules[name] = init;
  }

  function boot() {
    document.documentElement.classList.add("rk-js");
    var els = document.querySelectorAll("[data-module]");
    els.forEach(function (el) {
      el.getAttribute("data-module").split(" ").forEach(function (name) {
        var init = modules[name];
        if (!init) return;
        try {
          init(el);
        } catch (err) {
          console.error("[rk] module failed:", name, err);
        }
      });
    });
  }

  window.rk = { register: register, boot: boot };

  // --- Modules -------------------------------------------------------------

  // Example: fades an element in when it scrolls into view.
  // Webflow: add attribute data-module="reveal" to any element.
  register("reveal", function (el) {
    el.classList.add("rk-reveal");
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          el.classList.add("is-visible");
          io.disconnect();
        }
      });
    }, { threshold: 0.15 });
    io.observe(el);
  });

  // --- Start once Webflow is ready -----------------------------------------
  window.Webflow = window.Webflow || [];
  window.Webflow.push(boot);
})();
