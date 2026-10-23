// Rich text image grid.
// Lays out two or more images in a row of a rich text field (nothing but
// empty lines between them) as a 2-column grid. A single image between
// paragraphs uses the full width at its own shape (no crop). Text is capped at GRID.textWidth and centred,
// while images and grids use the field's full width.
//
// Each group (and each single image) is its own lightbox gallery: prev/next
// stays inside the group you opened.
//
// Webflow attributes:
//   data-module="richtext-grid"   on the Rich Text element
//
// The grid brings its own styles (no Webflow classes needed), so a style
// clean-up in Webflow can't break it. Tweak the look here.
const GRID = {
  columns: 2,
  gap: { desktop: "1.25em", tablet: "1em", mobile: "0.75em" },
  ratio: "4 / 3", // thumbnail crop; the lightbox still shows the whole image
  position: "50% 0%", // which part of the image the crop keeps (top centre)
  // Webflow variable Radius/large, so the grid follows it (1rem if missing)
  radius: "var(--_radius---radius--large, 1rem)",
  outline: "1px solid rgba(0, 0, 0, 0.12)", // hairline around each thumbnail
  outlineOffset: "-1px", // inside the edge, so it follows the rounded corners
  spacing: "1em", // space above and below each grid
  textWidth: "38rem", // text is capped and centred; images use the full width
};

// Selectors start with .w-richtext so they outrank Webflow's own rich text
// figure styles (table display, 60% width, centred margins)
const CSS = `
/* Everything except images (paragraphs, headings, lists, quotes...) */
.w-richtext[data-module="richtext-grid"] > :not(.rt-grid):not(figure) {
  max-width: ${GRID.textWidth};
  margin-left: auto;
  margin-right: auto;
}
.w-richtext .rt-grid {
  display: grid;
  grid-template-columns: repeat(${GRID.columns}, minmax(0, 1fr));
  gap: ${GRID.gap.desktop};
  margin: ${GRID.spacing} 0;
}
.w-richtext .rt-grid > .rt-grid__item {
  display: block;
  width: auto;
  max-width: none;
  margin: 0;
}
.w-richtext .rt-grid > .rt-grid__item > div,
.w-richtext .rt-grid > .rt-grid__item > a,
.w-richtext .rt-grid > .rt-grid__item > a > div {
  display: block;
}
.w-richtext .rt-grid > .rt-grid__item img {
  display: block;
  width: 100%;
  aspect-ratio: ${GRID.ratio};
  object-fit: cover;
  object-position: ${GRID.position};
  border-radius: ${GRID.radius};
  outline: ${GRID.outline};
  outline-offset: ${GRID.outlineOffset};
}
/* A single image (or video thumbnail) between paragraphs: full width, own shape */
.w-richtext figure.rt-single {
  display: block;
  width: 100%;
  max-width: none;
  margin: ${GRID.spacing} 0;
}
.w-richtext figure.rt-single > div,
.w-richtext figure.rt-single > a,
.w-richtext figure.rt-single > a > div {
  display: block;
}
.w-richtext figure.rt-single img {
  display: block;
  width: 100%;
  height: auto;
  border-radius: ${GRID.radius};
  outline: ${GRID.outline};
  outline-offset: ${GRID.outlineOffset};
}
/* Webflow shows captions as table captions, which collapse to one word per
   line once the figure is a grid cell; make them a normal full-width line.
   The selector has to outrank Webflow's
   .w-richtext figure.w-richtext-figure-type-image > figcaption */
.w-richtext .rt-grid > figure.rt-grid__item.w-richtext-figure-type-image > figcaption,
.w-richtext[data-module] > figure.rt-single.w-richtext-figure-type-image > figcaption {
  display: block;
  width: 100%;
  text-align: center;
}
@media screen and (max-width: 767px) {
  .w-richtext .rt-grid { gap: ${GRID.gap.tablet}; }
}
@media screen and (max-width: 479px) {
  .w-richtext .rt-grid { gap: ${GRID.gap.mobile}; }
}
`;

function addStyles() {
  if (document.getElementById("rt-grid-styles")) return;
  const style = document.createElement("style");
  style.id = "rt-grid-styles";
  style.textContent = CSS;
  document.head.appendChild(style);
}

const isImage = (el) =>
  el.tagName === "FIGURE" &&
  el.classList.contains("w-richtext-figure-type-image");

// Empty paragraphs Webflow leaves between images when you add them one by one
const isBlank = (el) =>
  el.tagName === "P" &&
  el.textContent.trim() === "" &&
  !el.querySelector("img, iframe, video");

export default function richtextGrid(root) {
  addStyles();

  // Group neighbouring images; blank paragraphs between them don't break a run
  const runs = [];
  let run = { figures: [], gaps: [] };
  let pending = []; // blank paragraphs seen since the last image
  for (const el of Array.from(root.children)) {
    if (isImage(el)) {
      run.figures.push(el);
      run.gaps.push(...pending);
      pending = [];
    } else if (isBlank(el) && run.figures.length) {
      pending.push(el);
    } else {
      if (run.figures.length) runs.push(run);
      run = { figures: [], gaps: [] };
      pending = [];
    }
  }
  if (run.figures.length) runs.push(run);

  runs.forEach(({ figures, gaps }) => {
    // A single image stays in place, full width, and is a gallery of one
    if (figures.length === 1) {
      figures[0].classList.add("rt-single");
      figures[0].setAttribute("data-gallery", "");
      return;
    }
    const grid = document.createElement("div");
    grid.className = "rt-grid";
    grid.setAttribute("data-gallery", "");
    figures[0].before(grid);
    figures.forEach((figure) => {
      figure.classList.add("rt-grid__item");
      grid.appendChild(figure);
    });
    gaps.forEach((gap) => gap.remove());
  });
}
