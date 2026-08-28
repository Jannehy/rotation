/* Rotation – the whole front end. No framework, no build step: the server
   ships four files and the browser does the rest. */

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
};

/* ── Translations ───────────────────────────────────────────── */
const STRINGS = {
  de: {
    "gate.sub": "Deine Navidrome-Zugangsdaten.",
    "gate.user": "Benutzername", "gate.pass": "Passwort", "gate.go": "Anmelden",
    "gate.busy": "Anmelden …",
    "err.invalid": "Benutzername oder Passwort stimmt nicht.",
    "err.unreachable": "Navidrome ist nicht erreichbar.",
    "err.mismatch": "Rotation liest eine andere Datenbank als dieser Navidrome-Server.",
    "err.generic": "Etwas ist schiefgelaufen.",
    "nav.overview": "Übersicht", "nav.history": "Verlauf", "nav.wrapped": "Rückblick",
    "nav.friends": "Freunde", "nav.settings": "Einstellungen",
    "range.days": "Tage", "range.year": "Dieses Jahr", "range.all": "Gesamt",
    "card.timeline": "Verlauf", "card.clock": "Tageszeit", "card.artists": "Top-Künstler",
    "card.tracks": "Top-Titel", "card.albums": "Top-Alben", "card.genres": "Genres",
    "card.discoveries": "Neu entdeckt", "card.heatmap": "Wochentag und Uhrzeit",
    "card.recent": "Zuletzt gehört", "card.friends": "Freunde", "card.compare": "Vergleich",
    "card.account": "Konto", "card.about": "Über",
    "card.minutes": "Gehörte Minuten", "card.topgenre": "Top-Genre",
    "stat.plays": "Wiedergaben", "stat.time": "Hörzeit", "stat.artists": "Künstler",
    "stat.tracks": "Titel", "stat.albums": "Alben", "stat.perday": "pro aktivem Tag",
    "stat.streak": "Serie", "stat.days": "Tage", "stat.active": "aktive Tage",
    "unit.plays": "Wiedergaben", "unit.tracks": "Titel",
    "empty.none": "Für diesen Zeitraum gibt es noch nichts.",
    "empty.genres": "Keine Genre-Tags in den gehörten Titeln.",
    "empty.discoveries": "Keine neuen Künstler in diesem Zeitraum.",
    "friends.hint": "Statistiken sieht nur, wer sich gegenseitig hinzugefügt hat.",
    "friends.yours": "Deine Freunde", "friends.incoming": "Möchten dich hinzufügen",
    "friends.outgoing": "Angefragt", "friends.suggestions": "Auf diesem Server",
    "friends.none": "Noch niemand.",
    "friends.nosuggestions": "Niemand sonst hat Rotation bisher geöffnet.",
    "friends.add": "Hinzufügen", "friends.accept": "Bestätigen",
    "friends.remove": "Entfernen", "friends.withdraw": "Zurückziehen",
    "friends.view": "Ansehen", "friends.compare": "Vergleichen",
    "friends.added": "Angefragt – sichtbar wird es, sobald es bestätigt wird.",
    "friends.now": "Ihr seid jetzt Freunde.",
    "compare.shared": "Gemeinsame Künstler",
    "detail.rank": "Platz", "detail.first": "Zuerst gehört", "detail.last": "Zuletzt",
    "detail.months": "Über die Monate", "detail.heard": "Titel gehört",
    "detail.missing": "Dazu gibt es keine Daten.",
    "compare.none": "Noch keine Überschneidungen in diesem Zeitraum.",
    "view.watching": "Du siehst die Statistik von", "view.back": "zurück zu mir",
    "wrapped.share": "Bild teilen", "wrapped.share.title": "Zum Teilen",
    "wrapped.theme.sunset": "Sonnenuntergang", "wrapped.theme.mint": "Minze",
    "wrapped.theme.night": "Nachtblau", "wrapped.theme.coal": "Kohle", "wrapped.none": "Für dieses Jahr gibt es keine Daten.",
    "wrapped.kicker": "Dein Jahr", "wrapped.plays": "Wiedergaben",
    "wrapped.time": "So lange lief Musik", "wrapped.artist": "Dein Künstler des Jahres",
    "wrapped.share.done": "Bild gespeichert.",
    "wrapped.top.artists": "Deine Top-Künstler", "wrapped.top.tracks": "Deine Top-Titel",
    "wrapped.top.albums": "Deine Top-Alben", "wrapped.months": "Über das Jahr",
    "wrapped.first": "Angefangen hat es mit", "wrapped.streak": "Längste Serie",
    "wrapped.devotion": "deiner Wiedergaben gingen an eine einzige Künstlerin oder einen Künstler",
    "wrapped.peak": "Deine Stunde", "wrapped.discoveries": "Neu für dich",
    "wrapped.previous": "im Vorjahr",
    "settings.discoverable": "Für andere auffindbar",
    "settings.discoverable.hint": "Ausgeschaltet erscheinst du in keiner Vorschlagsliste. Bestehende Freundschaften bleiben bestehen.",
    "settings.accent": "Farbe",
    "settings.season": "Story ganzjährig im Rückblick zeigen",
    "settings.season.hint": "Betrifft nur den Knopf auf der Rückblick-Seite. Auf der Startseite meldet sich der Rückblick immer nur vom 1. Dezember bis 31. Januar.",
    "settings.notify": "An den Rückblick erinnern",
    "settings.notify.hint": "Der Browser meldet sich, sobald der Rückblick da ist – dafür muss Rotation einmal geöffnet werden.",
    "settings.logout": "Abmelden",
    "about.data": "Alle Zahlen stammen aus der Wiedergabe-Historie deines Navidrome-Servers. Rotation greift ausschließlich lesend darauf zu.",
    "account.user": "Benutzer", "account.since": "Historie seit", "account.plays": "Wiedergaben gesamt",
    "account.tz": "Zeitzone",
    "day.0": "Mo", "day.1": "Di", "day.2": "Mi", "day.3": "Do", "day.4": "Fr",
    "day.5": "Sa", "day.6": "So",
    "month.short": ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"],
    "time.now": "gerade eben", "time.min": "vor %d Min.", "time.hour": "vor %d Std.",
    "time.day": "vor %d Tagen", "time.oclock": "%d Uhr",
  },
  en: {
    "gate.sub": "Your Navidrome credentials.",
    "gate.user": "Username", "gate.pass": "Password", "gate.go": "Sign in",
    "gate.busy": "Signing in …",
    "err.invalid": "That username or password is wrong.",
    "err.unreachable": "Navidrome cannot be reached.",
    "err.mismatch": "Rotation reads a different database than this Navidrome server uses.",
    "err.generic": "Something went wrong.",
    "nav.overview": "Overview", "nav.history": "History", "nav.wrapped": "Wrapped",
    "nav.friends": "Friends", "nav.settings": "Settings",
    "range.days": "days", "range.year": "This year", "range.all": "All time",
    "card.timeline": "Over time", "card.clock": "Time of day", "card.artists": "Top artists",
    "card.tracks": "Top tracks", "card.albums": "Top albums", "card.genres": "Genres",
    "card.discoveries": "Newly discovered", "card.heatmap": "Weekday and hour",
    "card.recent": "Recently played", "card.friends": "Friends", "card.compare": "Comparison",
    "card.account": "Account", "card.about": "About",
    "card.minutes": "Minutes listened", "card.topgenre": "Top genre",
    "stat.plays": "Plays", "stat.time": "Listening time", "stat.artists": "Artists",
    "stat.tracks": "Tracks", "stat.albums": "Albums", "stat.perday": "per active day",
    "stat.streak": "Streak", "stat.days": "days", "stat.active": "active days",
    "unit.plays": "plays", "unit.tracks": "tracks",
    "empty.none": "Nothing here for this period yet.",
    "empty.genres": "No genre tags on the tracks you played.",
    "empty.discoveries": "No new artists in this period.",
    "friends.hint": "Only people who added each other can see each other's statistics.",
    "friends.yours": "Your friends", "friends.incoming": "Want to add you",
    "friends.outgoing": "Requested", "friends.suggestions": "On this server",
    "friends.none": "Nobody yet.",
    "friends.nosuggestions": "Nobody else has opened Rotation yet.",
    "friends.add": "Add", "friends.accept": "Confirm",
    "friends.remove": "Remove", "friends.withdraw": "Withdraw",
    "friends.view": "View", "friends.compare": "Compare",
    "friends.added": "Requested – it becomes visible once they confirm.",
    "friends.now": "You are friends now.",
    "compare.shared": "Artists you share",
    "detail.rank": "No.", "detail.first": "First heard", "detail.last": "Last",
    "detail.months": "Over the months", "detail.heard": "Tracks heard",
    "detail.missing": "There is no data for that.",
    "compare.none": "No overlap in this period yet.",
    "view.watching": "You are viewing the statistics of", "view.back": "back to mine",
    "wrapped.share": "Share image", "wrapped.share.title": "To share",
    "wrapped.theme.sunset": "Sunset", "wrapped.theme.mint": "Mint",
    "wrapped.theme.night": "Midnight", "wrapped.theme.coal": "Coal", "wrapped.none": "No data for this year.",
    "wrapped.kicker": "Your year", "wrapped.plays": "plays",
    "wrapped.time": "That much music played", "wrapped.artist": "Your artist of the year",
    "wrapped.share.done": "Image saved.",
    "wrapped.top.artists": "Your top artists", "wrapped.top.tracks": "Your top tracks",
    "wrapped.top.albums": "Your top albums", "wrapped.months": "Across the year",
    "wrapped.first": "It started with", "wrapped.streak": "Longest streak",
    "wrapped.devotion": "of your plays went to a single artist",
    "wrapped.peak": "Your hour", "wrapped.discoveries": "New to you",
    "wrapped.previous": "the year before",
    "settings.discoverable": "Findable by others",
    "settings.discoverable.hint": "Switched off you appear in no suggestion list. Existing friendships stay.",
    "settings.accent": "Colour",
    "settings.season": "Show the story on the recap page all year",
    "settings.season.hint": "This is about the button on the recap page only. On the home page the recap still announces itself from 1 December to 31 January.",
    "settings.notify": "Remind me about the recap",
    "settings.notify.hint": "The browser lets you know once the recap is there – Rotation has to be opened once for that.",
    "settings.logout": "Sign out",
    "about.data": "Every number comes from your Navidrome server's play history. Rotation only ever reads it.",
    "account.user": "User", "account.since": "History since", "account.plays": "Plays in total",
    "account.tz": "Time zone",
    "day.0": "Mon", "day.1": "Tue", "day.2": "Wed", "day.3": "Thu", "day.4": "Fri",
    "day.5": "Sat", "day.6": "Sun",
    "month.short": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    "time.now": "just now", "time.min": "%d min ago", "time.hour": "%d h ago",
    "time.day": "%d days ago", "time.oclock": "%d:00",
  },
};

const MONTHS_LONG = {
  de: ["Januar", "Februar", "März", "April", "Mai", "Juni",
       "Juli", "August", "September", "Oktober", "November", "Dezember"],
  en: ["January", "February", "March", "April", "May", "June",
       "July", "August", "September", "October", "November", "December"],
};

const RANGES = [
  ["7d", "range.days", "7"],
  ["30d", "range.days", "30"],
  ["90d", "range.days", "90"],
  ["year", "range.year", ""],
  ["all", "range.all", ""],
];

const state = {
  lang: localStorage.getItem("rotation.lang") || (navigator.language.startsWith("de") ? "de" : "en"),
  theme: localStorage.getItem("rotation.theme") || "dark",
  cardTheme: localStorage.getItem("rotation.cardtheme") || "sunset",
  accent: localStorage.getItem("rotation.accent") || "sunset",
  playlists: [],
  view: "overview",
  range: "30d",
  me: null,
  viewing: null,      // friend's user object while looking at their numbers
  compareWith: null,
};

const t = (key) => (STRINGS[state.lang][key] ?? STRINGS.en[key] ?? key);
const locale = () => (state.lang === "de" ? "de-DE" : "en-GB");
const num = (value) => (value ?? 0).toLocaleString(locale());

function duration(seconds) {
  let hours = Math.floor(seconds / 3600);
  let minutes = Math.round((seconds % 3600) / 60);
  if (minutes === 60) { hours += 1; minutes = 0; }
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return state.lang === "de" ? `${days} T ${hours % 24} Std` : `${days}d ${hours % 24}h`;
  }
  if (hours) return state.lang === "de" ? `${hours} Std ${minutes} Min` : `${hours}h ${minutes}m`;
  return state.lang === "de" ? `${minutes} Min` : `${minutes}m`;
}

function ago(ts) {
  const seconds = Date.now() / 1000 - ts;
  if (seconds < 90) return t("time.now");
  if (seconds < 3600) return t("time.min").replace("%d", Math.round(seconds / 60));
  if (seconds < 86400) return t("time.hour").replace("%d", Math.round(seconds / 3600));
  const days = Math.round(seconds / 86400);
  if (days < 30) return t("time.day").replace("%d", days);
  return new Date(ts * 1000).toLocaleDateString(locale(), { day: "numeric", month: "short" });
}

const art = (id, size = 120) => (id ? `/api/art/${encodeURIComponent(id)}?size=${size}` : "");

// "30d" -> "30 Tage". A plain year ("2026") is already its own label.
function rangeName(key) {
  const known = RANGES.find((entry) => entry[0] === key);
  if (!known) return key;
  return known[2] ? `${known[2]} ${t(known[1])}` : t(known[1]);
}

/* ── Server ─────────────────────────────────────────────────── */
async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (response.status === 401) { showGate(); throw new Error("unauthorised"); }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(payload.error || "error"), { payload });
  return payload;
}
const post = (path, body) => api(path, { method: "POST", body: JSON.stringify(body || {}) });

function toast(message) {
  const node = $("toast");
  node.textContent = message;
  node.hidden = false;
  clearTimeout(node._timer);
  node._timer = setTimeout(() => { node.hidden = true; }, 2600);
}

/* ── Shell ──────────────────────────────────────────────────── */
function applyLanguage() {
  document.documentElement.lang = state.lang;
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  $("lang").value = state.lang;
}

function renderAccentPicker() {
  const host = $("accent-picker");
  if (!host) return;
  host.replaceChildren();
  Object.entries(ACCENTS).forEach(([name, theme]) => {
    const swatch = el("button", `swatch${name === state.accent ? " is-active" : ""}`);
    swatch.style.background =
      `linear-gradient(135deg, ${theme.accent}, ${theme.second})`;
    swatch.setAttribute("aria-label", name);
    swatch.addEventListener("click", () => {
      state.accent = name;
      localStorage.setItem("rotation.accent", name);
      applyAccent();
      renderAccentPicker();
    });
    host.appendChild(swatch);
  });
}

function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  $("theme").textContent = state.theme === "dark" ? "◐" : "◑";
}

function showGate() {
  $("gate").hidden = false;
  $("app").hidden = true;
}

function showApp() {
  $("gate").hidden = true;
  $("app").hidden = false;
}

function switchView(view) {
  state.view = view;
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.view === view);
  });
  document.querySelectorAll(".view").forEach((node) => {
    node.classList.toggle("is-active", node.id === `view-${view}`);
  });
  if (view === "overview") loadOverview();
  if (view === "history") loadHistory();
  if (view === "wrapped") loadWrapped();
  if (view === "friends") loadFriends();
  if (view === "settings") loadSettings();
}

const currentUserParam = () => (state.viewing ? `&user=${encodeURIComponent(state.viewing.id)}` : "");

function setViewing(user) {
  state.viewing = user;
  const bar = $("viewing");
  bar.hidden = !user;
  if (user) $("viewing-text").textContent = `${t("view.watching")} ${user.name}`;
}

/* ── Overview ───────────────────────────────────────────────── */
async function loadOverview() {
  renderSeasonBanner();
  loadPlaylists();
  const data = await api(`/api/overview?range=${state.range}${currentUserParam()}`);
  renderHeadline(data);
  renderTimeline(data.timeline);
  renderClock(data.clock);
  renderTop($("top-artists"), data.artists, "artist");
  renderTop($("top-tracks"), data.tracks, "track");
  renderTop($("top-albums"), data.albums, "album");
  renderGenres(data.genres);
  renderDiscoveries(data.discoveries);
}

function stat(value, label, suffix, accent) {
  const node = el("div", accent ? "stat accent" : "stat");
  const line = el("div", "value");
  line.textContent = value;
  if (suffix) {
    const small = el("small", null, ` ${suffix}`);
    line.appendChild(small);
  }
  node.appendChild(line);
  node.appendChild(el("div", "label", label));
  return node;
}

function renderHeadline(data) {
  const box = $("headline");
  box.replaceChildren();
  const s = data.summary;
  box.appendChild(stat(num(s.plays), t("stat.plays"), null, true));
  box.appendChild(stat(duration(s.seconds), t("stat.time")));
  box.appendChild(stat(num(s.artists), t("stat.artists")));
  box.appendChild(stat(num(s.tracks), t("stat.tracks")));
  box.appendChild(stat(num(s.active_days), t("stat.active")));
  box.appendChild(stat(
    `${data.streaks.current}`,
    `${t("stat.streak")} · ${t("stat.days")}`,
  ));
}

function renderTimeline(days) {
  const host = $("timeline");
  host.replaceChildren();
  if (!days.length) { host.appendChild(el("p", "empty", t("empty.none"))); return; }

  const width = 600, height = 170, pad = 24;
  const max = Math.max(...days.map((d) => d.plays), 1);
  const step = days.length > 1 ? (width - pad * 2) / (days.length - 1) : 0;
  const x = (i) => pad + i * step;
  const y = (v) => height - pad - (v / max) * (height - pad * 2);

  const line = days.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.plays).toFixed(1)}`).join("");
  const area = `${line}L${x(days.length - 1).toFixed(1)},${height - pad}L${x(0).toFixed(1)},${height - pad}Z`;

  host.insertAdjacentHTML("beforeend", `
    <svg class="chart" viewBox="0 0 ${width} ${height}" role="img">
      <defs>
        <linearGradient id="rot-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--accent)" stop-opacity=".38"/>
          <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <line class="grid" x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}"/>
      <path class="area" d="${area}"/>
      <path class="line" d="${line}"/>
      <line class="hairline" x1="0" y1="${pad}" x2="0" y2="${height - pad}" style="opacity:0"/>
      <circle class="dot" r="4.5" cx="0" cy="0" style="opacity:0"/>
      <text class="tick" x="${pad}" y="${height - 6}">${label(days[0].date)}</text>
      <text class="tick" x="${width - pad}" y="${height - 6}" text-anchor="end">${label(days[days.length - 1].date)}</text>
      <text class="tick" x="${pad}" y="${pad - 8}">${max} ${t("unit.plays")}</text>
    </svg>`);

  const caption = el("div", "chart-caption");
  host.appendChild(caption);

  // Hover or drag along the chart to read a single day off it.
  const svg = host.querySelector("svg");
  const dot = svg.querySelector(".dot");
  const hair = svg.querySelector(".hairline");

  const point = (clientX) => {
    const box = svg.getBoundingClientRect();
    const vx = ((clientX - box.left) / box.width) * width;
    const index = Math.max(0, Math.min(days.length - 1,
      step ? Math.round((vx - pad) / step) : 0));
    const day = days[index];
    dot.setAttribute("cx", x(index).toFixed(1));
    dot.setAttribute("cy", y(day.plays).toFixed(1));
    dot.style.opacity = "1";
    hair.setAttribute("x1", x(index).toFixed(1));
    hair.setAttribute("x2", x(index).toFixed(1));
    hair.style.opacity = "1";
    caption.innerHTML = "";
    caption.appendChild(el("b", null, full(day.date)));
    caption.appendChild(document.createTextNode(
      ` · ${num(day.plays)} ${t("unit.plays")}${day.seconds ? ` · ${duration(day.seconds)}` : ""}`));
  };
  const clear = () => {
    dot.style.opacity = "0";
    hair.style.opacity = "0";
    caption.textContent = "";
  };

  svg.style.touchAction = "none";
  svg.addEventListener("pointermove", (event) => point(event.clientX));
  svg.addEventListener("pointerdown", (event) => point(event.clientX));
  svg.addEventListener("pointerleave", clear);
  svg.addEventListener("pointercancel", clear);

  function label(iso) {
    return new Date(`${iso}T12:00:00`)
      .toLocaleDateString(locale(), { day: "numeric", month: "short" });
  }
  function full(iso) {
    return new Date(`${iso}T12:00:00`)
      .toLocaleDateString(locale(), { weekday: "short", day: "numeric", month: "long" });
  }
}

function renderClock(clock) {
  const host = $("clock");
  host.replaceChildren();
  const hours = clock.hours || [];
  if (!hours.some(Boolean)) { host.appendChild(el("p", "empty", t("empty.none"))); return; }

  const size = 280, centre = size / 2, inner = 44, outer = 112, labelRadius = 130;
  const max = Math.max(...hours);
  const angleOf = (hour) => (hour / 24) * Math.PI * 2 - Math.PI / 2;

  const spokes = hours.map((value, hour) => {
    const angle = angleOf(hour);
    const length = inner + (value / max) * (outer - inner);
    const x1 = centre + Math.cos(angle) * inner, y1 = centre + Math.sin(angle) * inner;
    const x2 = centre + Math.cos(angle) * length, y2 = centre + Math.sin(angle) * length;
    const opacity = 0.25 + (value / max) * 0.75;
    return `<line class="spoke" data-hour="${hour}"
             x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}"
             x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"
             stroke-width="7" stroke-opacity="${opacity.toFixed(2)}"/>`;
  }).join("");

  // A label every three hours: enough to orient, few enough to stay legible.
  const labels = [0, 3, 6, 9, 12, 15, 18, 21].map((hour) => {
    const angle = angleOf(hour);
    const lx = centre + Math.cos(angle) * labelRadius;
    const ly = centre + Math.sin(angle) * labelRadius + 3;
    return `<text class="label" x="${lx.toFixed(1)}" y="${ly.toFixed(1)}">${hour}</text>`;
  }).join("");

  host.insertAdjacentHTML("beforeend", `
    <svg class="record" viewBox="0 0 ${size} ${size}" role="img">
      <circle class="dial" cx="${centre}" cy="${centre}" r="${outer}"/>
      <circle class="dial" cx="${centre}" cy="${centre}" r="${inner}"/>
      ${spokes}
      ${labels}
      <circle class="centre-dot" cx="${centre}" cy="${centre}" r="5"/>
    </svg>`);

  const caption = el("div", "chart-caption");
  host.appendChild(caption);

  const svg = host.querySelector("svg");
  const spokeNodes = [...svg.querySelectorAll(".spoke")];

  const highlight = (hour) => {
    spokeNodes.forEach((node) => {
      node.classList.toggle("is-on", Number(node.dataset.hour) === hour);
    });
    caption.innerHTML = "";
    caption.appendChild(el("b", null, t("time.oclock").replace("%d", hour)));
    caption.appendChild(document.createTextNode(
      ` · ${num(hours[hour])} ${t("unit.plays")}`));
  };

  const fromPointer = (event) => {
    const box = svg.getBoundingClientRect();
    const vx = ((event.clientX - box.left) / box.width) * size - centre;
    const vy = ((event.clientY - box.top) / box.height) * size - centre;
    let angle = Math.atan2(vy, vx) + Math.PI / 2;
    if (angle < 0) angle += Math.PI * 2;
    highlight(Math.round((angle / (Math.PI * 2)) * 24) % 24);
  };

  svg.addEventListener("pointermove", fromPointer);
  svg.addEventListener("pointerdown", fromPointer);
  svg.addEventListener("pointerleave", () => {
    if (clock.peak_hour !== null) highlight(clock.peak_hour);
  });

  if (clock.peak_hour !== null) highlight(clock.peak_hour);
}

/* ── A playlist that keeps up ───────────────────────────────────
   Rotation writes it into Navidrome and rewrites it daily, so the same
   list is always the current one instead of a pile of snapshots. */
async function loadPlaylists() {
  try {
    const answer = await api("/api/playlists");
    state.playlists = answer.playlists || [];
  } catch {
    state.playlists = [];
  }
  renderPlaylistButton();
}

const playlistRule = () =>
  (state.playlists || []).find((entry) => entry.range === state.range);

/** The button says what it will do, and offers a way out once there is one. */
function renderPlaylistButton() {
  const button = $("make-playlist");
  const drop = $("drop-playlist");
  if (!button || !drop) return;
  const rule = playlistRule();
  button.textContent = rule ? t("playlist.update") : t("playlist.make");
  drop.hidden = !rule;
  drop.title = t("playlist.drop.hint");
}

async function makePlaylist(button) {
  button.disabled = true;
  const previous = button.textContent;
  button.textContent = t("playlist.working");
  try {
    const result = await post("/api/playlists",
                              { range: state.range, lang: state.lang });
    toast(t("playlist.done").replace("%s", result.tracks)
      .replace("%n", result.playlist.name));
    await loadPlaylists();
  } catch {
    toast(t("playlist.failed"));
  }
  button.textContent = previous;
  button.disabled = false;
  renderPlaylistButton();
}

/** Stops looking after it. The playlist itself stays in Navidrome. */
async function dropPlaylist() {
  const rule = playlistRule();
  if (!rule) return;
  await api(`/api/playlists/${encodeURIComponent(rule.range)}`, { method: "DELETE" });
  toast(t("playlist.dropped"));
  await loadPlaylists();
}

function renderTop(list, items, kind) {
  list.replaceChildren();
  if (!items.length) { list.appendChild(el("li", "empty", t("empty.none"))); return; }
  const max = items[0].plays || 1;
  items.slice(0, 10).forEach((item, index) => {
    const li = el("li");
    li.appendChild(el("span", "rank", String(index + 1)));

    const image = document.createElement("img");
    image.className = kind === "artist" ? "art round" : "art";
    image.loading = "lazy";
    image.alt = "";
    if (item.art) image.src = art(item.art, 120);
    image.addEventListener("error", () => { image.style.visibility = "hidden"; });
    li.appendChild(image);

    const meta = el("div", "meta");
    meta.appendChild(el("div", "name", item.title || item.name));
    meta.appendChild(el("div", "sub",
      kind === "artist" ? `${num(item.tracks)} ${t("unit.tracks")}`
        : (item.artist || "")));
    li.appendChild(meta);
    li.appendChild(el("span", "count", num(item.plays)));

    const bar = el("span", "bar");
    bar.style.width = `${(item.plays / max) * 100}%`;
    li.appendChild(bar);

    if (item.id) {
      li.classList.add("clickable");
      li.addEventListener("click", () => openDetail(kind, item.id));
    }
    list.appendChild(li);
  });
}

function renderGenres(genres) {
  const host = $("genres");
  host.replaceChildren();
  if (!genres.length) { host.appendChild(el("p", "empty", t("empty.genres"))); return; }
  const max = genres[0].plays || 1;
  genres.forEach((genre) => {
    const row = el("div", "genre-row");
    row.appendChild(el("span", "name", genre.name));
    const track = el("span", "track");
    const fill = el("span", "fill");
    fill.style.width = `${(genre.plays / max) * 100}%`;
    track.appendChild(fill);
    row.appendChild(track);
    row.appendChild(el("span", "count", num(genre.plays)));
    host.appendChild(row);
  });
}

function renderDiscoveries(items) {
  const list = $("discoveries");
  list.replaceChildren();
  if (!items.length) { list.appendChild(el("li", "empty", t("empty.discoveries"))); return; }
  items.forEach((item) => {
    const li = el("li");
    li.appendChild(document.createTextNode(item.name));
    li.appendChild(el("span", "n", ` ${item.plays}`));
    li.style.cursor = "pointer";
    li.addEventListener("click", () => openDetail("artist", item.id));
    list.appendChild(li);
  });
}

/* ── History ────────────────────────────────────────────────── */
async function loadHistory() {
  const [overview, recent] = await Promise.all([
    api(`/api/overview?range=${state.range}${currentUserParam()}`),
    api(`/api/recent?limit=60${currentUserParam()}`),
  ]);
  renderHeatmap(overview.clock.matrix);
  renderRecent(recent.plays);
}

function renderHeatmap(matrix) {
  const host = $("heatmap");
  host.replaceChildren();
  const grid = el("div", "heat");
  const max = Math.max(1, ...matrix.flat());

  grid.appendChild(el("span", "day", ""));
  for (let hour = 0; hour < 24; hour += 1) {
    grid.appendChild(el("span", "hour", hour % 3 === 0 ? String(hour) : ""));
  }
  matrix.forEach((row, day) => {
    grid.appendChild(el("span", "day", t(`day.${day}`)));
    row.forEach((value, hour) => {
      const cell = el("span", "cell");
      if (value) {
        cell.style.background = "var(--accent)";
        cell.style.opacity = String(0.18 + (value / max) * 0.82);
      }
      cell.title = `${t(`day.${day}`)} ${hour}:00 – ${value} ${t("unit.plays")}`;
      grid.appendChild(cell);
    });
  });
  host.appendChild(grid);
}

function renderRecent(plays) {
  const list = $("recent");
  list.replaceChildren();
  if (!plays.length) { list.appendChild(el("li", "empty", t("empty.none"))); return; }
  plays.forEach((play) => {
    const li = el("li");
    const image = document.createElement("img");
    image.className = "art";
    image.loading = "lazy";
    image.alt = "";
    if (play.art) image.src = art(play.art, 100);
    image.addEventListener("error", () => { image.style.visibility = "hidden"; });
    li.appendChild(image);
    const meta = el("div", "meta");
    meta.appendChild(el("div", "name", play.title));
    meta.appendChild(el("div", "sub", play.artist));
    li.appendChild(meta);
    li.appendChild(el("span", "when", ago(play.played_at)));
    li.style.cursor = "pointer";
    li.addEventListener("click", () => openDetail("track", play.id));
    list.appendChild(li);
  });
}

/* ── Wrapped ────────────────────────────────────────────────── */
let wrappedData = null;

async function loadWrapped(year) {
  const suffix = year ? `?year=${year}` : "?";
  const data = await api(`/api/wrapped${suffix}${year ? "" : ""}${state.viewing ? `&user=${state.viewing.id}` : ""}`);
  wrappedData = data;

  const picker = $("wrapped-year");
  if (picker.options.length !== (data.years || []).length) {
    picker.replaceChildren();
    (data.years || []).forEach((value) => {
      const option = el("option", null, String(value));
      option.value = String(value);
      picker.appendChild(option);
    });
  }
  if (data.year) picker.value = String(data.year);
  renderWrapped(data);
}

function renderWrapped(data) {
  const host = $("wrapped");
  host.replaceChildren();
  if (!data.has_data) { host.appendChild(el("p", "empty", t("wrapped.none"))); return; }

  const slides = el("div", "slides");
  const s = data.summary;

  // The same year, told rather than listed – see story.js. The page itself
  // is always here; only the story steps forward in December.
  if (seasonOpen()) {
    const play = el("button", "btn primary story-start", `▶  ${t("story.start")}`);
    play.addEventListener("click", () => openStory(data));
    slides.appendChild(play);
  }

  const hero = el("div", "slide hero");
  hero.appendChild(el("div", "kicker", `${t("wrapped.kicker")} ${data.year}`));
  const huge = el("div", "huge", `${num(s.plays)} ${t("wrapped.plays")}`);
  hero.appendChild(huge);
  const under = el("div", "under");
  under.textContent = `${duration(s.seconds)} · ${num(s.artists)} ${t("stat.artists")} · ${num(s.albums)} ${t("stat.albums")}`;
  hero.appendChild(under);
  if (data.previous) {
    const delta = Math.round(((s.plays - data.previous.plays) / data.previous.plays) * 100);
    const line = el("div", "under");
    line.textContent = `${delta >= 0 ? "+" : ""}${delta}% ${t("wrapped.previous")} (${num(data.previous.plays)})`;
    hero.appendChild(line);
  }
  slides.appendChild(hero);

  if (data.artists.length) {
    const slide = el("div", "slide");
    slide.appendChild(el("div", "kicker", t("wrapped.artist")));
    slide.appendChild(el("div", "huge", data.artists[0].name));
    slide.appendChild(el("div", "under",
      `${num(data.artists[0].plays)} ${t("unit.plays")} · ${data.devotion}% ${t("wrapped.devotion")}`));
    slide.appendChild(podium(data.artists.slice(0, 5), true, "artist"));
    slides.appendChild(slide);
  }

  if (data.tracks.length) {
    const slide = el("div", "slide");
    slide.appendChild(el("div", "kicker", t("wrapped.top.tracks")));
    const list = el("ol", "toplist");
    slides.appendChild(slide);
    slide.appendChild(list);
    renderTop(list, data.tracks, "track");
  }

  if (data.albums.length) {
    const slide = el("div", "slide");
    slide.appendChild(el("div", "kicker", t("wrapped.top.albums")));
    slide.appendChild(podium(data.albums.slice(0, 5), false, "album"));
    slides.appendChild(slide);
  }

  const monthsSlide = el("div", "slide");
  monthsSlide.appendChild(el("div", "kicker", t("wrapped.months")));
  const max = Math.max(...data.months.map((m) => m.plays), 1);
  const bars = el("div", "months");
  const barNodes = data.months.map((month) => {
    const bar = el("div", "m");
    bar.style.height = `${Math.max(3, (month.plays / max) * 100)}%`;
    bars.appendChild(bar);
    return bar;
  });
  monthsSlide.appendChild(bars);
  const labels = el("div", "months-labels");
  STRINGS[state.lang]["month.short"].forEach((name) => labels.appendChild(el("span", null, name)));
  monthsSlide.appendChild(labels);

  const monthCaption = el("div", "chart-caption");
  monthsSlide.appendChild(monthCaption);

  const showMonth = (index) => {
    barNodes.forEach((bar, i) => bar.classList.toggle("is-on", i === index));
    const month = data.months[index];
    monthCaption.innerHTML = "";
    monthCaption.appendChild(el("b", null, MONTHS_LONG[state.lang][index]));
    monthCaption.appendChild(document.createTextNode(
      ` · ${num(month.plays)} ${t("unit.plays")}${month.seconds ? ` · ${duration(month.seconds)}` : ""}`));
  };
  const monthFromPointer = (event) => {
    const box = bars.getBoundingClientRect();
    const ratio = (event.clientX - box.left) / box.width;
    showMonth(Math.max(0, Math.min(11, Math.floor(ratio * 12))));
  };
  bars.style.touchAction = "none";
  bars.addEventListener("pointermove", monthFromPointer);
  bars.addEventListener("pointerdown", monthFromPointer);
  bars.addEventListener("pointerleave", () => {
    if (data.top_month) showMonth(data.top_month.month - 1);
  });
  if (data.top_month) showMonth(data.top_month.month - 1);
  slides.appendChild(monthsSlide);

  const facts = el("div", "slide");
  facts.appendChild(el("div", "kicker", t("wrapped.kicker")));
  const grid = el("div", "podium");
  if (data.first_play) {
    grid.appendChild(fact(t("wrapped.first"),
      `${data.first_play.title} — ${data.first_play.artist}`));
  }
  grid.appendChild(fact(t("wrapped.streak"), `${data.streak} ${t("stat.days")}`));
  if (data.clock.peak_hour !== null) {
    grid.appendChild(fact(t("wrapped.peak"), t("time.oclock").replace("%d", data.clock.peak_hour)));
  }
  if (data.discoveries.length) {
    grid.appendChild(fact(t("wrapped.discoveries"),
      data.discoveries.slice(0, 3).map((d) => d.name).join(", ")));
  }
  facts.appendChild(grid);
  slides.appendChild(facts);

  slides.appendChild(shareSection(data));

  host.appendChild(slides);

  function fact(label, value) {
    const item = el("div", "item");
    item.appendChild(el("div", "s", label));
    item.appendChild(el("div", "n", value));
    return item;
  }

  function podium(items, round, kind) {
    const box = el("div", "podium");
    items.forEach((item) => {
      const cell = el("div", "item");
      if (kind && item.id) {
        cell.style.cursor = "pointer";
        cell.addEventListener("click", () => openDetail(kind, item.id, String(data.year)));
      }
      const image = document.createElement("img");
      image.alt = "";
      image.loading = "lazy";
      if (round) image.style.borderRadius = "50%";
      if (item.art) image.src = art(item.art, 300);
      cell.appendChild(image);
      cell.appendChild(el("div", "n", item.name || item.title));
      cell.appendChild(el("div", "s", `${num(item.plays)} ${t("unit.plays")}`));
      box.appendChild(cell);
    });
    return box;
  }
}


/* The card, the palette choice and the button – one block at the end of the
   Wrapped page. */
function shareSection(data) {
  const box = el("div", "slide share-slide");
  box.appendChild(el("div", "kicker", t("wrapped.share.title")));

  const wrap = el("div", "share-wrap");
  box.appendChild(wrap);
  renderShareCard(data, wrap);

  const controls = el("div", "share-controls");
  const swatches = el("div", "swatches");
  Object.entries(CARD_THEMES).forEach(([name, theme]) => {
    const swatch = el("button", `swatch${name === state.cardTheme ? " is-active" : ""}`);
    swatch.style.background =
      `linear-gradient(135deg, ${theme.stops[0]}, ${theme.stops[1]}, ${theme.stops[2]})`;
    swatch.title = t(`wrapped.theme.${name}`);
    swatch.setAttribute("aria-label", t(`wrapped.theme.${name}`));
    swatch.addEventListener("click", async () => {
      state.cardTheme = name;
      localStorage.setItem("rotation.cardtheme", name);
      [...swatches.children].forEach((node) => node.classList.remove("is-active"));
      swatch.classList.add("is-active");
      await renderShareCard(data, wrap);
    });
    swatches.appendChild(swatch);
  });
  controls.appendChild(swatches);

  const button = el("button", "btn primary share-btn", t("wrapped.share"));
  button.style.width = "auto";
  button.addEventListener("click", shareWrapped);
  controls.appendChild(button);

  box.appendChild(controls);
  return box;
}

/* ── The share card ─────────────────────────────────────────────
   One canvas, drawn once: what you see on the page is exactly what the
   save button writes to a file. */
let shareCanvas = null;

const CARD = { width: 1080, height: 1920 };

/* Four looks for the share card. Each is three gradient stops plus the
   colour the small labels are drawn in. */
/* ── The colour Rotation wears ──────────────────────────────────
   Ready-made palettes rather than a free colour picker: an accent has to
   carry white text on it and stand out from the surface behind it, and a
   free choice loses that faster than it looks. */
const ACCENTS = {
  sunset: { accent: "#ff5a3c", second: "#7c6cff", ink: "#1a0800" },
  mint:   { accent: "#2ad4a4", second: "#4aa8ff", ink: "#04241c" },
  violet: { accent: "#a06bff", second: "#ff6bd6", ink: "#150526" },
  ocean:  { accent: "#3f9dff", second: "#22d3ee", ink: "#03192e" },
  gold:   { accent: "#f0b429", second: "#ff7a45", ink: "#241703" },
  rose:   { accent: "#ff5d8f", second: "#ffa26b", ink: "#2a0512" },
};

function applyAccent() {
  const theme = ACCENTS[state.accent] || ACCENTS.sunset;
  const root = document.documentElement;
  root.style.setProperty("--accent", theme.accent);
  root.style.setProperty("--accent-2", theme.second);
  root.style.setProperty("--accent-ink", theme.ink);
}

const CARD_THEMES = {
  sunset: { stops: ["#ff5a3c", "#b3234a", "#7c6cff"], label: "#ff5a3c", ink: "#eceaf2" },
  mint:   { stops: ["#2ad4a4", "#0f766e", "#123a4f"], label: "#2ad4a4", ink: "#eaf6f2" },
  night:  { stops: ["#4353d6", "#6c2bd9", "#140f2e"], label: "#8f9bff", ink: "#e8e9f6" },
  coal:   { stops: ["#4a4a58", "#23232e", "#0a0a0f"], label: "#ff5a3c", ink: "#eceaf2" },
};

const cardTheme = () => CARD_THEMES[state.cardTheme] || CARD_THEMES.sunset;

function fitText(ctx, text, maxWidth) {
  let value = String(text ?? "");
  if (ctx.measureText(value).width <= maxWidth) return value;
  while (value.length > 1 && ctx.measureText(`${value}…`).width > maxWidth) {
    value = value.slice(0, -1);
  }
  return `${value}…`;
}

function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

async function drawShareCard(data) {
  const { width, height } = CARD;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.className = "share-card";
  const ctx = canvas.getContext("2d");

  const heading = "'Bricolage Grotesque', Inter, sans-serif";
  const body = "Inter, system-ui, sans-serif";
  try { await document.fonts.ready; } catch { /* system fonts will do */ }

  ctx.fillStyle = "#0a0a0f";
  ctx.fillRect(0, 0, width, height);

  // The band at the top, with the year written across it as a pattern.
  const band = 880;
  const theme = cardTheme();
  const gradient = ctx.createLinearGradient(0, 0, width, band);
  gradient.addColorStop(0, theme.stops[0]);
  gradient.addColorStop(0.55, theme.stops[1]);
  gradient.addColorStop(1, theme.stops[2]);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, width, band);
  ctx.clip();
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, band);
  ctx.globalAlpha = 0.13;
  ctx.fillStyle = "#fff";
  ctx.font = `800 260px ${heading}`;
  ctx.rotate(-0.18);
  for (let row = -1; row < 4; row += 1) {
    ctx.fillText(`${data.year} ${data.year}`, -160, 170 + row * 250);
  }
  ctx.restore();

  // The artist of the year, as artwork.
  const coverSize = 430;
  const coverX = (width - coverSize) / 2;
  const coverY = 210;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.45)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 16;
  roundedRect(ctx, coverX, coverY, coverSize, coverSize, 18);
  ctx.fillStyle = "#14141d";
  ctx.fill();
  ctx.restore();
  const cover = data.artists[0] && data.artists[0].art;
  if (cover) {
    try {
      const image = await loadImage(art(cover, 600));
      ctx.save();
      roundedRect(ctx, coverX, coverY, coverSize, coverSize, 18);
      ctx.clip();
      ctx.drawImage(image, coverX, coverY, coverSize, coverSize);
      ctx.restore();
    } catch { /* artwork is a nicety, not a requirement */ }
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#fff";
  ctx.font = `600 30px ${body}`;
  ctx.globalAlpha = 0.85;
  ctx.fillText(`${t("wrapped.kicker")} ${data.year}`.toUpperCase(), width / 2, 130);
  ctx.globalAlpha = 1;
  ctx.font = `800 62px ${heading}`;
  ctx.fillText(fitText(ctx, data.user ? data.user.name : "", width - 200), width / 2, 780);
  ctx.textAlign = "left";

  // Two columns, the way everybody reads this kind of card.
  const column = (title, items, x, top, columnWidth) => {
    ctx.fillStyle = theme.label;
    ctx.font = `600 30px ${body}`;
    ctx.fillText(title.toUpperCase(), x, top);
    items.slice(0, 5).forEach((item, index) => {
      const lineY = top + 76 + index * 74;
      ctx.fillStyle = theme.ink;
      ctx.font = `600 40px ${body}`;
      const name = item.name || item.title || "";
      ctx.fillText(`${index + 1}.`, x, lineY);
      ctx.fillText(fitText(ctx, name, columnWidth - 70), x + 62, lineY);
    });
  };
  column(t("wrapped.top.artists"), data.artists, 84, 1010, 420);
  column(t("wrapped.top.tracks"), data.tracks, 570, 1010, 440);

  // Two facts at the bottom, the mirror image of the columns.
  const fact = (title, value, x, top, boxWidth, size) => {
    ctx.fillStyle = theme.label;
    ctx.font = `600 30px ${body}`;
    ctx.fillText(title.toUpperCase(), x, top);
    ctx.fillStyle = theme.ink;
    ctx.font = `800 ${size}px ${heading}`;
    ctx.fillText(fitText(ctx, value, boxWidth), x, top + size + 14);
  };
  fact(t("card.minutes"), num(Math.round(data.summary.seconds / 60)), 84, 1480, 420, 76);
  fact(t("card.topgenre"), data.genres.length ? data.genres[0].name : "—", 570, 1480, 440, 62);
  fact(t("stat.artists"), num(data.summary.artists), 84, 1650, 420, 62);
  fact(t("stat.tracks"), num(data.summary.tracks), 570, 1650, 440, 62);

  ctx.fillStyle = "rgba(236,234,242,.55)";
  ctx.font = `600 30px ${body}`;
  ctx.fillText("Rotation · Navidrome", 84, height - 70);

  return canvas;
}

async function renderShareCard(data, host) {
  host.replaceChildren();
  const canvas = await drawShareCard(data);
  shareCanvas = canvas;
  host.appendChild(canvas);
}

async function shareWrapped() {
  if (!shareCanvas) return;
  const blob = await new Promise((resolve) => shareCanvas.toBlob(resolve, "image/png"));
  const file = new File([blob], `rotation-${wrappedData.year}.png`, { type: "image/png" });

  // On a phone this opens the share sheet; everywhere else it saves the file.
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: `Rotation ${wrappedData.year}` });
      return;
    } catch { /* the sheet was dismissed – fall through to the download */ }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `rotation-${wrappedData.year}.png`;
  link.click();
  URL.revokeObjectURL(url);
  toast(t("wrapped.share.done"));
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}


/* ── One item, in detail ────────────────────────────────────────
   Every name in a list leads here: how often, since when, and where it
   stands in your own ranking. */
async function openDetail(kind, id, range) {
  const sheet = $("sheet");
  const body = $("sheet-body");
  sheet.hidden = false;
  body.replaceChildren(el("div", "skeleton"), el("div", "skeleton"));
  const query = new URLSearchParams({ range: range || state.range });
  if (state.viewing) query.set("user", state.viewing.id);
  try {
    const data = await api(`/api/${kind}/${encodeURIComponent(id)}?${query}`);
    renderDetail(data, body);
  } catch (error) {
    body.replaceChildren(el("p", "empty", t("detail.missing")));
  }
}

function closeDetail() {
  stopPreview();
  $("sheet").hidden = true;
}

/* ── A taste of the song ────────────────────────────────────────
   Thirty seconds from a third of the way in, which is where a song
   usually says what it is. */
const PREVIEW_SECONDS = 30;
let preview = null;

function togglePreview(trackID, frame, badge) {
  if (preview && preview.id === trackID) { stopPreview(); return; }
  stopPreview();

  const audio = new Audio(`/api/stream/${encodeURIComponent(trackID)}`);
  audio.volume = 0;
  preview = { id: trackID, audio, frame, badge, timer: 0 };
  frame.classList.add("is-playing");
  badge.textContent = "❚❚";

  audio.addEventListener("loadedmetadata", () => {
    if (Number.isFinite(audio.duration) && audio.duration > 45) {
      audio.currentTime = audio.duration * 0.3;
    }
  }, { once: true });
  audio.addEventListener("ended", stopPreview);
  audio.play().then(() => {
    rampVolume(audio, 0.9, 500);
    preview.timer = window.setTimeout(() => {
      rampVolume(audio, 0, 700, stopPreview);
    }, PREVIEW_SECONDS * 1000);
  }).catch(stopPreview);
}

function stopPreview() {
  if (!preview) return;
  window.clearTimeout(preview.timer);
  preview.audio.pause();
  preview.audio.removeAttribute("src");
  preview.frame.classList.remove("is-playing");
  preview.badge.textContent = "▶";
  preview = null;
}

function rampVolume(audio, target, span, done) {
  const from = audio.volume;
  const started = performance.now();
  function step(now) {
    const share = Math.min(1, (now - started) / span);
    audio.volume = Math.max(0, Math.min(1, from + (target - from) * share));
    if (share < 1) { requestAnimationFrame(step); return; }
    if (done) done();
  }
  requestAnimationFrame(step);
}

function renderDetail(data, host) {
  host.replaceChildren();

  const head = el("div", "detail-head");
  const frame = el("div", "art-frame");
  const image = document.createElement("img");
  image.className = data.kind === "artist" ? "art round" : "art";
  image.alt = "";
  if (data.art) image.src = art(data.art, 300);
  image.addEventListener("error", () => { image.style.visibility = "hidden"; });
  frame.appendChild(image);
  // A song can be listened to, not only counted.
  if (data.kind === "track") {
    frame.classList.add("is-playable");
    const badge = el("div", "art-play", "▶");
    frame.appendChild(badge);
    frame.addEventListener("click", () => togglePreview(data.id, frame, badge));
  }
  head.appendChild(frame);

  const titles = el("div");
  titles.appendChild(el("h2", null, data.title || data.name));
  const subtitle = data.kind === "track"
    ? [data.artist, data.album].filter(Boolean).join(" · ")
    : data.kind === "album"
      ? data.artist || ""
      : `${num(data.tracks)} ${t("unit.tracks")} · ${num(data.albums)} ${t("stat.albums")}`;
  if (subtitle) titles.appendChild(el("div", "sub", subtitle));
  const chips = el("div", "chips");
  if (data.range) chips.appendChild(el("span", "chip", rangeName(data.range.key)));
  if (data.rank) {
    chips.appendChild(el("span", "rank", `${t("detail.rank")} ${data.rank}`));
  }
  titles.appendChild(chips);
  head.appendChild(titles);
  host.appendChild(head);

  const stats = el("div", "detail-stats");
  stats.appendChild(stat(num(data.plays), t("stat.plays"), null, true));
  stats.appendChild(stat(duration(data.seconds), t("stat.time")));
  if (data.first_play) {
    stats.appendChild(stat(shortDate(data.first_play), t("detail.first")));
    stats.appendChild(stat(ago(data.last_play), t("detail.last")));
  }
  if (data.kind === "album" && data.track_total) {
    stats.appendChild(stat(`${data.tracks}/${data.track_total}`, t("detail.heard")));
  }
  host.appendChild(stats);

  if (data.months && data.months.length) {
    const section = el("div", "detail-section");
    section.appendChild(el("h3", null, `${t("detail.months")} · ${t("range.all")}`));
    const chart = el("div", "months-mini");
    const months = padMonths(data.months, 12);
    const peak = Math.max(...months.map((m) => m.plays), 1);
    months.forEach((month) => {
      const bar = el("div", "m");
      bar.style.height = `${Math.max(3, (month.plays / peak) * 100)}%`;
      bar.title = `${month.month}: ${month.plays}`;
      chart.appendChild(bar);
    });
    section.appendChild(chart);
    const labels = el("div", "mini-labels");
    labels.appendChild(el("span", null, months[0].month));
    labels.appendChild(el("span", null, months[months.length - 1].month));
    section.appendChild(labels);
    host.appendChild(section);
  }

  if (data.hours && data.hours.some(Boolean)) {
    const section = el("div", "detail-section");
    section.appendChild(el("h3", null, `${t("card.clock")} · ${t("range.all")}`));
    const chart = el("div", "hours-mini");
    const peak = Math.max(...data.hours, 1);
    data.hours.forEach((value, hour) => {
      const bar = el("div", "h");
      bar.style.height = `${Math.max(2, (value / peak) * 100)}%`;
      bar.title = `${t("time.oclock").replace("%d", hour)}: ${value}`;
      chart.appendChild(bar);
    });
    section.appendChild(chart);
    const labels = el("div", "mini-labels");
    ["0", "6", "12", "18", "23"].forEach((hour) => labels.appendChild(el("span", null, hour)));
    section.appendChild(labels);
    host.appendChild(section);
  }

  if (data.top_tracks && data.top_tracks.length) {
    const section = el("div", "detail-section");
    section.appendChild(el("h3", null, t("card.tracks")));
    const list = el("ol", "toplist");
    section.appendChild(list);
    renderTop(list, data.top_tracks, "track");
    host.appendChild(section);
  }

  if (data.top_albums && data.top_albums.length) {
    const section = el("div", "detail-section");
    section.appendChild(el("h3", null, t("card.albums")));
    const list = el("ol", "toplist");
    section.appendChild(list);
    renderTop(list, data.top_albums, "album");
    host.appendChild(section);
  }

  $("sheet-body").parentElement.scrollTop = 0;
}


/* Fills the gaps between the first and the last month, then keeps extending
   backwards until the chart has enough columns to look like one. Two plays in
   two months would otherwise draw two slabs across the whole width. */
function padMonths(months, minimum) {
  const byKey = new Map(months.map((month) => [month.month, month.plays]));
  const [firstYear, firstMonth] = months[0].month.split("-").map(Number);
  const [lastYear, lastMonth] = months[months.length - 1].month.split("-").map(Number);
  let cursor = new Date(Date.UTC(firstYear, firstMonth - 1, 1));
  const end = new Date(Date.UTC(lastYear, lastMonth - 1, 1));
  const filled = [];
  while (cursor <= end) {
    const key = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`;
    filled.push({ month: key, plays: byKey.get(key) || 0 });
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
  }
  let head = new Date(Date.UTC(firstYear, firstMonth - 1, 1));
  while (filled.length < minimum) {
    head = new Date(Date.UTC(head.getUTCFullYear(), head.getUTCMonth() - 1, 1));
    const key = `${head.getUTCFullYear()}-${String(head.getUTCMonth() + 1).padStart(2, "0")}`;
    filled.unshift({ month: key, plays: 0 });
  }
  return filled;
}

function shortDate(ts) {
  return new Date(ts * 1000).toLocaleDateString(locale(),
    { day: "numeric", month: "short", year: "numeric" });
}

/* ── Friends ────────────────────────────────────────────────── */
async function loadFriends() {
  const data = await api("/api/friends");
  const host = $("friends");
  host.replaceChildren();

  section(t("friends.incoming"), data.incoming, [
    { label: t("friends.accept"), primary: true, run: async (user) => {
      await post("/api/friends", { user_id: user.id });
      toast(t("friends.now"));
      loadFriends();
    } },
  ], null);

  section(t("friends.yours"), data.friends, [
    { label: t("friends.view"), run: (user) => { setViewing(user); switchView("overview"); } },
    { label: t("friends.compare"), run: (user) => showCompare(user) },
    { label: t("friends.remove"), run: async (user) => {
      await api(`/api/friends/${encodeURIComponent(user.id)}`, { method: "DELETE" });
      loadFriends();
    } },
  ], t("friends.none"));

  section(t("friends.outgoing"), data.outgoing, [
    { label: t("friends.withdraw"), run: async (user) => {
      await api(`/api/friends/${encodeURIComponent(user.id)}?withdraw=1`, { method: "DELETE" });
      loadFriends();
    } },
  ], null);

  section(t("friends.suggestions"), data.suggestions, [
    { label: t("friends.add"), primary: true, run: async (user) => {
      const result = await post("/api/friends", { user_id: user.id });
      toast(result.friends ? t("friends.now") : t("friends.added"));
      loadFriends();
    } },
  ], t("friends.nosuggestions"));

  function section(title, people, actions, emptyText) {
    if (!people.length && !emptyText) return;
    host.appendChild(el("div", "section-label", title));
    if (!people.length) { host.appendChild(el("p", "empty", emptyText)); return; }
    const list = el("ul", "people");
    people.forEach((user) => {
      const li = el("li");
      li.appendChild(el("span", "avatar", (user.name || "?").charAt(0).toUpperCase()));
      li.appendChild(el("span", "name", user.name));
      const box = el("span", "actions");
      actions.forEach((action) => {
        const button = el("button", `btn small${action.primary ? " primary" : ""}`, action.label);
        button.style.width = "auto";
        button.addEventListener("click", () => action.run(user));
        box.appendChild(button);
      });
      li.appendChild(box);
      list.appendChild(li);
    });
    host.appendChild(list);
  }
}

async function showCompare(user, range) {
  state.compareWith = user;
  state.compareRange = range || state.compareRange || state.range;
  const data = await api(
    `/api/compare?user=${encodeURIComponent(user.id)}&range=${state.compareRange}`);
  const card = $("compare-card");
  const host = $("compare");
  card.hidden = false;
  host.replaceChildren();

  // Its own period, because "who listened more" is a different question
  // over a week than over a year.
  const chips = el("div", "range");
  RANGES.forEach(([key, labelKey, prefix]) => {
    const chip = el("button", `chip${key === state.compareRange ? " is-active" : ""}`);
    chip.textContent = prefix ? `${prefix} ${t(labelKey)}` : t(labelKey);
    chip.addEventListener("click", () => showCompare(user, key));
    chips.appendChild(chip);
  });
  host.appendChild(chips);

  const versus = el("div", "versus");
  versus.appendChild(side(data.me, "mine"));
  versus.appendChild(el("div", "vs", "vs"));
  versus.appendChild(side(data.them, "theirs"));
  host.appendChild(versus);

  host.appendChild(el("div", "section-label", t("compare.shared")));
  if (!data.shared.length) {
    host.appendChild(el("p", "empty", t("compare.none")));
  } else {
    const legend = el("div", "legend");
    legend.appendChild(swatch("mine", data.me.user.name));
    legend.appendChild(swatch("theirs", data.them.user.name));
    host.appendChild(legend);

    data.shared.forEach((entry) => {
      const row = el("div", "shared-row");
      row.appendChild(el("span", "name", entry.name));
      const split = el("span", "split");
      const total = entry.mine + entry.theirs;
      const mine = el("span", "mine");
      mine.style.width = `${(entry.mine / total) * 100}%`;
      const theirs = el("span", "theirs");
      theirs.style.width = `${(entry.theirs / total) * 100}%`;
      split.appendChild(mine);
      split.appendChild(theirs);
      row.appendChild(split);
      row.appendChild(el("span", "count", `${entry.mine} · ${entry.theirs}`));
      row.title = `${data.me.user.name}: ${entry.mine} · ${data.them.user.name}: ${entry.theirs}`;
      host.appendChild(row);
    });
  }
  card.scrollIntoView({ behavior: "smooth", block: "nearest" });

  function side(person, tone) {
    const box = el("div", "side");
    box.appendChild(el("div", "who-name", person.user.name));
    const value = el("div", "value", num(person.summary.plays));
    if (tone === "theirs") value.style.color = "var(--accent-2)";
    else value.style.color = "var(--accent)";
    box.appendChild(value);
    box.appendChild(el("div", "label", t("stat.plays")));
    box.appendChild(el("div", "sub", duration(person.summary.seconds)));
    box.appendChild(el("div", "sub", `${num(person.summary.artists)} ${t("stat.artists")}`));
    return box;
  }

  function swatch(tone, name) {
    const item = el("span", "legend-item");
    item.appendChild(el("span", `dot ${tone}`));
    item.appendChild(document.createTextNode(name));
    return item;
  }
}

/* ── Settings ───────────────────────────────────────────────── */
async function loadSettings() {
  wireSeasonSettings();
  renderAccentPicker();
  const me = state.me;
  const facts = $("account");
  facts.replaceChildren();
  const add = (label, value) => {
    facts.appendChild(el("dt", null, label));
    facts.appendChild(el("dd", null, value));
  };
  add(t("account.user"), me.user.name);
  add(t("account.since"), me.bounds.first_play
    ? new Date(me.bounds.first_play * 1000).toLocaleDateString(locale())
    : "–");
  add(t("account.plays"), num(me.bounds.history_plays));
  add(t("account.tz"), me.timezone);
  $("discoverable").checked = me.discoverable;
  $("version").textContent = me.version;
}

/* ── Wiring ─────────────────────────────────────────────────── */
$("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = $("login-btn");
  const error = $("login-err");
  error.hidden = true;
  button.disabled = true;
  button.textContent = t("gate.busy");
  try {
    await post("/api/login", {
      username: $("login-user").value.trim(),
      password: $("login-pass").value,
    });
    $("login-pass").value = "";
    await boot();
  } catch (exception) {
    const key = exception.payload && exception.payload.error;
    error.textContent = t(`err.${key}`) !== `err.${key}` ? t(`err.${key}`) : t("err.generic");
    error.hidden = false;
  } finally {
    button.disabled = false;
    button.textContent = t("gate.go");
  }
});

$("tabs").addEventListener("click", (event) => {
  const tab = event.target.closest(".tab");
  if (tab) switchView(tab.dataset.view);
});

$("range").addEventListener("click", (event) => {
  const chip = event.target.closest(".chip");
  if (!chip) return;
  state.range = chip.dataset.range;
  document.querySelectorAll(".chip").forEach((node) => {
    node.classList.toggle("is-active", node === chip);
  });
  loadOverview();
});

$("lang").addEventListener("change", (event) => {
  state.lang = event.target.value;
  localStorage.setItem("rotation.lang", state.lang);
  applyLanguage();
  if (!$("app").hidden) switchView(state.view);
});

$("make-playlist").addEventListener("click", (event) => makePlaylist(event.target));
$("drop-playlist").addEventListener("click", dropPlaylist);

$("theme").addEventListener("click", () => {
  state.theme = state.theme === "dark" ? "light" : "dark";
  localStorage.setItem("rotation.theme", state.theme);
  applyTheme();
});

$("viewing-back").addEventListener("click", () => {
  setViewing(null);
  switchView(state.view);
});

$("wrapped-year").addEventListener("change", (event) => loadWrapped(event.target.value));

$("discoverable").addEventListener("change", async (event) => {
  await post("/api/settings", { discoverable: event.target.checked });
  state.me.discoverable = event.target.checked;
});

$("sheet-backdrop").addEventListener("click", closeDetail);
$("sheet-close").addEventListener("click", closeDetail);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeDetail();
});

$("logout").addEventListener("click", async () => {
  await post("/api/logout");
  state.me = null;
  showGate();
});

async function boot() {
  applyLanguage();
  applyTheme();
  applyAccent();
  try {
    state.me = await api("/api/me");
  } catch {
    showGate();
    return;
  }
  $("who").textContent = state.me.user.name;
  showApp();
  setViewing(null);
  switchView("overview");
}

boot();
