# Min Peng — Portfolio

A fully responsive, single-page design portfolio built from the Figma design.
No build step — plain HTML, CSS, and JavaScript.

## Run locally

Any static file server works. For example:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000

## Structure

```
index.html      # markup (rail, sticky nav, hero, work catalog, project rows)
styles.css      # responsive styles + smooth transitions
script.js       # hover preview + click lightbox
assets/
  logo.svg      # smiley logo
  projects/     # drop project screenshots / videos here
```

## Responsive behavior

- **Desktop (> 768px):** left rail with dots + rotated "MIN PENG 2026", project
  rows show `number + title + right-aligned meta` on one line.
- **Mobile (≤ 768px):** rail slides away, rows stack the title over a horizontal
  meta line, the number and "SORT: CHRONOLOGICAL" are hidden.
- Typography and spacing scale fluidly with `clamp()` so resizing the window is
  smooth; the rail and layout swaps are animated with CSS transitions.
- The top nav is `position: sticky` and stays locked to the top while scrolling.

## Adding project media (screenshots / videos)

Each project row in `index.html` carries three data attributes:

```html
<li class="project"
    data-media-type="video"               <!-- "image" | "video" | "" -->
    data-media-src="assets/projects/upgrade.mp4"
    data-poster="assets/projects/upgrade.jpg">  <!-- optional video poster -->
```

1. Put your files in `assets/projects/`.
2. Set `data-media-type` to `image` or `video`.
3. Point `data-media-src` at the file (and `data-poster` for a video still).

On desktop, hovering a row shows the media in a cursor-following preview.
Clicking any row (or pressing Enter) opens it in a full lightbox — this also
works on touch devices where hover isn't available.

Until media is added, a tasteful "MEDIA COMING SOON" placeholder is shown.
