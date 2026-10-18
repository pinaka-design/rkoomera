// Site-wide code that runs once on every page, before components start.
// Keep this small: anything tied to an element belongs in its own module.

console.log(
  "%cDesigned & built by Ravi Koomera",
  "background:#161c33;color:#fff;padding:8px 12px;border-radius:4px;"
);

// Lets CSS know JavaScript is running, e.g. .js-ready [data-reveal] { ... }
document.documentElement.classList.add("js-ready");
