# portfolio

Personal portfolio for Vladislav Pavlyuk - project previews across ML, computer vision, AI applications, backend, full-stack, and embedded software.

**Live:** https://keronell.github.io/portfolio/

A single static page. The five role tracks (ML & computer vision, AI & LLM applications,
backend, full-stack, embedded) each have a shareable link that retitles the page and filters
the projects, skills and experience shown:

| Track | Link |
| --- | --- |
| ML & Computer Vision | `?track=ml` |
| AI & LLM Applications | `?track=ai` |
| Backend | `?track=backend` |
| Full-Stack | `?track=fullstack` |
| Embedded | `?track=embedded` |

All five tracks live in `index.html`; `assets/css/styles.css` hides the ones that do not match
`<html data-track="...">`, so the page still renders correctly with JavaScript disabled.
`assets/js/main.js` only flips that attribute and mirrors the choice into the URL.

```
index.html              markup and content for all five tracks
assets/css/styles.css   theme, layout, track filtering
assets/js/main.js       track switching and URL sync
assets/img/             figures pulled from the project repositories, plus the link-preview image
```

Run locally with `python -m http.server 8000`.
