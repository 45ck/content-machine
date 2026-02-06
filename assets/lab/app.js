const appEl = document.getElementById('app');
const sessionLineEl = document.getElementById('sessionLine');
const footStatusEl = document.getElementById('footStatus');

const state = {
  config: null,
  token: null,
  sessionId: null,
  cleanup: null,
};

function setFootStatus(text) {
  footStatusEl.textContent = text || '';
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function shortId(id) {
  const s = String(id || '');
  if (s.length <= 14) return s;
  return s.slice(0, 8) + '…' + s.slice(-4);
}

function metricPill(value) {
  if (value === null || value === undefined) return '<span class="pill">n/a</span>';
  const n = Number(value);
  if (!Number.isFinite(n)) return '<span class="pill">n/a</span>';
  const cls = n >= 80 ? 'pill pill-ok' : n >= 60 ? 'pill pill-warn' : 'pill pill-bad';
  return `<span class="${cls}">${Math.round(n)}/100</span>`;
}

function metricChip(label, value) {
  if (value === null || value === undefined)
    return `<span class="pill">${escapeHtml(label)} n/a</span>`;
  const n = Number(value);
  if (!Number.isFinite(n)) return `<span class="pill">${escapeHtml(label)} n/a</span>`;
  const cls = n >= 80 ? 'pill pill-ok' : n >= 60 ? 'pill pill-warn' : 'pill pill-bad';
  return `<span class="${cls}">${escapeHtml(label)} ${Math.round(n)}/100</span>`;
}

function tryParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function buildApiError(res, text, data) {
  const fallback = { code: 'HTTP_ERROR', message: text || res.statusText };
  const err =
    data && typeof data === 'object' && data.error && typeof data.error === 'object'
      ? data.error
      : fallback;
  const message = err.message || res.statusText;
  const code = err.code || 'HTTP_ERROR';
  const context = err.context && typeof err.context === 'object' ? err.context : {};
  const fix =
    context && typeof context.fix === 'string' && context.fix.trim() ? `\nFix: ${context.fix}` : '';
  return new Error(`${code}: ${message}${fix}`);
}

async function apiGet(path) {
  const res = await fetch(path, { headers: { 'Cache-Control': 'no-store' } });
  const text = await res.text();
  const data = text ? tryParseJson(text) : null;
  if (!res.ok) {
    throw buildApiError(res, text, data);
  }
  return data;
}

async function apiPost(path, body, { requestId } = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'X-CM-LAB-TOKEN': state.token,
  };
  if (requestId) headers['X-CM-LAB-REQUEST-ID'] = requestId;

  const res = await fetch(path, {
    method: 'POST',
    headers,
    body: JSON.stringify(body || {}),
  });
  const text = await res.text();
  const data = text ? tryParseJson(text) : null;
  if (!res.ok) {
    throw buildApiError(res, text, data);
  }
  return data;
}

function parseTags(csv) {
  return String(csv || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

function parseIso(iso) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso || '');
    return d.toLocaleString();
  } catch {
    return String(iso || '');
  }
}

function formatSeconds(seconds) {
  const n = Number(seconds);
  if (!Number.isFinite(n) || n < 0) return '--:--';
  const total = Math.floor(n);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function mediaErrorLabel(videoEl) {
  const err = videoEl && videoEl.error ? videoEl.error : null;
  if (!err) return null;
  const code = Number(err.code);
  const map = { 1: 'aborted', 2: 'network', 3: 'decode', 4: 'src-not-supported' };
  const label = map[code] || 'unknown';
  return `${label} (${code || '?'})`;
}

function bindVideoDiagnostics({ videoEl, statusEl, label }) {
  if (!videoEl || !statusEl) return;

  const update = () => {
    const err = mediaErrorLabel(videoEl);
    if (err) {
      statusEl.textContent = `${label}: error ${err}`;
      statusEl.classList.add('video-status-error');
      return;
    }
    statusEl.classList.remove('video-status-error');

    const time = formatSeconds(videoEl.currentTime);
    const dur = formatSeconds(videoEl.duration);
    const rate = Number.isFinite(videoEl.playbackRate) ? `${videoEl.playbackRate.toFixed(2)}x` : '';
    const state = videoEl.paused ? 'paused' : 'playing';
    statusEl.textContent = `${label}: ${state} ${time}/${dur} ${rate}`.trim();
  };

  [
    'loadedmetadata',
    'durationchange',
    'timeupdate',
    'play',
    'pause',
    'ratechange',
    'waiting',
    'playing',
    'error',
    'stalled',
    'seeking',
  ].forEach((ev) => {
    videoEl.addEventListener(ev, update);
  });

  update();
}

function getRoute() {
  const raw = window.location.hash || '#/runs';
  const h = raw.startsWith('#') ? raw.slice(1) : raw;
  const [path] = h.split('?');
  const parts = path.split('/').filter(Boolean);
  return parts;
}

function renderError(err) {
  const msg = err instanceof Error ? err.message : String(err);
  appEl.innerHTML = `<div class="card"><div class="card-inner"><div class="error">${escapeHtml(
    msg
  )}</div></div></div>`;
}

function ratingGridHtml(prefix) {
  const rows = [
    ['overall', 'Overall'],
    ['hook', 'Hook'],
    ['pacing', 'Pacing'],
    ['visuals', 'Visuals'],
    ['captions', 'Captions'],
    ['sync', 'Sync'],
  ];

  return `
    <div class="rating-grid" data-prefix="${escapeHtml(prefix)}">
      ${rows
        .map(
          ([key, label]) => `
          <div class="rating unset" data-key="${escapeHtml(key)}">
            <div class="label">${escapeHtml(label)}</div>
            <input class="range" type="range" min="0" max="100" step="1" value="70" />
            <input class="input num" type="number" inputmode="numeric" min="0" max="100" placeholder="-" />
            <button class="btn clear" type="button">Clear</button>
          </div>
        `
        )
        .join('')}
    </div>
  `;
}

function bindRatingGrid(rootEl, initialValues = {}) {
  const grid = rootEl.querySelector('.rating-grid');
  if (!grid) return;

  const getValue = (key) => {
    const row = grid.querySelector(`.rating[data-key="${CSS.escape(key)}"]`);
    if (!row) return null;
    const num = row.querySelector('.num');
    const val = String(num.value || '').trim();
    if (!val) return null;
    const n = Number.parseInt(val, 10);
    if (!Number.isFinite(n)) return null;
    return Math.max(0, Math.min(100, n));
  };

  const setValue = (key, nOrNull) => {
    const row = grid.querySelector(`.rating[data-key="${CSS.escape(key)}"]`);
    if (!row) return;
    const range = row.querySelector('.range');
    const num = row.querySelector('.num');
    if (nOrNull === null || nOrNull === undefined) {
      row.classList.add('unset');
      num.value = '';
      range.value = '70';
      return;
    }
    const n = Math.max(0, Math.min(100, Math.round(Number(nOrNull))));
    row.classList.remove('unset');
    num.value = String(n);
    range.value = String(n);
  };

  for (const [key, value] of Object.entries(initialValues || {})) {
    setValue(key, value);
  }

  grid.querySelectorAll('.rating').forEach((row) => {
    const key = row.getAttribute('data-key');
    const range = row.querySelector('.range');
    const num = row.querySelector('.num');
    const clear = row.querySelector('.clear');

    range.addEventListener('input', () => {
      if (!key) return;
      setValue(key, Number(range.value));
    });
    num.addEventListener('input', () => {
      if (!key) return;
      const raw = String(num.value || '').trim();
      if (!raw) {
        setValue(key, null);
        return;
      }
      const n = Number.parseInt(raw, 10);
      if (!Number.isFinite(n)) return;
      setValue(key, n);
    });
    clear.addEventListener('click', () => {
      if (!key) return;
      setValue(key, null);
    });
  });

  return {
    getRatings: () => {
      const out = {};
      ['overall', 'hook', 'pacing', 'visuals', 'captions', 'sync'].forEach((k) => {
        const v = getValue(k);
        if (typeof v === 'number') out[k] = v;
      });
      return out;
    },
    setRatings: (ratings) => {
      ['overall', 'hook', 'pacing', 'visuals', 'captions', 'sync'].forEach((k) => {
        setValue(k, ratings && typeof ratings[k] === 'number' ? ratings[k] : null);
      });
    },
  };
}

function setupLinkedVideoControls({ videoA, videoB, linkEl, speedEl, audioEl, toggleEl, syncEl }) {
  const suppress = new WeakMap();
  let driver = 'a';

  function nowMs() {
    return typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now()
      : Date.now();
  }

  function isSuppressed(videoEl) {
    const until = Number(suppress.get(videoEl) || 0);
    return nowMs() < until;
  }

  function suppressFor(videoEl, ms = 800) {
    suppress.set(videoEl, nowMs() + ms);
  }

  function safePlay(videoEl) {
    try {
      const p = videoEl.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch {
      // Best-effort: play() can fail due to autoplay policies or decode issues.
      return;
    }
  }

  function safePause(videoEl) {
    try {
      videoEl.pause();
    } catch {
      return;
    }
  }

  function safeSetCurrentTime(videoEl, t) {
    try {
      if (!Number.isFinite(t)) return;
      videoEl.currentTime = t;
    } catch {
      return;
    }
  }

  function safeSetPlaybackRate(videoEl, rate) {
    try {
      if (!Number.isFinite(rate) || rate <= 0) return;
      videoEl.playbackRate = rate;
    } catch {
      return;
    }
  }

  function applyAudio() {
    if (!audioEl) return;
    const mode = String(audioEl.value || 'a');
    if (mode === 'mute') {
      videoA.muted = true;
      videoB.muted = true;
      return;
    }
    if (mode === 'both') {
      videoA.muted = false;
      videoB.muted = false;
      return;
    }
    if (mode === 'b') {
      videoA.muted = true;
      videoB.muted = false;
      return;
    }
    videoA.muted = false;
    videoB.muted = true;
  }

  function sync(from, to) {
    if (!linkEl.checked) return;
    if (isSuppressed(from)) return;
    suppressFor(to);
    safeSetCurrentTime(to, from.currentTime);
    safeSetPlaybackRate(to, from.playbackRate);
    applyAudio();
    if (from.paused) safePause(to);
    else safePlay(to);
  }

  function setDriver(which) {
    driver = which;
  }

  videoA.addEventListener('play', () => {
    if (isSuppressed(videoA)) return;
    setDriver('a');
    sync(videoA, videoB);
  });
  videoB.addEventListener('play', () => {
    if (isSuppressed(videoB)) return;
    setDriver('b');
    sync(videoB, videoA);
  });
  videoA.addEventListener('pause', () => {
    if (isSuppressed(videoA)) return;
    setDriver('a');
    sync(videoA, videoB);
  });
  videoB.addEventListener('pause', () => {
    if (isSuppressed(videoB)) return;
    setDriver('b');
    sync(videoB, videoA);
  });

  // Sync seeks but avoid seeked ping-pong loops (seek completion fires async).
  videoA.addEventListener('seeking', () => {
    if (isSuppressed(videoA)) return;
    setDriver('a');
    sync(videoA, videoB);
  });
  videoB.addEventListener('seeking', () => {
    if (isSuppressed(videoB)) return;
    setDriver('b');
    sync(videoB, videoA);
  });

  speedEl.addEventListener('change', () => {
    const rate = Number(speedEl.value);
    if (!Number.isFinite(rate) || rate <= 0) return;
    safeSetPlaybackRate(videoA, rate);
    safeSetPlaybackRate(videoB, rate);
  });

  if (audioEl) {
    audioEl.addEventListener('change', applyAudio);
  }

  toggleEl.addEventListener('click', () => {
    if (videoA.paused && videoB.paused) {
      setDriver('a');
      const t = Math.min(Number(videoA.currentTime || 0), Number(videoB.currentTime || 0));
      suppressFor(videoA);
      suppressFor(videoB);
      safeSetCurrentTime(videoA, t);
      safeSetCurrentTime(videoB, t);
      applyAudio();
      safePlay(videoA);
      safePlay(videoB);
      return;
    }
    suppressFor(videoA);
    suppressFor(videoB);
    safePause(videoA);
    safePause(videoB);
  });

  syncEl.addEventListener('click', () => {
    const t = Math.min(Number(videoA.currentTime || 0), Number(videoB.currentTime || 0));
    suppressFor(videoA);
    suppressFor(videoB);
    safeSetCurrentTime(videoA, t);
    safeSetCurrentTime(videoB, t);
  });

  // Light drift correction loop so A/B stays watchable for longer clips.
  const driftTimer = setInterval(() => {
    if (!linkEl.checked) return;
    if (videoA.readyState < 1 || videoB.readyState < 1) return;
    if (videoA.paused || videoB.paused) return;

    const master = driver === 'b' ? videoB : videoA;
    const follower = driver === 'b' ? videoA : videoB;
    const diff = Number(follower.currentTime) - Number(master.currentTime);
    if (!Number.isFinite(diff)) return;

    const baseRate = Number.isFinite(master.playbackRate) ? master.playbackRate : 1;
    if (Math.abs(diff) > 0.25) {
      suppressFor(follower);
      safeSetCurrentTime(follower, master.currentTime);
      safeSetPlaybackRate(follower, baseRate);
      applyAudio();
      safePlay(follower);
      return;
    }

    const nudge = Math.max(-0.04, Math.min(0.04, -diff * 0.35));
    safeSetPlaybackRate(follower, baseRate + nudge);
  }, 250);

  driftTimer.unref && driftTimer.unref();
  applyAudio();

  return () => {
    clearInterval(driftTimer);
  };
}

async function renderRunsPage() {
  setFootStatus('Loading runs…');
  const runs = await apiGet('/api/runs');
  setFootStatus('');

  let selected = [];

  function render() {
    const items = Array.isArray(runs.items) ? runs.items : [];
    const selectedSet = new Set(selected);

    appEl.innerHTML = `
      <div class="card">
        <div class="card-inner">
          <div class="compare-head">
            <div>
              <h1 class="h1">Runs</h1>
              <div class="muted mono">Import artifacts or a video path, then review or compare.</div>
            </div>
            <div class="pill">${escapeHtml(shortId(state.sessionId))}</div>
          </div>

          <div class="row">
            <div class="col">
              <form id="importForm" class="row" style="align-items: center;">
                <input class="input" id="importPath" placeholder="/abs/path/to/output/run-123 or /abs/path/to/video.mp4" />
                <button class="btn btn-primary" type="submit">Import</button>
              </form>
              <div class="muted mono" style="margin-top: 6px;">Allowed roots are configured by the CLI. If import fails, restart with <span class="mono">--allow-root</span>.</div>
            </div>
          </div>

          <div class="sep"></div>

          <div class="row" style="align-items: center; justify-content: space-between;">
            <div class="muted mono">Selected for compare: ${selected.map(shortId).join(' , ') || 'none'}</div>
            <button class="btn btn-primary" id="compareBtn" ${selected.length === 2 ? '' : 'disabled'} type="button">Compare selected</button>
          </div>

          <div style="margin-top: 12px; overflow: auto;">
            <table class="table">
              <thead>
                <tr>
                  <th style="width: 34px;"></th>
                  <th>Run</th>
                  <th>Created</th>
                  <th>Topic</th>
                  <th>Sync</th>
                  <th>Caption</th>
                  <th>Score</th>
                  <th style="width: 90px;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${items
                  .map((r) => {
                    const sync = r.autoMetricsSummary ? r.autoMetricsSummary.syncRating : null;
                    const cap = r.autoMetricsSummary ? r.autoMetricsSummary.captionOverall : null;
                    const score = r.autoMetricsSummary
                      ? r.autoMetricsSummary.proxyScoreOverall
                      : null;
                    const checked = selectedSet.has(r.runId);
                    return `
                      <tr>
                        <td><input type="checkbox" class="pick" data-run="${escapeHtml(r.runId)}" ${checked ? 'checked' : ''} /></td>
                        <td class="mono" title="${escapeHtml(r.runId)}">${escapeHtml(shortId(r.runId))}</td>
                        <td>${escapeHtml(parseIso(r.createdAt))}</td>
                        <td>${escapeHtml(r.topic || '')}</td>
                        <td>${metricPill(sync)}</td>
                        <td>${metricPill(cap)}</td>
                        <td>${metricPill(score)}</td>
                        <td><a class="nav-link" href="#/review/${encodeURIComponent(r.runId)}">Review</a></td>
                      </tr>
                    `;
                  })
                  .join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    const form = document.getElementById('importForm');
    const importPath = document.getElementById('importPath');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const p = String(importPath.value || '').trim();
      if (!p) return;
      setFootStatus('Importing…');
      try {
        const requestId = crypto.randomUUID();
        const out = await apiPost('/api/runs/import', { path: p }, { requestId });
        setFootStatus('');
        window.location.hash = `#/review/${encodeURIComponent(out.runId)}`;
      } catch (err) {
        setFootStatus('');
        renderError(err);
      }
    });

    document.querySelectorAll('.pick').forEach((el) => {
      el.addEventListener('change', () => {
        const runId = el.getAttribute('data-run');
        if (!runId) return;
        const next = selected.slice();
        const idx = next.indexOf(runId);
        if (el.checked && idx === -1) next.push(runId);
        if (!el.checked && idx !== -1) next.splice(idx, 1);
        selected = next.slice(-2);
        render();
      });
    });

    document.getElementById('compareBtn').addEventListener('click', async () => {
      if (selected.length !== 2) return;
      setFootStatus('Creating experiment…');
      try {
        const requestId = crypto.randomUUID();
        const out = await apiPost(
          '/api/experiments',
          {
            name: 'A/B Compare',
            baselineRunId: selected[0],
            variants: [{ label: 'B', runId: selected[1] }],
          },
          { requestId }
        );
        setFootStatus('');
        window.location.hash = `#/compare/${encodeURIComponent(out.experimentId)}`;
      } catch (err) {
        setFootStatus('');
        renderError(err);
      }
    });
  }

  render();
}

async function renderExperimentsPage() {
  setFootStatus('Loading experiments…');
  const list = await apiGet('/api/experiments');
  setFootStatus('');
  const items = Array.isArray(list.items) ? list.items : [];

  appEl.innerHTML = `
    <div class="card">
      <div class="card-inner">
        <div class="compare-head">
          <div>
            <h1 class="h1">Experiments</h1>
            <div class="muted mono">Open a compare page to submit a one-shot review.</div>
          </div>
          <div class="pill">${escapeHtml(shortId(state.sessionId))}</div>
        </div>

        <div style="margin-top: 12px; overflow: auto;">
          <table class="table">
            <thead>
              <tr>
                <th>Experiment</th>
                <th>Created</th>
                <th>Name</th>
                <th>Topic</th>
                <th>Status</th>
                <th style="width: 90px;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${items
                .map(
                  (e) => `
                <tr>
                  <td class="mono" title="${escapeHtml(e.experimentId)}">${escapeHtml(shortId(e.experimentId))}</td>
                  <td>${escapeHtml(parseIso(e.createdAt))}</td>
                  <td>${escapeHtml(e.name)}</td>
                  <td>${escapeHtml(e.topic || '')}</td>
                  <td class="mono">${escapeHtml(e.status)}</td>
                  <td><a class="nav-link" href="#/compare/${encodeURIComponent(e.experimentId)}">Open</a></td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

async function renderReviewPage(runId) {
  setFootStatus('Loading run…');
  const run = await apiGet(`/api/runs/${encodeURIComponent(runId)}`);
  setFootStatus('');

  const artifacts = run.artifacts || {};
  const links = [];
  if (artifacts.script)
    links.push(['script.json', `/api/runs/${encodeURIComponent(runId)}/artifact/script.json`]);
  if (artifacts.timestamps)
    links.push([
      'timestamps.json',
      `/api/runs/${encodeURIComponent(runId)}/artifact/timestamps.json`,
    ]);
  if (artifacts.visuals)
    links.push(['visuals.json', `/api/runs/${encodeURIComponent(runId)}/artifact/visuals.json`]);
  if (artifacts.score)
    links.push(['score.json', `/api/runs/${encodeURIComponent(runId)}/artifact/score.json`]);
  if (artifacts.reports && artifacts.reports.sync)
    links.push([
      'sync-report.json',
      `/api/runs/${encodeURIComponent(runId)}/artifact/sync-report.json`,
    ]);
  if (artifacts.reports && artifacts.reports.caption)
    links.push([
      'caption-report.json',
      `/api/runs/${encodeURIComponent(runId)}/artifact/caption-report.json`,
    ]);

  const m = run.autoMetricsSummary || {};

  const oneShot =
    state.config &&
    state.config.task &&
    state.config.task.type === 'review' &&
    state.config.task.runId === runId &&
    Number(state.config.exitAfterSubmit || 0) > 0;

  appEl.innerHTML = `
    <div class="card">
      <div class="card-inner">
        <div class="compare-head">
          <div>
            <h1 class="h1">Review</h1>
            <div class="muted mono">Run: <span class="mono">${escapeHtml(run.runId)}</span></div>
            <div class="muted mono">Topic: ${escapeHtml(run.topic || '')}</div>
          </div>
          <div class="pill ${oneShot ? 'pill-warn' : ''}">${oneShot ? 'one-shot (auto-close)' : 'session'}</div>
        </div>

        <div class="row" style="margin-top: 12px;">
          <div class="col">
            <video id="videoReview" class="video" controls playsinline preload="metadata" src="/api/runs/${encodeURIComponent(runId)}/video"></video>
            <div class="video-status muted mono" id="statusReview"></div>
            <div class="sep"></div>
            <div class="row" style="align-items: center; gap: 10px; flex-wrap: wrap;">
              ${metricChip('sync', m.syncRating)}
              ${metricChip('caption', m.captionOverall)}
              ${metricChip('score', m.proxyScoreOverall)}
            </div>
            <div class="muted mono" style="margin-top: 10px;">Artifacts: ${
              links.length
                ? links
                    .map(
                      ([name, href]) =>
                        `<a class="nav-link mono" target="_blank" rel="noreferrer" href="${href}">${escapeHtml(name)}</a>`
                    )
                    .join(' ')
                : 'none detected'
            }</div>
          </div>
          <div class="col">
            <h2 class="h2">Feedback</h2>
            <div class="muted mono">Submit writes a feedback entry tagged to this Lab session.</div>
            ${ratingGridHtml('review')}
            <div class="sep"></div>
            <div class="row">
              <div class="col">
                <div class="muted mono">Notes</div>
                <textarea class="textarea" id="notes" placeholder="What stood out? What would you change?"></textarea>
              </div>
            </div>
            <div class="row" style="margin-top: 10px; align-items: center;">
              <div class="col">
                <div class="muted mono">Tags (comma-separated)</div>
                <input class="input" id="tags" placeholder="captions-dense, hook-weak, visuals-off" />
              </div>
              <div>
                <button class="btn btn-primary" id="submitBtn" type="button">Submit</button>
              </div>
            </div>
            <div id="submitMsg" style="margin-top: 10px;"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  bindVideoDiagnostics({
    videoEl: document.getElementById('videoReview'),
    statusEl: document.getElementById('statusReview'),
    label: 'Video',
  });

  const gridApi = bindRatingGrid(appEl);
  const submitBtn = document.getElementById('submitBtn');
  const submitMsgEl = document.getElementById('submitMsg');
  let submitting = false;

  submitBtn.addEventListener('click', async () => {
    if (submitting) return;
    const ratings = gridApi.getRatings();
    if (typeof ratings.overall !== 'number') {
      submitMsgEl.innerHTML = `<div class="error">overall is required</div>`;
      return;
    }
    const notes = document.getElementById('notes').value;
    const tags = parseTags(document.getElementById('tags').value);

    submitting = true;
    submitBtn.disabled = true;
    submitMsgEl.innerHTML = '';
    setFootStatus('Submitting…');
    try {
      const requestId = crypto.randomUUID();
      await apiPost(
        '/api/feedback',
        {
          runId,
          ratings,
          notes: String(notes || '').trim() || undefined,
          tags: tags.length ? tags : undefined,
        },
        { requestId }
      );
      submitMsgEl.innerHTML = `<div class="success">Submitted. ${
        oneShot ? 'Server will close shortly.' : 'You can close this tab when you are done.'
      }</div>`;
    } catch (err) {
      submitMsgEl.innerHTML = `<div class="error">${escapeHtml(
        err instanceof Error ? err.message : String(err)
      )}</div>`;
      submitBtn.disabled = false;
    } finally {
      setFootStatus('');
      submitting = false;
    }
  });
}

async function renderComparePage(experimentId) {
  setFootStatus('Loading experiment…');
  const exp = await apiGet(`/api/experiments/${encodeURIComponent(experimentId)}`);
  setFootStatus('Loading runs…');
  const baseline = await apiGet(`/api/runs/${encodeURIComponent(exp.baselineRunId)}`);
  const variant = exp.variants && exp.variants[0] ? exp.variants[0] : null;
  const variantRun = variant
    ? await apiGet(`/api/runs/${encodeURIComponent(variant.runId)}`)
    : null;
  setFootStatus('');

  const blindDefault = Boolean(
    state.config && state.config.ui && state.config.ui.blindMetricsDefault
  );

  const oneShot =
    state.config &&
    state.config.task &&
    state.config.task.type === 'compare' &&
    state.config.task.experimentId === experimentId &&
    Number(state.config.exitAfterSubmit || 0) > 0;

  const done = exp.status === 'done';

  appEl.innerHTML = `
    <div class="card">
      <div class="card-inner">
        <div class="compare-head">
          <div>
            <h1 class="h1">Compare</h1>
            <div class="muted mono">Experiment: <span class="mono">${escapeHtml(exp.experimentId)}</span></div>
            <div class="muted mono">Hypothesis: ${escapeHtml(exp.hypothesis || '')}</div>
          </div>
          <div class="pill ${oneShot ? 'pill-warn' : ''}">${oneShot ? 'one-shot (auto-close)' : 'session'}</div>
        </div>

        <div class="sep"></div>

        <div class="row" style="align-items: center; justify-content: space-between; flex-wrap: wrap;">
          <label class="toggle"><input id="linkVideos" type="checkbox" checked /> link playback</label>
          <div class="row" style="align-items: center;">
            <button class="btn" id="playPause" type="button">Play/Pause</button>
            <button class="btn" id="syncBtn" type="button">Sync</button>
            <label class="toggle">audio
              <select class="select" id="audioSel" style="width: 120px;">
                <option value="a" selected>A</option>
                <option value="b">B</option>
                <option value="both">Both</option>
                <option value="mute">Mute</option>
              </select>
            </label>
            <label class="toggle">speed
              <select class="select" id="speedSel" style="width: 110px;">
                <option value="0.75">0.75x</option>
                <option value="1" selected>1x</option>
                <option value="1.25">1.25x</option>
                <option value="1.5">1.5x</option>
              </select>
            </label>
          </div>
        </div>

        <div class="sep"></div>

        <div class="two">
          <div>
            <div class="pill mono">A (baseline) ${escapeHtml(shortId(baseline.runId))}</div>
            <div class="muted mono" style="margin-top: 6px;">${escapeHtml(baseline.topic || '')}</div>
            <video id="videoA" class="video" controls playsinline preload="metadata" src="/api/runs/${encodeURIComponent(baseline.runId)}/video"></video>
            <div class="video-status muted mono" id="statusA"></div>
          </div>
          <div>
            <div class="pill mono">B (variant) ${variant ? escapeHtml(shortId(variant.runId)) : 'missing'}</div>
            <div class="muted mono" style="margin-top: 6px;">${escapeHtml((variantRun && variantRun.topic) || '')}</div>
            ${
              variant
                ? `<video id="videoB" class="video" controls playsinline preload="metadata" src="/api/runs/${encodeURIComponent(variant.runId)}/video"></video>
                   <div class="video-status muted mono" id="statusB"></div>`
                : `<div class="error">No variant found for this experiment.</div>`
            }
          </div>
        </div>

        <div class="sep"></div>

        <div class="row" style="align-items: center; justify-content: space-between; flex-wrap: wrap;">
          <div class="row" style="align-items: center; gap: 12px; flex-wrap: wrap;">
            <label class="toggle"><input id="revealMetrics" type="checkbox" ${blindDefault ? '' : 'checked'} /> reveal metrics (may bias)</label>
            <div id="metricsA" style="display: none;">
              ${metricChip('A sync', (baseline.autoMetricsSummary || {}).syncRating)}
              ${metricChip('A caption', (baseline.autoMetricsSummary || {}).captionOverall)}
              ${metricChip('A score', (baseline.autoMetricsSummary || {}).proxyScoreOverall)}
            </div>
            <div id="metricsB" style="display: none;">
              ${metricChip('B sync', (variantRun && (variantRun.autoMetricsSummary || {}).syncRating) || null)}
              ${metricChip('B caption', (variantRun && (variantRun.autoMetricsSummary || {}).captionOverall) || null)}
              ${metricChip('B score', (variantRun && (variantRun.autoMetricsSummary || {}).proxyScoreOverall) || null)}
            </div>
          </div>
          <div class="pill mono">${done ? 'already submitted' : 'ready'}</div>
        </div>

        <div class="sep"></div>

        <div class="row">
          <div class="col">
            <h2 class="h2">Winner</h2>
            <div class="row" style="align-items: center; gap: 12px; flex-wrap: wrap; margin-top: 8px;">
              <label class="toggle"><input type="radio" name="winner" value="baseline" /> A wins</label>
              <label class="toggle"><input type="radio" name="winner" value="${variant ? escapeHtml(variant.variantId) : ''}" /> B wins</label>
              <label class="toggle"><input type="radio" name="winner" value="" /> No winner</label>
            </div>
            <div class="sep"></div>
            <div class="muted mono">Reason (optional)</div>
            <textarea class="textarea" id="reason" placeholder="What made it better?"></textarea>
          </div>
          <div class="col">
            <h2 class="h2">Questions</h2>
            <div class="muted mono">Agent-authored targeted questions (optional).</div>
            <div id="questions" style="margin-top: 10px;"></div>
          </div>
        </div>

        <div class="sep"></div>

        <div class="row" style="align-items: center; justify-content: space-between; flex-wrap: wrap;">
          <h2 class="h2">Ratings</h2>
          <div class="row" style="align-items: center;">
            <button class="btn" id="copyAtoB" type="button">Copy A to B</button>
            <button class="btn" id="copyBtoA" type="button">Copy B to A</button>
          </div>
        </div>

        <div class="two" style="margin-top: 10px;">
          <div class="card" style="box-shadow: none;">
            <div class="card-inner">
              <div class="pill mono">A</div>
              ${ratingGridHtml('a')}
              <div class="sep"></div>
              <div class="muted mono">Notes (A)</div>
              <textarea class="textarea" id="notesA" placeholder="Notes for A"></textarea>
              <div class="muted mono" style="margin-top: 10px;">Tags (A)</div>
              <input class="input" id="tagsA" placeholder="comma,separated" />
            </div>
          </div>
          <div class="card" style="box-shadow: none;">
            <div class="card-inner">
              <div class="pill mono">B</div>
              ${ratingGridHtml('b')}
              <div class="sep"></div>
              <div class="muted mono">Notes (B)</div>
              <textarea class="textarea" id="notesB" placeholder="Notes for B"></textarea>
              <div class="muted mono" style="margin-top: 10px;">Tags (B)</div>
              <input class="input" id="tagsB" placeholder="comma,separated" />
            </div>
          </div>
        </div>

        <div class="sep"></div>

        <div class="row" style="align-items: center; justify-content: space-between; flex-wrap: wrap;">
          <div class="muted mono">${oneShot ? 'Submitting will close the server automatically.' : 'Submit once when done.'}</div>
          <button class="btn btn-primary" id="submitCompare" type="button" ${done ? 'disabled' : ''}>Submit</button>
        </div>
        <div id="submitMsg" style="margin-top: 10px;"></div>
      </div>
    </div>
  `;

  const revealEl = document.getElementById('revealMetrics');
  const metricsAEl = document.getElementById('metricsA');
  const metricsBEl = document.getElementById('metricsB');
  const applyReveal = () => {
    const on = Boolean(revealEl.checked);
    metricsAEl.style.display = on ? 'inline-flex' : 'none';
    metricsBEl.style.display = on ? 'inline-flex' : 'none';
  };
  if (blindDefault) revealEl.checked = false;
  applyReveal();
  revealEl.addEventListener('change', applyReveal);

  const questionsEl = document.getElementById('questions');
  const questions = Array.isArray(exp.questions) ? exp.questions : [];
  if (!questions.length) {
    questionsEl.innerHTML = `<div class="muted mono">No targeted questions for this experiment.</div>`;
  } else {
    questionsEl.innerHTML = questions
      .map((q) => {
        const id = escapeHtml(q.id);
        const prompt = escapeHtml(q.prompt);
        if (q.type === 'text') {
          return `
            <div style="margin-bottom: 10px;">
              <div class="muted mono">${prompt}</div>
              <textarea class="textarea" data-q="${id}" placeholder="Answer"></textarea>
            </div>
          `;
        }
        return `
          <div style="margin-bottom: 10px;">
            <div class="muted mono">${prompt}</div>
            <select class="select" data-q="${id}">
              <option value="">(skip)</option>
              <option value="yes">yes</option>
              <option value="no">no</option>
              <option value="unsure">unsure</option>
            </select>
          </div>
        `;
      })
      .join('');
  }

  const gridAApi = bindRatingGrid(appEl.querySelector('[data-prefix="a"]').closest('.card-inner'));
  const gridBApi = bindRatingGrid(appEl.querySelector('[data-prefix="b"]').closest('.card-inner'));

  document.getElementById('copyAtoB').addEventListener('click', () => {
    gridBApi.setRatings(gridAApi.getRatings());
  });
  document.getElementById('copyBtoA').addEventListener('click', () => {
    gridAApi.setRatings(gridBApi.getRatings());
  });

  const videoAEl = document.getElementById('videoA');
  bindVideoDiagnostics({
    videoEl: videoAEl,
    statusEl: document.getElementById('statusA'),
    label: 'A',
  });

  if (variant) {
    const videoBEl = document.getElementById('videoB');
    state.cleanup = setupLinkedVideoControls({
      videoA: videoAEl,
      videoB: videoBEl,
      linkEl: document.getElementById('linkVideos'),
      speedEl: document.getElementById('speedSel'),
      audioEl: document.getElementById('audioSel'),
      toggleEl: document.getElementById('playPause'),
      syncEl: document.getElementById('syncBtn'),
    });
    bindVideoDiagnostics({
      videoEl: videoBEl,
      statusEl: document.getElementById('statusB'),
      label: 'B',
    });
  }

  const submitCompareBtn = document.getElementById('submitCompare');
  const submitCompareMsgEl = document.getElementById('submitMsg');
  let submittingCompare = false;

  submitCompareBtn.addEventListener('click', async () => {
    if (submittingCompare) return;
    if (!variant) return;
    const ratingsA = gridAApi.getRatings();
    const ratingsB = gridBApi.getRatings();
    if (typeof ratingsA.overall !== 'number' || typeof ratingsB.overall !== 'number') {
      submitCompareMsgEl.innerHTML = `<div class="error">overall is required for both A and B</div>`;
      return;
    }

    const winner = document.querySelector('input[name="winner"]:checked');
    const winnerVariantId = winner ? String(winner.value || '') : '';

    const answers = {};
    questionsEl.querySelectorAll('[data-q]').forEach((el) => {
      const id = el.getAttribute('data-q');
      const val = String(el.value || '').trim();
      if (!id || !val) return;
      answers[id] = val;
    });

    const body = {
      winnerVariantId: winnerVariantId || undefined,
      reason: String(document.getElementById('reason').value || '').trim() || undefined,
      answers: Object.keys(answers).length ? answers : undefined,
      perRun: [
        {
          runId: baseline.runId,
          variantId: 'baseline',
          ratings: ratingsA,
          notes: String(document.getElementById('notesA').value || '').trim() || undefined,
          tags: (() => {
            const t = parseTags(document.getElementById('tagsA').value);
            return t.length ? t : undefined;
          })(),
        },
        {
          runId: variant.runId,
          variantId: variant.variantId,
          ratings: ratingsB,
          notes: String(document.getElementById('notesB').value || '').trim() || undefined,
          tags: (() => {
            const t = parseTags(document.getElementById('tagsB').value);
            return t.length ? t : undefined;
          })(),
        },
      ],
    };

    submittingCompare = true;
    submitCompareBtn.disabled = true;
    submitCompareMsgEl.innerHTML = '';
    setFootStatus('Submitting…');
    try {
      const requestId = crypto.randomUUID();
      const out = await apiPost(
        `/api/experiments/${encodeURIComponent(experimentId)}/submit`,
        body,
        { requestId }
      );
      submitCompareMsgEl.innerHTML = `<div class="success">Submitted. feedbackIds: ${escapeHtml(
        Array.isArray(out.feedbackIds) ? out.feedbackIds.map(shortId).join(', ') : ''
      )} ${oneShot ? 'Server will close shortly.' : ''}</div>`;
    } catch (err) {
      submitCompareMsgEl.innerHTML = `<div class="error">${escapeHtml(
        err instanceof Error ? err.message : String(err)
      )}</div>`;
      submitCompareBtn.disabled = false;
    } finally {
      setFootStatus('');
      submittingCompare = false;
    }
  });
}

async function renderRoute() {
  if (typeof state.cleanup === 'function') {
    state.cleanup();
    state.cleanup = null;
  }

  const parts = getRoute();
  const page = parts[0] || 'runs';

  try {
    if (page === 'runs') {
      await renderRunsPage();
      return;
    }
    if (page === 'experiments') {
      await renderExperimentsPage();
      return;
    }
    if (page === 'review') {
      const runId = parts[1];
      if (!runId) throw new Error('Missing runId');
      await renderReviewPage(decodeURIComponent(runId));
      return;
    }
    if (page === 'compare') {
      const experimentId = parts[1];
      if (!experimentId) throw new Error('Missing experimentId');
      await renderComparePage(decodeURIComponent(experimentId));
      return;
    }

    window.location.hash = '#/runs';
  } catch (err) {
    renderError(err);
  }
}

async function init() {
  setFootStatus('Loading config…');
  try {
    const config = await apiGet('/api/config');
    state.config = config;
    state.token = config.token;
    state.sessionId = config.sessionId;
    sessionLineEl.textContent = `session ${shortId(config.sessionId)}  |  ${config.task ? config.task.type : 'idle'}`;
    setFootStatus('');

    window.addEventListener('hashchange', () => {
      renderRoute();
    });
    await renderRoute();
  } catch (err) {
    setFootStatus('');
    renderError(err);
  }
}

init();
