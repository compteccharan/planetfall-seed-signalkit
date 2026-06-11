// Title screen — the arcade boot menu shown over the orbit view on first
// load. START GAME dismisses it; OPTIONS holds CONTROLS and SOUND. Sound
// drives the existing #audio-panel controls (the canonical music state) so
// this menu and the in-game panel can never disagree.
export function createTitleScreen({ onStart } = {}) {
  const root = document.getElementById("title-screen");
  const screens = {
    main: document.getElementById("ts-main"),
    options: document.getElementById("ts-options"),
    controls: document.getElementById("ts-controls"),
    sound: document.getElementById("ts-sound"),
  };
  const parentOf = { options: "main", controls: "options", sound: "options" };

  const bgm = document.getElementById("bgm");
  const audioToggle = document.getElementById("audio-toggle");
  const audioVolume = document.getElementById("audio-volume");
  const musicState = document.getElementById("ts-music-state");
  const volume = document.getElementById("ts-volume");
  const volumePct = document.getElementById("ts-volume-pct");

  let active = false;
  let screenName = "main";
  let items = [];
  let sel = 0;

  function syncSound() {
    if (!bgm) return;
    const playing = !bgm.paused;
    musicState.textContent = playing ? "ON" : "OFF";
    musicState.classList.toggle("is-off", !playing);
    volume.value = String(bgm.volume);
    volumePct.textContent = `${Math.round(bgm.volume * 100)}%`;
  }
  bgm?.addEventListener("play", syncSound);
  bgm?.addEventListener("pause", syncSound);
  bgm?.addEventListener("volumechange", syncSound);

  function setVolume(v) {
    const clamped = Math.min(1, Math.max(0, v));
    // reflect immediately — the bgm volumechange event arrives async, too
    // late for a rapid second keypress to read the fresh value
    volume.value = String(clamped);
    volumePct.textContent = `${Math.round(clamped * 100)}%`;
    if (audioVolume) {
      // route through the in-game slider so its handler applies + reflects it
      audioVolume.value = String(clamped);
      audioVolume.dispatchEvent(new Event("input"));
    } else if (bgm) {
      bgm.volume = clamped;
    }
  }

  function toggleMusic() {
    if (audioToggle) audioToggle.click();
    else if (bgm) bgm.paused ? bgm.play().catch(() => {}) : bgm.pause();
  }

  function setSel(i) {
    if (!items.length) return;
    sel = (i + items.length) % items.length;
    items.forEach((el, idx) => el.classList.toggle("is-selected", idx === sel));
  }

  function setScreen(name) {
    screenName = name;
    for (const [key, el] of Object.entries(screens)) {
      el.classList.toggle("hidden", key !== name);
    }
    items = [...screens[name].querySelectorAll(".ts-item")];
    setSel(0);
    if (name === "sound") syncSound();
  }

  function back() {
    if (parentOf[screenName]) setScreen(parentOf[screenName]);
  }

  function activate(el) {
    switch (el?.dataset.action) {
      case "start": hide(); onStart?.(); break;
      case "options": setScreen("options"); break;
      case "controls": setScreen("controls"); break;
      case "sound": setScreen("sound"); break;
      case "music-toggle": toggleMusic(); break;
      case "back": back(); break;
    }
  }

  function onKey(e) {
    if (!active) return;
    const item = items[sel];
    const onVolume = item?.dataset.action === "volume";
    switch (e.key) {
      case "ArrowUp": case "w": case "W": setSel(sel - 1); break;
      case "ArrowDown": case "s": case "S": setSel(sel + 1); break;
      case "Enter": case " ": activate(item); break;
      case "Escape": back(); break;
      case "ArrowLeft":
        if (!onVolume) return;
        setVolume(Number(volume.value) - 0.05);
        break;
      case "ArrowRight":
        if (!onVolume) return;
        setVolume(Number(volume.value) + 0.05);
        break;
      default: return;
    }
    e.preventDefault();
  }
  window.addEventListener("keydown", onKey);

  for (const el of root.querySelectorAll(".ts-item")) {
    el.addEventListener("mouseenter", () => {
      const idx = items.indexOf(el);
      if (idx >= 0) setSel(idx);
    });
    el.addEventListener("click", (e) => {
      if (e.target === volume) return; // slider drag, not a menu pick
      const idx = items.indexOf(el);
      if (idx >= 0) setSel(idx);
      activate(el);
    });
  }
  volume?.addEventListener("input", () => setVolume(Number(volume.value)));

  function show() {
    active = true;
    root.classList.remove("hidden", "is-leaving");
    document.body.classList.add("title-up");
    setScreen("main");
    syncSound();
  }

  function hide() {
    active = false;
    document.body.classList.remove("title-up");
    root.classList.add("is-leaving");
    setTimeout(() => root.classList.add("hidden"), 650); // match the CSS fade
  }

  return { show };
}
