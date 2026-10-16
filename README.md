# rkoomera

Custom JS and CSS for Ravi's Webflow portfolio, served through [jsDelivr](https://www.jsdelivr.com/).

Think of it like this: Webflow is the house, and this repo is the toolbox that jsDelivr delivers to the door.

## Files

| File | What it does |
| --- | --- |
| `js/main.js` | Runs small "modules" on elements that have a `data-module` attribute. |
| `css/main.css` | Global styles that Webflow can't easily handle (motion, utilities). |

## Add it to Webflow

**Site settings > Custom code**

Head code:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/pinaka-design/rkoomera@main/css/main.min.css">
```

Footer code:

```html
<script src="https://cdn.jsdelivr.net/gh/pinaka-design/rkoomera@main/js/main.min.js" defer></script>
```

jsDelivr minifies files automatically when you add `.min` to the name.

## Use a module

In the Webflow Designer, select an element and add a custom attribute:

- Name: `data-module`
- Value: `reveal`

Publish, and the element fades up when it scrolls into view. You can stack modules with a space: `reveal parallax`.

## Add a new module

Open `js/main.js` and add one below the `reveal` example:

```js
register("my-effect", function (el) {
  // el is the Webflow element with data-module="my-effect"
});
```

## Updates and caching

- `@main` is cached by jsDelivr for up to 12 hours. To see a change right away, open
  `https://purge.jsdelivr.net/gh/pinaka-design/rkoomera@main/js/main.min.js` (and the same for the CSS).
- For the live site, use a version tag instead of `@main` (for example `@v1.0.0`) so a work-in-progress push never breaks it.
  Create one on GitHub under **Releases > Draft a new release**.
