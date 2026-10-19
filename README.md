# EventEase — Vanilla HTML/CSS/JS PWA

A college project for Event Planning & Management, styled as an Apple-inspired
"Liquid Glass" interface over a warm Peach Glow background.

## Pages
- `index.html` — Home
- `about.html` / `services.html` / `contact.html` — informational pages; Contact also
  has a built-in Support Assistant chatbot for troubleshooting and guidance
- `register.html` / `login.html` — instant local account creation/login
- `app.html` — the signed-in workspace: Overview, Dashboard, Events, Calendar, AI
  Assistant and the per-event workspace
- `settings.html` — language, appearance, notifications, event preferences,
  date/time format, AI Assistant toggle, data export/clear, PWA install, accessibility
- `invite.html` — a public, no-login invitation page opened from a shared event link

## Design system
- **Peach Glow** background (`css/peach-glow.css`): a fixed warm gradient
  (`#FFF3EC → #FFC9A3 → #F08A8C → #B65E8C`) with a subtle grain texture. A plain
  sRGB gradient is declared first as the baseline, then enhanced with an
  `in oklab` interpolation for engines that support it — the sRGB version is never
  removed, only overridden where supported.
- **Liquid Glass** surfaces (`css/liquid-glass.css`): translucent cards and panels
  using `backdrop-filter` / `-webkit-backdrop-filter`, soft borders, inner highlights
  and layered shadows, with a `@supports` fallback to a solid-enough background for
  browsers without backdrop-filter support. Glass is used at three depths (subtle,
  normal, floating) so the UI keeps a visual hierarchy instead of looking flat.
- Light and Dark appearance modes are also available from Settings; Liquid Glass is
  the default.

## Event management
Every event gets its own workspace (Overview, Guests, Tasks, Budget, Venue,
Schedule, Event Settings), reached from a card grid on the Events page. Guests,
tasks, expenses, venue and schedule rows all carry an `eventId`, so data for one
event is never shown inside another. Event Settings supports editing, duplicating,
archiving and deleting an event; deleting or duplicating only ever touches that one
event's own records.

## AI Assistant
- The floating AI button (bottom-right) opens a general planning assistant. Ask it
  to plan an entire event in one prompt (e.g. "Plan a wedding for 300 guests, budget
  5 lakh in Kochi on 12 Feb") and it proposes a name, date, budget breakdown, task
  checklist, day schedule and invitation text, with a button to create the event
  (and its tasks) directly. This works offline with built-in templates and is
  enhanced by the server AI when configured.
- The Contact page's Support Assistant is a separate, guided troubleshooting
  chatbot (login/session issues, missing data, install help, etc.) with a built-in
  diagnostics check.
- Both call the same serverless endpoint at `/api/chat`; the request body's `mode`
  field (`support`, `planner`, or unset) selects which system prompt is used
  server-side. The API key is never sent to or stored in the browser.

## Sharing invitations
Each event card (and the Dashboard's focus event) has a Share button that opens a
designed invitation preview and offers: the native Share sheet (WhatsApp, Mail,
Messages, etc., with the card image attached where supported), direct WhatsApp and
email links, copy link, and save-image. The shared link points at `invite.html`,
which encodes the event's details in the URL itself — no server storage, no login
required to view it.

## Reminders — what they actually do
Event and task reminders are checked with a JavaScript interval while EventEase is
open in the browser (or running as an installed PWA). They are **not** OS-level
background push notifications: if the browser/tab is fully closed, no reminder will
fire. Event reminders fire once, a configurable amount of time before the event
starts. Task reminders fire once, the first time the app is open on or after a
task's due date. Both require the browser's Notification permission and respect
their own on/off switch in Settings.

## Default event duration
Settings → Event Preferences → Default duration is applied automatically when
creating an event with a start time: end time = start time + default duration
(capped at 23:59 the same day). This only runs once, at creation — if you later set
a different end time from Event Settings, your value is kept and is never
recalculated or overwritten.

## Settings & local data
Preferences live in a single `eventease_settings` object in `localStorage`
(language, appearance, notifications, event preferences, date/time format, AI
Assistant on/off, accessibility). Settings also offers:
- **Export data** — downloads your account's events, guests, tasks, expenses,
  venues and AI chat history as a JSON file.
- **Clear local data** — after a confirmation, removes that same data plus saved
  preferences and AI history from this browser. Your account/sign-in is kept.

## Authentication note
For a college/demo PWA without a database, accounts and application data are
stored in `localStorage` (plus a session marker in `sessionStorage`/a cookie so a
session survives private-mode quirks on the same browser). Creating an account
immediately signs the user in. This is suitable for a local demo, **not production
authentication** — passwords are not securely hashed and nothing is stored
server-side.

## AI backend — environment variables
The serverless function needs:
- `EXPLABS_API_KEY` — required
- `EXPLABS_MODEL` — optional; if unset, the function asks the provider for an
  available model at request time

Never put the API key in browser JavaScript, HTML, CSS, the manifest, or
localStorage — it is read only server-side.

### Vercel
`api/chat.js` is a standard Vercel serverless function at `/api/chat`. Set the
environment variables above in the Vercel project settings.

### Netlify
`netlify/functions/chat.mts` is an equivalent Netlify Function, also served at
`/api/chat` via the redirect in `netlify.toml`. Set the same environment variables
under Site configuration → Environment variables, then `netlify deploy --prod`.

Both backends accept the same request shape and `mode` values, so the frontend
code works unchanged on either host.

## PWA
`manifest.json` + `service-worker.js` precache the app shell, including
`icons/icon.svg`, `icons/icon-192.png`, `icons/icon-512.png` and
`icons/icon-512-maskable.png`. The service worker fetches network-first (so
updates reach users promptly) and falls back to the cache, and finally to
`index.html`, when offline. AI responses from `/api/chat` are never cached as
static content — every request goes to the network.

## Run locally
Use a local HTTP server rather than opening the HTML files with `file://`, so the
service worker and manifest work correctly (for example VS Code Live Server, or any
static file server).

## Accessibility
Visible focus rings (`:focus-visible`), `prefers-reduced-motion` support (also
exposed as a Settings toggle), a Larger Text setting, and ARIA labels on icon-only
controls (close buttons, chevrons, the account menu, the AI/support chat buttons).

## Browser support
Built with progressive enhancement for current Chrome, Edge, Firefox and Safari —
backdrop-filter, `100dvh`, and the native Share API all have working fallbacks
(solid-enough backgrounds, a `100vh` fallback value, and WhatsApp/email/copy-link
buttons respectively) for browsers that lack them. No support is claimed for
discontinued browser versions.

## Contact
The Contact page includes FAQs, the Support Assistant chatbot, demo email/phone
contact links, and a feedback form that opens the visitor's email client. Replace
the demo email and phone values before submission.
