/* ── The year as a story ────────────────────────────────────────
   Full screen, one card at a time, running by itself. Hold to pause,
   tap left or right to step. Two of the cards ask before they tell:
   the numbers land differently when you have just guessed at them.

   Everything here comes from the recap the page already loaded – no
   extra request except the music, which Rotation streams through from
   Navidrome with the session's own credentials. */

Object.assign(STRINGS.de, {
  "story.start": "Als Story ansehen",
  "season.title": "Dein Rückblick %s ist da",
  "season.sub": "Zwölf Monate Musik, in zwei Minuten erzählt.",
  "season.open": "Ansehen",
  "settings.accent": "Farbe",
  "playlist.make": "Playlist erstellen",
  "playlist.update": "Playlist aktualisieren",
  "playlist.drop": "nicht mehr pflegen",
  "playlist.drop.hint": "Rotation hört auf, sie zu aktualisieren. Die Playlist selbst bleibt in Navidrome.",
  "playlist.dropped": "Wird nicht mehr aktualisiert. Die Playlist bleibt in Navidrome.",
  "playlist.working": "Wird angelegt …",
  "playlist.done": "%n steht in Navidrome – %s Titel, täglich aktualisiert.",
  "playlist.failed": "Die Playlist konnte nicht angelegt werden.",
  "settings.season": "Story ganzjährig im Rückblick zeigen",
  "settings.season.hint": "Betrifft nur den Knopf auf der Rückblick-Seite. Auf der Startseite meldet sich der Rückblick immer nur vom 1. Dezember bis 31. Januar.",
  "settings.notify": "An den Rückblick erinnern",
  "settings.notify.hint": "Der Browser meldet sich, sobald der Rückblick da ist – dafür muss Rotation einmal geöffnet werden.",
  "season.notify.body": "Dein Jahr in Musik wartet auf dich.",
  "story.intro": "Dein Jahr in Musik",
  "story.intro.sub": "Zwölf Monate, ein paar Zahlen und zwei Fragen.",
  "story.minutes": "So lange hast du zugehört",
  "story.minutes.sub": "%s Wiedergaben an %s Tagen",
  "story.quiz.artist": "Wer war dein Künstler des Jahres?",
  "story.quiz.plays": "Wie oft lief dein Lieblingssong?",
  "story.right": "Richtig!",
  "story.wrong": "Knapp daneben.",
  "story.artists": "Deine Top-Künstler",
  "story.tracks": "Deine Top-Songs",
  "story.artist.one": "Dein Künstler des Jahres",
  "story.track.one": "Dein Song des Jahres",
  "story.devotion": "%s % von allem, was du gehört hast",
  "story.genre": "Dein Genre",
  "story.hour": "Deine Stunde",
  "story.streak": "Deine längste Strähne",
  "story.streak.sub": "%s Tage am Stück",
  "story.new": "Neu für dich",
  "story.previous": "Gegen %s",
  "story.score": "%s von %s Fragen richtig",
  "story.end": "Das war dein %s",
  "story.mute": "Ton aus",
  "story.unmute": "Ton an",
  "story.close": "Schließen",
  "story.skip": "Überspringen",
});

Object.assign(STRINGS.en, {
  "story.start": "Watch as a story",
  "season.title": "Your %s recap is here",
  "season.sub": "Twelve months of music, told in two minutes.",
  "season.open": "Watch",
  "settings.accent": "Colour",
  "playlist.make": "Create a playlist",
  "playlist.update": "Refresh the playlist",
  "playlist.drop": "stop maintaining",
  "playlist.drop.hint": "Rotation stops refreshing it. The playlist itself stays in Navidrome.",
  "playlist.dropped": "No longer refreshed. The playlist stays in Navidrome.",
  "playlist.working": "Creating …",
  "playlist.done": "%n is in Navidrome – %s tracks, refreshed daily.",
  "playlist.failed": "The playlist could not be created.",
  "settings.season": "Show the story on the recap page all year",
  "settings.season.hint": "This is about the button on the recap page only. On the home page the recap still announces itself from 1 December to 31 January.",
  "settings.notify": "Remind me about the recap",
  "settings.notify.hint": "The browser lets you know once the recap is there – Rotation has to be opened once for that.",
  "season.notify.body": "Your year in music is waiting.",
  "story.intro": "Your year in music",
  "story.intro.sub": "Twelve months, a few numbers and two questions.",
  "story.minutes": "That is how long you listened",
  "story.minutes.sub": "%s plays on %s days",
  "story.quiz.artist": "Who was your artist of the year?",
  "story.quiz.plays": "How often did your favourite song play?",
  "story.right": "Right!",
  "story.wrong": "Not quite.",
  "story.artists": "Your top artists",
  "story.tracks": "Your top tracks",
  "story.artist.one": "Your artist of the year",
  "story.track.one": "Your track of the year",
  "story.devotion": "%s % of everything you played",
  "story.genre": "Your genre",
  "story.hour": "Your hour",
  "story.streak": "Your longest streak",
  "story.streak.sub": "%s days in a row",
  "story.new": "New to you",
  "story.previous": "Against %s",
  "story.score": "%s of %s questions right",
  "story.end": "That was your %s",
  "story.mute": "Sound off",
  "story.unmute": "Sound on",
  "story.close": "Close",
  "story.skip": "Skip",
});

const STORY_HOLD = 7000;      // how long a card stays on its own
const STORY_QUESTION = 14000; // a question waits longer, but not forever
const STORY_ANSWERED = 1600;  // let the confetti land before moving on
const STORY_TAP = 220;        // longer than this is a hold, not a tap
const STORY_COOLDOWN = 500;   // two taps that close together are one thumb

const story = {
  cards: [],
  index: 0,
  data: null,
  answers: {},
  span: 0,
  elapsed: 0,
  startedAt: 0,
  raf: 0,
  fade: 0,
  stepped: 0,
  deaf: 0,
  paused: false,
  muted: localStorage.getItem("rotation.storymuted") === "1",
  audio: null,
  playing: null,
};

/* ── Building the cards ─────────────────────────────────────── */

function storyCards(data) {
  const cards = [];
  const artists = data.artists || [];
  const tracks = data.tracks || [];

  cards.push({
    music: openingTrack(data),
    build: () => {
      const box = el("div", "st-body st-centre");
      box.appendChild(el("div", "st-year", String(data.year)));
      box.appendChild(el("h2", "st-title", t("story.intro")));
      box.appendChild(el("p", "st-sub", t("story.intro.sub")));
      return box;
    },
  });

  cards.push({
    build: () => {
      const box = el("div", "st-body st-centre");
      box.appendChild(el("div", "st-kicker", t("story.minutes")));
      const value = el("div", "st-huge", "0");
      box.appendChild(value);
      countUp(value, Math.round(data.summary.seconds / 60), (n) => num(n));
      box.appendChild(el("div", "st-unit", t("card.minutes")));
      box.appendChild(el("p", "st-sub", t("story.minutes.sub")
        .replace("%s", num(data.summary.plays))
        .replace("%s", num(data.summary.active_days))));
      return box;
    },
  });

  if (artists.length >= 4) {
    cards.push(quizCard({
      question: t("story.quiz.artist"),
      right: artists[0].name,
      // The decoys come from further down the same list: a name you do
      // know, just not the one that won.
      options: pickDecoys(artists.slice(1).map((a) => a.name), 3),
    }));
    cards.push({
      music: data.artist_track?.id,
      build: () => {
        const box = el("div", "st-body st-centre");
        box.appendChild(cover(artists[0].art, artists[0].name, true));
        box.appendChild(el("div", "st-kicker", t("story.artist.one")));
        box.appendChild(el("h2", "st-title", artists[0].name));
        box.appendChild(el("p", "st-sub",
          `${num(artists[0].plays)} ${t("unit.plays")} · ` +
          t("story.devotion").replace("%s", data.devotion)));
        return box;
      },
    });
  }

  if (artists.length) {
    cards.push({
      build: () => listCard(t("story.artists"), artists.slice(0, 5),
        (a) => a.name, (a) => `${num(a.plays)} ${t("unit.plays")}`, true),
    });
  }

  if (tracks.length >= 2) {
    cards.push(quizCard({
      question: t("story.quiz.plays"),
      right: String(tracks[0].plays),
      options: playGuesses(tracks[0].plays),
      numeric: true,
    }));
    cards.push({
      music: tracks[0].id,
      build: () => {
        const box = el("div", "st-body st-centre");
        box.appendChild(cover(tracks[0].art, tracks[0].title));
        box.appendChild(el("div", "st-kicker", t("story.track.one")));
        box.appendChild(el("h2", "st-title", tracks[0].title));
        box.appendChild(el("p", "st-sub",
          `${tracks[0].artist} · ${num(tracks[0].plays)} ${t("unit.plays")}`));
        return box;
      },
    });
  }

  if (tracks.length) {
    cards.push({
      build: () => listCard(t("story.tracks"), tracks.slice(0, 5),
        (x) => x.title, (x) => x.artist, false),
    });
  }

  const genre = (data.genres || [])[0];
  if (genre || data.clock.peak_hour !== null) {
    cards.push({
      music: data.genre_track?.id,
      build: () => {
        const box = el("div", "st-body st-centre");
        if (genre) {
          box.appendChild(el("div", "st-kicker", t("story.genre")));
          box.appendChild(el("h2", "st-title", genre.name));
        }
        if (data.clock.peak_hour !== null && data.clock.peak_hour !== undefined) {
          box.appendChild(el("div", "st-kicker st-spaced", t("story.hour")));
          box.appendChild(el("div", "st-huge",
            t("time.oclock").replace("%d", data.clock.peak_hour)));
        }
        return box;
      },
    });
  }

  if (data.streak) {
    cards.push({
      build: () => {
        const box = el("div", "st-body st-centre");
        box.appendChild(el("div", "st-kicker", t("story.streak")));
        const value = el("div", "st-huge", "0");
        box.appendChild(value);
        countUp(value, data.streak, (n) => String(n));
        box.appendChild(el("p", "st-sub",
          t("story.streak.sub").replace("%s", num(data.streak))));
        return box;
      },
    });
  }

  if ((data.discoveries || []).length) {
    cards.push({
      build: () => {
        const box = el("div", "st-body st-centre");
        box.appendChild(el("div", "st-kicker", t("story.new")));
        const list = el("div", "st-chips");
        data.discoveries.slice(0, 8).forEach((item) => {
          list.appendChild(el("span", "st-chip", item.name));
        });
        box.appendChild(list);
        return box;
      },
    });
  }

  if (data.previous && data.previous.plays) {
    const delta = Math.round((data.summary.plays - data.previous.plays) * 100
      / data.previous.plays);
    cards.push({
      build: () => {
        const box = el("div", "st-body st-centre");
        box.appendChild(el("div", "st-kicker",
          t("story.previous").replace("%s", data.previous.year)));
        box.appendChild(el("div", "st-huge",
          `${delta >= 0 ? "+" : ""}${num(delta)} %`));
        box.appendChild(el("p", "st-sub",
          `${num(data.previous.plays)} → ${num(data.summary.plays)} ${t("unit.plays")}`));
        return box;
      },
    });
  }

  cards.push({
    last: true,
    build: () => {
      const box = el("div", "st-body st-centre");
      box.appendChild(el("div", "st-kicker", t("story.end").replace("%s", data.year)));
      const given = Object.values(story.answers);
      if (given.length) {
        // A headline size here fights the picture below it; this is a caption.
        box.appendChild(el("div", "st-score", t("story.score")
          .replace("%s", given.filter(Boolean).length)
          .replace("%s", given.length)));
      }
      const wrap = el("div", "st-cardimg");
      box.appendChild(wrap);
      renderShareCard(data, wrap);
      const button = el("button", "btn primary", t("wrapped.share"));
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        shareWrapped();
      });
      box.appendChild(button);
      return box;
    },
  });

  return cards;
}

/* A question and its answer are two cards, so tapping through shows both
   and the bars at the top count them. Left alone, the question moves on by
   itself after a longer moment. */
function quizCard({ question, right, options, numeric, music }) {
  return {
    music,
    hold: STORY_QUESTION,
    build: (advance, index) => {
      const box = el("div", "st-body st-centre");
      box.appendChild(el("h2", "st-question", question));
      const all = shuffle([right, ...options]);
      const grid = el("div", `st-options${numeric ? " st-numeric" : ""}`);
      all.forEach((option) => {
        const button = el("button", "st-option", option);
        button.addEventListener("click", (event) => {
          event.stopPropagation();
          if (grid.classList.contains("is-done")) return;
          grid.classList.add("is-done");
          const hit = option === right;
          // Keyed by card, so stepping back and forth cannot count twice.
          story.answers[index] = hit;
          [...grid.children].forEach((node) => {
            if (node.textContent === right) node.classList.add("is-right");
            else if (node === button) node.classList.add("is-wrong");
          });
          box.appendChild(el("p", "st-verdict", hit ? t("story.right") : t("story.wrong")));
          if (hit) confetti();
          else shake();
          advance(STORY_ANSWERED);
        });
        grid.appendChild(button);
      });
      box.appendChild(grid);
      const skip = el("button", "st-skip", t("story.skip"));
      skip.addEventListener("click", (event) => {
        event.stopPropagation();
        delete story.answers[index];
        advance(300);
      });
      box.appendChild(skip);
      return box;
    },
  };
}

/* ── Right or wrong, felt rather than read ──────────────────── */

function confetti() {
  const stage = $("story-body");
  const layer = el("div", "st-confetti");
  const colours = ["#ff5a3c", "#7c6cff", "#2ad4a4", "#ffd166", "#ffffff"];
  for (let i = 0; i < 70; i += 1) {
    const bit = el("i");
    bit.style.left = `${Math.random() * 100}%`;
    bit.style.background = colours[i % colours.length];
    bit.style.animationDelay = `${Math.random() * 0.35}s`;
    bit.style.animationDuration = `${1.5 + Math.random() * 1.2}s`;
    bit.style.transform = `rotate(${Math.random() * 360}deg)`;
    layer.appendChild(bit);
  }
  stage.appendChild(layer);
  window.setTimeout(() => layer.remove(), 3200);
  if (navigator.vibrate) navigator.vibrate([12, 40, 12]);
}

function shake() {
  const card = $("story-body").firstElementChild;
  if (!card) return;
  card.classList.remove("is-shaking");
  // Reading the layout forces the class to take effect twice in a row.
  void card.offsetWidth;
  card.classList.add("is-shaking");
  if (navigator.vibrate) navigator.vibrate(160);
}

function listCard(title, items, primary, secondary, round) {
  const box = el("div", "st-body");
  box.appendChild(el("div", "st-kicker", title));
  const list = el("ol", "st-list");
  items.forEach((item, index) => {
    const row = el("li");
    row.appendChild(el("span", "st-rank", String(index + 1)));
    const image = document.createElement("img");
    image.className = round ? "st-thumb round" : "st-thumb";
    image.alt = "";
    if (item.art) image.src = art(item.art, 120);
    row.appendChild(image);
    const text = el("div", "st-lines");
    text.appendChild(el("div", "st-name", primary(item)));
    text.appendChild(el("div", "st-meta", secondary(item)));
    row.appendChild(text);
    list.appendChild(row);
  });
  box.appendChild(list);
  return box;
}

function cover(source, name, round) {
  const image = document.createElement("img");
  image.className = round ? "st-cover round" : "st-cover";
  image.alt = "";
  if (source) image.src = art(source, 600);
  image.addEventListener("error", () => { image.style.visibility = "hidden"; });
  return image;
}

/* ── Numbers that arrive rather than appear ─────────────────── */

function countUp(node, target, format) {
  const started = performance.now();
  const span = 1200;
  function step(now) {
    const share = Math.min(1, (now - started) / span);
    // Fast at first, gentle at the end.
    const eased = 1 - Math.pow(1 - share, 3);
    node.textContent = format(Math.round(target * eased));
    if (share < 1 && $("story") && !$("story").hidden) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Three other names, spread over the list so the answer is not obvious. */
function pickDecoys(names, count) {
  const unique = [...new Set(names)];
  if (unique.length <= count) return unique;
  const step = Math.max(1, Math.floor(unique.length / count));
  const picked = [];
  for (let i = 0; picked.length < count && i < unique.length; i += step) {
    picked.push(unique[i]);
  }
  return picked;
}

/** The song for the opening card: not the winner, and not its artist's. */
function openingTrack(data) {
  const tracks = data.tracks || [];
  const banned = new Set([tracks[0]?.id, data.artist_track?.id].filter(Boolean));
  const rest = tracks.filter((track) => !banned.has(track.id));
  if (!rest.length) return tracks[0]?.id;
  return rest[Math.floor(Math.random() * rest.length)].id;
}

/** Plausible wrong counts around the real one. */
function playGuesses(real) {
  const spread = new Set();
  [0.45, 0.7, 1.6, 2.3].forEach((factor) => {
    const value = Math.max(1, Math.round(real * factor));
    if (value !== real) spread.add(String(value));
  });
  return [...spread].slice(0, 3);
}

/* ── Running it ─────────────────────────────────────────────── */

function openStory(data) {
  story.data = data;
  story.answers = {};
  story.cards = storyCards(data);
  story.index = 0;
  $("story").hidden = false;
  document.body.classList.add("story-open");
  buildBars();
  storyAudio();
  showCard(0);
}

function closeStory() {
  cancelAnimationFrame(story.raf);
  $("story").hidden = true;
  document.body.classList.remove("story-open");
  if (story.audio) {
    story.audio.pause();
    story.audio.removeAttribute("src");
    story.playing = null;
  }
}

function buildBars() {
  const bars = $("story-bars");
  bars.replaceChildren();
  story.cards.forEach(() => {
    const bar = el("div", "st-bar");
    bar.appendChild(el("i"));
    bars.appendChild(bar);
  });
}

function showCard(index, hold) {
  cancelAnimationFrame(story.raf);
  if (index < 0) index = 0;
  if (index >= story.cards.length) { closeStory(); return; }
  story.index = index;

  const card = story.cards[index];
  const body = $("story-body");
  body.replaceChildren();
  body.classList.remove("is-in");
  // An answered question hands back a shorter wait before the next card.
  const content = card.build((wait) => runTimer(wait), index);
  body.appendChild(content);
  requestAnimationFrame(() => body.classList.add("is-in"));

  // The tap that brought this card here still has its click to deliver, and
  // it would land wherever the finger happens to be – on an answer, say.
  // The card stays deaf for a moment; the page behind it keeps listening, so
  // tapping onwards still works.
  body.style.pointerEvents = "none";
  window.clearTimeout(story.deaf);
  story.deaf = window.setTimeout(() => { body.style.pointerEvents = ""; }, 400);

  [...$("story-bars").children].forEach((bar, position) => {
    bar.classList.toggle("is-done", position < index);
    bar.classList.toggle("is-now", position === index);
    if (position !== index) bar.firstChild.style.width = position < index ? "100%" : "0%";
  });

  // Only a card that brings its own song changes the music; the others let
  // whatever is playing run on.
  if (card.music) playTrack(card.music);
  runTimer(hold || card.hold || STORY_HOLD);
}

function runTimer(span) {
  story.span = span;
  story.elapsed = 0;
  story.startedAt = performance.now();
  story.paused = false;
  const bar = $("story-bars").children[story.index]?.firstChild;
  // Time is counted up while running and simply not counted while held, so a
  // pause of any length leaves the card exactly where it was.
  function step(now) {
    if (!story.paused) {
      story.elapsed += now - story.startedAt;
    }
    story.startedAt = now;
    const share = Math.min(1, story.elapsed / story.span);
    if (bar) bar.style.width = `${share * 100}%`;
    if (share >= 1) { showCard(story.index + 1); return; }
    story.raf = requestAnimationFrame(step);
  }
  story.raf = requestAnimationFrame(step);
}

function pauseStory(on) {
  if (on === story.paused) return;
  story.paused = on;
  story.startedAt = performance.now();
  $("story").classList.toggle("is-held", on);
  if (!story.audio) return;
  if (on) story.audio.pause();
  else if (!story.muted) story.audio.play().catch(() => {});
}

/* ── The music behind it ────────────────────────────────────── */

function storyAudio() {
  if (!story.audio) {
    story.audio = new Audio();
    story.audio.preload = "auto";
    story.audio.volume = 0;
  }
  story.audio.muted = story.muted;
  updateMuteButton();
}

const STORY_VOLUME = 0.55;

function playTrack(id) {
  if (!story.audio || !id || story.playing === id) return;
  story.playing = id;
  // The song that is running bows out first – cutting it dead is what made
  // the change feel like a jump.
  fadeTo(0, 450, () => startTrack(id));
}

function startTrack(id) {
  const audio = story.audio;
  if (!audio || story.playing !== id) return;
  audio.pause();
  audio.volume = 0;
  audio.src = `/api/stream/${encodeURIComponent(id)}`;
  // A song opens where it is worth hearing, not on its intro – so the
  // snippet starts somewhere in the middle third.
  const seek = () => {
    audio.removeEventListener("loadedmetadata", seek);
    if (Number.isFinite(audio.duration) && audio.duration > 45) {
      audio.currentTime = audio.duration * (0.32 + Math.random() * 0.18);
    }
  };
  audio.addEventListener("loadedmetadata", seek);
  if (story.muted) return;
  audio.play().then(() => fadeTo(STORY_VOLUME, 1400)).catch(() => {});
}

function fadeTo(target, span = 1400, done) {
  const audio = story.audio;
  if (!audio) { if (done) done(); return; }
  window.cancelAnimationFrame(story.fade);
  const from = audio.volume;
  if (from === target) { if (done) done(); return; }
  const started = performance.now();
  function step(now) {
    const share = Math.min(1, (now - started) / span);
    audio.volume = Math.max(0, Math.min(1, from + (target - from) * share));
    if (share < 1) { story.fade = requestAnimationFrame(step); return; }
    if (done) done();
  }
  story.fade = requestAnimationFrame(step);
}

function toggleMute() {
  story.muted = !story.muted;
  localStorage.setItem("rotation.storymuted", story.muted ? "1" : "0");
  if (story.audio) {
    story.audio.muted = story.muted;
    if (!story.muted) story.audio.play().then(() => fadeTo(STORY_VOLUME, 600)).catch(() => {});
  }
  updateMuteButton();
}

function updateMuteButton() {
  const button = $("story-mute");
  if (!button) return;
  button.textContent = story.muted ? "🔇" : "🔊";
  button.title = story.muted ? t("story.unmute") : t("story.mute");
}

/* ── Wiring ─────────────────────────────────────────────────── */

/** One step at a time: a second tap right after the first is the same thumb
    bouncing, not a wish to skip two cards. */
function stepCard(direction) {
  const now = performance.now();
  if (now - story.stepped < STORY_COOLDOWN) return;
  story.stepped = now;
  showCard(story.index + direction);
}

(function wireStory() {
  const root = $("story");
  if (!root) return;
  let pressedAt = 0;
  let side = "right";

  root.addEventListener("pointerdown", (event) => {
    if (event.target.closest("button")) return;
    pressedAt = performance.now();
    side = event.clientX < window.innerWidth * 0.33 ? "left" : "right";
    // Only a real hold pauses; a tap should feel instant.
    window.setTimeout(() => {
      if (pressedAt) pauseStory(true);
    }, STORY_TAP);
  });

  const release = (event) => {
    if (!pressedAt) return;
    const held = performance.now() - pressedAt;
    pressedAt = 0;
    if (story.paused) { pauseStory(false); return; }
    if (held < STORY_TAP && !event.target.closest("button")) {
      stepCard(side === "left" ? -1 : 1);
    }
  };
  root.addEventListener("pointerup", release);
  root.addEventListener("pointercancel", () => { pressedAt = 0; pauseStory(false); });

  $("story-close").addEventListener("click", closeStory);
  $("story-mute").addEventListener("click", toggleMute);
  document.addEventListener("keydown", (event) => {
    if ($("story").hidden) return;
    if (event.key === "Escape") closeStory();
    if (event.key === "ArrowRight") stepCard(1);
    if (event.key === "ArrowLeft") stepCard(-1);
  });
})();


/* ── When the recap makes itself known ──────────────────────────
   The story is there all year for whoever asks for it in the settings;
   by default it steps forward on the first of December, the way the one
   everybody knows does, and steps back at the end of January. */

const seasonAlways = () => localStorage.getItem("rotation.seasonalways") === "1";
const seasonNotify = () => localStorage.getItem("rotation.seasonnotify") === "1";

/** Whether the recap page shows its story button: in season, or on request. */
function seasonOpen() {
  return Boolean(state.me?.season?.open) || seasonAlways();
}

function seasonYear() {
  return state.me?.season?.year ?? new Date().getFullYear() - 1;
}

/** The card at the top of the overview. Season only – the setting below is
    about the recap page, not about this. */
function renderSeasonBanner() {
  const host = $("season-banner");
  if (!host) return;
  const open = Boolean(state.me?.season?.open);
  host.hidden = !open;
  if (!open) return;
  const year = seasonYear();
  host.replaceChildren();
  const card = el("div", "season-card");
  const text = el("div");
  text.appendChild(el("div", "season-title", t("season.title").replace("%s", year)));
  text.appendChild(el("div", "season-sub", t("season.sub")));
  card.appendChild(text);
  const button = el("button", "btn primary", `▶  ${t("season.open")}`);
  button.addEventListener("click", async () => {
    const data = await api(`/api/wrapped?year=${year}`);
    openStory(data);
  });
  card.appendChild(button);
  host.appendChild(card);
  announceSeason(year);
}

/** One notification per year, and only if it was asked for. */
function announceSeason(year) {
  if (!seasonNotify() || !state.me?.season?.open) return;
  if (localStorage.getItem("rotation.seasonseen") === String(year)) return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  localStorage.setItem("rotation.seasonseen", String(year));
  new Notification(t("season.title").replace("%s", year), {
    body: t("season.notify.body"),
    icon: "/static/mark.svg",
  });
}

function wireSeasonSettings() {
  const always = $("season-always");
  const notify = $("season-notify");
  if (!always || !notify) return;
  always.checked = seasonAlways();
  notify.checked = seasonNotify() && Notification?.permission === "granted";
  always.addEventListener("change", (event) => {
    localStorage.setItem("rotation.seasonalways", event.target.checked ? "1" : "0");
    renderSeasonBanner();
    if (state.view === "wrapped" && wrappedData) renderWrapped(wrappedData);
  });
  notify.addEventListener("change", async (event) => {
    if (!event.target.checked) {
      localStorage.setItem("rotation.seasonnotify", "0");
      return;
    }
    if (!("Notification" in window)) { event.target.checked = false; return; }
    const granted = Notification.permission === "granted"
      || (await Notification.requestPermission()) === "granted";
    event.target.checked = granted;
    localStorage.setItem("rotation.seasonnotify", granted ? "1" : "0");
  });
}
