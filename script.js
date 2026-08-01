(() => {
  "use strict";

  // Backend is a separate Render service from this static site — point at its URL.
  // Localhost keeps working against a locally-running backend on port 3000.
  const API_BASE = location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "http://localhost:3000"
    : "https://love-y09o.onrender.com";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- page navigation ---------------- */

  const pages = ["page-envelope", "page-1", "page-2", "page-pin", "page-3", "page-4"];
  const dots = document.querySelectorAll("#dots span");

  function goTo(id) {
    pages.forEach((p) => document.getElementById(p).classList.remove("visible"));
    document.getElementById(id).classList.add("visible");

    const stepIndex = pages.indexOf(id); // page-1 -> 1, page-2 -> 2, ...
    const dotsEl = document.getElementById("dots");
    if (id === "page-envelope") {
      dotsEl.hidden = true;
    } else {
      dotsEl.hidden = false;
      dots.forEach((d, i) => d.classList.toggle("active", i < stepIndex));
    }
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }

  document.getElementById("btn-open").addEventListener("click", () => {
    const env = document.getElementById("page-envelope");
    env.classList.add("opening");
    setTimeout(() => goTo("page-1"), reduceMotion ? 0 : 420);
  });

  document.getElementById("no-1").addEventListener("click", () => goTo("page-2"));
  document.getElementById("yes-2").addEventListener("click", () => goTo("page-pin"));
  document.getElementById("yes-pin").addEventListener("click", () => goTo("page-3"));

  /* ---------------- the button that cannot be caught ---------------- */

  function makeUncatchable(btn, stage, captionEl, captions) {
    let dodges = 0;
    let placed = false;

    function place(x, y) {
      btn.style.left = x + "px";
      btn.style.top = y + "px";
    }

    function currentSpot() {
      const s = stage.getBoundingClientRect();
      const b = btn.getBoundingClientRect();
      return { x: b.left - s.left, y: b.top - s.top };
    }

    function activateAbsolute() {
      if (placed) return;
      const spot = currentSpot();
      btn.classList.add("btn-dodge");
      btn.classList.remove("btn-anchor");
      stage.style.minHeight = stage.getBoundingClientRect().height + "px";
      place(spot.x, spot.y);
      placed = true;
    }

    function dodge() {
      activateAbsolute();
      const sRect = stage.getBoundingClientRect();
      const bRect = btn.getBoundingClientRect();
      const maxX = Math.max(sRect.width - bRect.width, 0);
      const maxY = Math.max(sRect.height - bRect.height, 0);
      const x = Math.random() * maxX;
      const y = Math.random() * maxY;
      place(x, y);

      dodges += 1;
      if (captionEl && captions.length) {
        captionEl.textContent = captions[Math.min(dodges - 1, captions.length - 1)];
      }
    }

    // desktop: dodge before the cursor even gets there
    stage.addEventListener("pointermove", (e) => {
      if (e.pointerType === "touch") return;
      const b = btn.getBoundingClientRect();
      const cx = b.left + b.width / 2;
      const cy = b.top + b.height / 2;
      const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
      if (dist < 85) dodge();
    });

    // touch: dodge the instant a finger lands near/on it
    btn.addEventListener(
      "touchstart",
      (e) => {
        e.preventDefault();
        dodge();
      },
      { passive: false }
    );

    // absolute last resort: never let the click land
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      dodge();
    });

    btn.addEventListener("mouseenter", dodge);
  }

  makeUncatchable(
    document.getElementById("yes-1"),
    document.getElementById("stage-1"),
    document.getElementById("caption-1"),
    ["nice try.", "nuh-uh.", "not happening.", "you can't catch me.", "okay you're persistent, I respect it. still no.", "the answer is No. click No. 😌"]
  );

  makeUncatchable(
    document.getElementById("no-2"),
    document.getElementById("stage-2"),
    document.getElementById("caption-2"),
    ["that's not a real option.", "wrong button.", "try the other one 👉", "I already know the answer, just click Yes.", "we both know where this is going."]
  );

  makeUncatchable(
    document.getElementById("no-pin"),
    document.getElementById("stage-pin"),
    document.getElementById("caption-pin"),
    ["mm, no.", "try again.", "we both know you did 👀", "the Yes button is right there.", "not accepting that answer."]
  );

  /* ---------------- feedback form ---------------- */

  const form = document.getElementById("feedback-form");
  const note = document.getElementById("form-note");
  const submitBtn = document.getElementById("btn-submit");

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function buildReceipt(liked, disliked, extra) {
    const rows = [
      ["She likes", liked || "—"],
      ["She'd change", disliked || "—"],
    ];
    if (extra) rows.push(["Also said", extra]);
    return rows
      .map(
        ([label, value]) => `
        <div class="r-row">
          <div class="r-label">${escapeHtml(label)}</div>
          <div class="r-value">${escapeHtml(value)}</div>
        </div>`
      )
      .join("");
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const liked = document.getElementById("liked").value.trim();
    const disliked = document.getElementById("disliked").value.trim();
    const extra = document.getElementById("extra").value.trim();

    if (!liked && !disliked && !extra) {
      note.textContent = "Tell me at least one thing 🙂";
      note.classList.add("error");
      return;
    }
    note.textContent = "";
    note.classList.remove("error");

    submitBtn.disabled = true;
    submitBtn.textContent = "Sending…";

    const payload = {
      name: "Sanghmitra",
      angryAnswer: "no",
      likeAnswer: "yes",
      pinAnswer: "yes",
      liked,
      disliked,
      extra,
      submittedAt: new Date().toISOString(),
    };

    try {
      const res = await fetch(`${API_BASE}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("bad response");

      document.getElementById("receipt").innerHTML = buildReceipt(liked, disliked, extra);
      goTo("page-4");
    } catch (err) {
      note.textContent = "Hmm, that didn't send. Mind trying again?";
      note.classList.add("error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Send it to him 💌";
    }
  });

  /* ---------------- ambient background ---------------- */

  const canvas = document.getElementById("bg-canvas");
  const ctx = canvas.getContext("2d");
  let particles = [];
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function seedParticles() {
    const count = window.innerWidth < 600 ? 12 : 20;
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: 1.5 + Math.random() * 3,
      speed: 0.15 + Math.random() * 0.35,
      drift: (Math.random() - 0.5) * 0.4,
      hue: Math.random() > 0.5 ? "184,142,68" : "231,169,196",
      alpha: 0.15 + Math.random() * 0.25,
    }));
  }

  function tick() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (const p of particles) {
      p.y -= p.speed;
      p.x += p.drift;
      if (p.y < -10) { p.y = window.innerHeight + 10; p.x = Math.random() * window.innerWidth; }
      if (p.x < -10) p.x = window.innerWidth + 10;
      if (p.x > window.innerWidth + 10) p.x = -10;

      ctx.beginPath();
      ctx.fillStyle = `rgba(${p.hue}, ${p.alpha})`;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    requestAnimationFrame(tick);
  }

  resize();
  seedParticles();
  window.addEventListener("resize", () => { resize(); seedParticles(); });

  if (!reduceMotion) {
    requestAnimationFrame(tick);
  } else {
    tick(); // draw one static frame
  }
})();
