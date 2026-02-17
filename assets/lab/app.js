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

function scheduleWindowClose(delayMs = 800) {
  setTimeout(() => {
    try {
      window.close();
    } catch {
      // Some environments (especially tabs not opened by script) block programmatic close.
      // We still show successful submit in the UI and rely on server auto-close.
    }
  }, delayMs);
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
  const [pathPart, queryString = ''] = h.split('?');
  const parts = pathPart.split('/').filter(Boolean);
  return { parts, query: new URLSearchParams(queryString) };
}

function parseBooleanQueryParam(query, keys) {
  if (!query || !keys) return false;
  const names = Array.isArray(keys) ? keys : [keys];
  for (const key of names) {
    const raw = query.get(key);
    if (raw === null) continue;
    const normalized = String(raw).trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  }
  return false;
}

function parseRouteModes(query) {
  const routeRequireOverall = parseBooleanQueryParam(query, [
    'requireOverall',
    'require-overall',
    'overall',
  ]);
  const routeGoodBadMode = parseBooleanQueryParam(query, ['goodBadMode', 'good-bad', 'goodBad']);
  return {
    requireOverall: routeRequireOverall,
    goodBadMode: routeGoodBadMode,
  };
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
    ['motion', 'Motion'],
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

function quickRateHtml(prefix, label) {
  const safePrefix = escapeHtml(prefix);
  return `
    <div class="quick-rate" data-prefix="${safePrefix}">
      <div class="muted mono">Quick ${escapeHtml(label)} overall</div>
      <div class="quick-rate-row">
        <input
          class="range quick-range"
          type="range"
          data-prefix="${safePrefix}"
          data-field="overall"
          min="0"
          max="100"
          value="70"
        />
        <input
          class="input quick-num"
          type="number"
          data-prefix="${safePrefix}"
          data-field="overall"
          min="0"
          max="100"
          value="70"
        />
      </div>
      <div class="quick-rate-value muted mono" data-prefix="${safePrefix}" data-field="overall">70</div>
      <div class="advanced-only">
        <div class="muted mono" style="margin-top: 8px;">Quick note</div>
        <textarea class="textarea quick-note" data-prefix="${safePrefix}" data-field="note" placeholder="What made it good or bad overall?"></textarea>
      </div>
    </div>
  `;
}

function runCardHtml({
  prefix,
  label,
  runId,
  topic,
  run,
  variantId,
  isVariant = false,
  index = 0,
}) {
  const safePrefix = escapeHtml(prefix);
  const labelText = escapeHtml(label || prefix.toUpperCase());
  const upperPrefix = safePrefix.toUpperCase();
  const summary = run && run.autoMetricsSummary ? run.autoMetricsSummary : null;
  const safeVariantId = escapeHtml(
    String(variantId || (isVariant ? `v-${safePrefix}` : 'baseline'))
  );
  return `
    <div
      class="run-card"
      data-run-prefix="${safePrefix}"
      data-run-index="${String(index)}"
      data-run-id="${escapeHtml(runId)}"
      data-run-variant="${escapeHtml(isVariant ? '1' : '0')}"
      data-run-variant-id="${safeVariantId}"
      data-run-label="${labelText}"
    >
      <div class="pill mono">${labelText}</div>
      <div class="muted mono advanced-only" style="margin-top: 6px;">${escapeHtml(topic || '')}</div>
      <video
        id="video${upperPrefix}"
        class="video"
        autoplay
        muted
        controls
        loop
        playsinline
        preload="auto"
        src="/api/runs/${encodeURIComponent(runId)}/video"
      ></video>
      <div class="video-status muted mono advanced-only" id="status${upperPrefix}"></div>
      <div class="sep"></div>
      <div class="run-metrics muted mono" id="metrics${upperPrefix}" style="display: none;">
        ${metricChip(`${labelText} sync`, summary ? summary.syncRating : null)}
        ${metricChip(`${labelText} caption`, summary ? summary.captionOverall : null)}
        ${metricChip(`${labelText} score`, summary ? summary.proxyScoreOverall : null)}
      </div>
      <div class="muted mono advanced-only" style="margin-top: 8px;"><span class="mono">Run:</span> ${escapeHtml(shortId(runId))}</div>
      ${quickRateHtml(safePrefix, labelText)}
      <div class="sep advanced-only"></div>
      <div class="advanced-only">
        ${ratingGridHtml(safePrefix)}
      </div>
      <div class="sep advanced-only"></div>
      <div class="muted mono advanced-only">Notes (${labelText}) — detailed</div>
      <textarea class="textarea notes-field advanced-only" id="notes${safePrefix}" placeholder="Notes for ${labelText}"></textarea>
      <div class="muted mono advanced-only" style="margin-top: 10px;">Tags (${labelText})</div>
      <input class="input tags-field advanced-only" id="tags${safePrefix}" placeholder="comma,separated" />
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
      ['overall', 'hook', 'pacing', 'visuals', 'motion', 'captions', 'sync'].forEach((k) => {
        const v = getValue(k);
        if (typeof v === 'number') out[k] = v;
      });
      return out;
    },
    setRatings: (ratings) => {
      ['overall', 'hook', 'pacing', 'visuals', 'motion', 'captions', 'sync'].forEach((k) => {
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
      const attempt = () => {
        const p = videoEl.play();
        if (!p || typeof p.catch !== 'function') return;

        p.catch(() => {
          if (videoEl.muted) return;

          try {
            videoEl.muted = true;
            const mutedPlay = videoEl.play();
            if (!mutedPlay || typeof mutedPlay.then !== 'function') return;
            mutedPlay
              .then(() => {
                videoEl.muted = false;
              })
              .catch(() => {});
          } catch {
            // Ignore autoplay fallbacks if browser blocks everything.
          }
        });
      };

      attempt();
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
    // Avoid fighting the browser while it buffers or seeks; this is a common source of "stuck" playback in Firefox.
    if (videoA.readyState < 2 || videoB.readyState < 2) return;
    if (videoA.paused || videoB.paused) return;
    if (videoA.seeking || videoB.seeking) return;

    const master = driver === 'b' ? videoB : videoA;
    const follower = driver === 'b' ? videoA : videoB;
    if (isSuppressed(follower)) return;
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
            <button class="btn btn-primary" id="compareBtn" ${selected.length >= 2 ? '' : 'disabled'} type="button">Compare selected</button>
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
        selected = next;
        render();
      });
    });

    document.getElementById('compareBtn').addEventListener('click', async () => {
      if (selected.length < 2) return;
      setFootStatus('Creating experiment…');
      try {
        const requestId = crypto.randomUUID();
        const out = await apiPost(
          '/api/experiments',
          {
            name: selected.length === 2 ? 'A/B Compare' : `${selected.length} Video Fleet`,
            baselineRunId: selected[0],
            variants: selected.slice(1).map((runId, index) => ({
              label: String.fromCharCode(66 + index),
              runId,
            })),
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

async function renderReviewPage(runId, routeOptions = {}) {
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
            <video id="videoReview" class="video" controls loop playsinline preload="auto" src="/api/runs/${encodeURIComponent(runId)}/video"></video>
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
  const requireOverall = Boolean(routeOptions.requireOverall);
  let submitting = false;

  submitBtn.addEventListener('click', async () => {
    if (submitting) return;
    const ratings = gridApi.getRatings();
    if (requireOverall && typeof ratings.overall !== 'number') {
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
      if (oneShot) {
        scheduleWindowClose(900);
      }
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

async function renderComparePage(experimentId, routeOptions = {}) {
  setFootStatus('Loading experiment…');
  const exp = await apiGet(`/api/experiments/${encodeURIComponent(experimentId)}`);
  setFootStatus('Loading runs…');
  const baseline = await apiGet(`/api/runs/${encodeURIComponent(exp.baselineRunId)}`);
  const variants = Array.isArray(exp.variants) ? exp.variants : [];
  const variant = variants[0] || null;
  const variantRuns = await Promise.all(
    variants.map((v) => apiGet(`/api/runs/${encodeURIComponent(v.runId)}`))
  );
  setFootStatus('');

  const baselineCardHtml = runCardHtml({
    prefix: 'a',
    label: 'A (baseline)',
    runId: exp.baselineRunId,
    topic: baseline.topic || '',
    run: baseline,
    variantId: 'baseline',
    isVariant: false,
    index: 0,
  });

  const variantCards = variants.map((v, index) => ({
    variant: v,
    run: variantRuns[index],
    prefix: String.fromCharCode(98 + index),
    label: `${String.fromCharCode(65 + index + 1)} (${v.label})`,
    topic: (variantRuns[index] && variantRuns[index].topic) || '',
    index: index + 1,
  }));

  const variantCardsHtml = variantCards
    .map((entry) =>
      runCardHtml({
        prefix: entry.prefix,
        label: entry.label,
        runId: entry.variant.runId,
        topic: entry.topic,
        run: entry.run,
        variantId: entry.variant.variantId,
        isVariant: true,
        index: entry.index,
      })
    )
    .join('');

  const winnerChoicesHtml =
    `<label class="toggle"><input type="radio" name="winner" value="baseline" /> A (baseline) wins</label>` +
    variantCards
      .map((entry) => {
        const value = escapeHtml(entry.variant.variantId);
        const label = escapeHtml(entry.label);
        return `<label class="toggle"><input type="radio" name="winner" value="${value}" /> ${label} wins</label>`;
      })
      .join('');

  const firstVariantRunId = variant ? variant.runId : '';
  const firstVariantExists = variantCards.length > 0;
  const canSwipe = firstVariantExists;

  const blindDefault = Boolean(
    state.config && state.config.ui && state.config.ui.blindMetricsDefault
  );

  const oneShot =
    state.config &&
    state.config.task &&
    state.config.task.type === 'compare' &&
    state.config.task.experimentId === experimentId &&
    Number(state.config.exitAfterSubmit || 0) > 0;

  const routeRequireOverall = Boolean(routeOptions.requireOverall);
  const routeGoodBadMode = Boolean(routeOptions.goodBadMode);

  const done = exp.status === 'done';

  appEl.innerHTML = `
    <div class="card">
      <div class="card-inner">
        <div class="compare-head">
          <div>
            <h1 class="h1">Compare</h1>
            <div class="muted mono advanced-only">Experiment: <span class="mono">${escapeHtml(exp.experimentId)}</span></div>
            <div class="muted mono advanced-only">Hypothesis: ${escapeHtml(exp.hypothesis || '')}</div>
          </div>
          <div class="pill ${oneShot ? 'pill-warn' : ''}">${oneShot ? 'one-shot (auto-close)' : 'session'}</div>
        </div>

        <div class="sep"></div>

        <div class="row compare-strip" style="align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;">
          <div class="row" style="align-items: center; gap: 12px; flex-wrap: wrap;">
            <span class="muted mono" id="swipeHint">Swipe: ← or A (bad) / ↑ (tie) / → or B (good)</span>
            <label class="toggle">
              <input id="advancedMode" type="checkbox" />
              noisy mode
            </label>
            <label class="toggle advanced-only">
              <input id="autoplaySwipe" type="checkbox" checked />
              autoplay on swipe
            </label>
            <label class="toggle advanced-only">
              <input id="autoAdvanceSwipe" type="checkbox" checked />
              auto-advance
            </label>
            <label class="toggle advanced-only">
              <input id="singleVideoMode" type="checkbox" checked />
              one-card mode
            </label>
            <label class="toggle advanced-only">
              <input id="swipeMode" type="checkbox" checked />
              swipe mode
            </label>
            <label class="toggle advanced-only">
              <input id="goodBadMode" type="checkbox" ${routeGoodBadMode ? 'checked' : ''} />
              good / bad
            </label>
            <label class="toggle advanced-only">
              <input id="revealMetrics" type="checkbox" ${blindDefault ? '' : 'checked'} />
              reveal metrics (may bias)
            </label>
            <label class="toggle advanced-only">
              <input id="linkVideos" type="checkbox" ${canSwipe ? 'checked' : 'disabled'} />
              link playback
            </label>
            <label class="toggle advanced-only">audio
              <select class="select" id="audioSel" style="width: 120px;" ${canSwipe ? '' : 'disabled'}>
                <option value="a" selected>A</option>
                <option value="b">B</option>
                <option value="both">Both</option>
                <option value="mute">Mute</option>
              </select>
            </label>
            <label class="toggle advanced-only">speed
              <select class="select" id="speedSel" style="width: 110px;" ${canSwipe ? '' : 'disabled'}>
                <option value="0.75">0.75x</option>
                <option value="1" selected>1x</option>
                <option value="1.25">1.25x</option>
                <option value="1.5">1.5x</option>
              </select>
            </label>
            <button class="btn" id="playPause" type="button">Pause/Play</button>
            <button class="btn advanced-only" id="syncBtn" type="button">Sync</button>
          </div>
          <div class="pill mono">${done ? 'already submitted' : 'ready'}</div>
        </div>

        <div class="sep"></div>

        <div class="compare-layout">
          <div class="compare-grid-wrap">
            <div class="run-grid">
              ${baselineCardHtml}
              ${variantCardsHtml}
            </div>
          </div>
          <div class="compare-side">
            <h2 class="h2">Swipe Deck</h2>
            <div class="row deck-nav advanced-only" style="align-items: center; gap: 8px; margin-top: 8px; flex-wrap: wrap;">
              <button class="btn" id="deckPrev" type="button">Prev variant</button>
              <span class="muted mono" id="deckPosition"></span>
              <button class="btn" id="deckNext" type="button">Next variant</button>
            </div>
            <div class="sep"></div>
            <div class="swipe-row">
              <button class="btn swipe-btn" id="swipeLeft" type="button" ${done ? 'disabled' : ''}>Swipe Left (A)</button>
              <button class="btn swipe-btn" id="swipeTie" type="button" ${done ? 'disabled' : ''}>Swipe Equal</button>
              <button class="btn swipe-btn" id="swipeRight" type="button" ${done || !firstVariantRunId ? 'disabled' : ''}>Swipe Right (B)</button>
            </div>
            <div class="sep"></div>
            <div id="swipeReasonWrap" style="display: none;">
              <div class="swipe-note">
                <div class="muted mono" style="margin-top: 8px;">Feedback note (optional)</div>
                <textarea class="textarea" id="swipeReason" placeholder="What stood out in this choice?" style="min-height: 58px;"></textarea>
              </div>
            </div>
            <div class="row" id="activeReviewPanel" style="gap: 10px; flex-direction: column;">
              <div>
                <h2 class="h2" style="margin-bottom: 6px;">Feedback for active video</h2>
                <div class="muted mono" id="activeReviewTarget">Loading…</div>
              </div>
              <div class="sep"></div>
              <div class="row" style="align-items: center; gap: 8px; flex-wrap: wrap;">
                <span class="muted mono">Quick overall</span>
                <input class="select" id="activeQuickRange" style="width: 180px;" type="range" min="0" max="100" value="70" />
                <input class="input" id="activeQuickNum" style="width: 86px;" type="number" min="0" max="100" value="70" />
                <span class="muted mono" id="activeQuickValue">70</span>
              </div>
              <div class="sep"></div>
              <div id="activeDetailedPanel">
                <div class="muted mono" style="margin-top: 4px;">Detailed ratings</div>
                <div id="activeRatingGrid">
                  ${ratingGridHtml('active')}
                </div>
                <div class="muted mono" style="margin-top: 10px;">Notes</div>
                <textarea class="textarea" id="activeNotes" placeholder="What made this good or bad?"></textarea>
                <div class="muted mono" style="margin-top: 10px;">Tags (comma separated)</div>
                <input class="input" id="activeTags" placeholder="comma,separated" />
              </div>
            </div>
            <div class="row advanced-only" style="align-items: center; gap: 12px; flex-wrap: wrap; margin-top: 4px;">
              <span class="muted mono" id="deckPositionChip"></span>
              <div class="muted mono">Confidence</div>
              <input class="select advanced-only" id="swipeConfidence" style="width: 150px;" type="range" min="0" max="100" value="70" />
              <span class="muted mono advanced-only" id="swipeConfidenceLabel">70</span>
            </div>

            <div class="sep"></div>
            <div class="row" style="align-items: center; justify-content: space-between; flex-wrap: wrap;">
              <label class="toggle advanced-only">
                <input id="quickRateMode" type="checkbox" />
                quick rating mode
              </label>
              <label class="toggle advanced-only">
                <input id="requireOverall" type="checkbox" ${routeRequireOverall ? 'checked' : ''} />
                require overall
              </label>
            </div>
            <div class="advanced-only" style="display: none; margin-top: 8px;">
              <h2 class="h2">Detailed Controls</h2>
              <div class="sep"></div>
              <div class="row" style="align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 6px;">
                ${winnerChoicesHtml}
                <label class="toggle"><input type="radio" name="winner" value="" /> No winner</label>
              </div>
              <div class="muted mono" style="margin-top: 8px;">Reason (optional)</div>
              <textarea class="textarea" id="reason" placeholder="What made it better?"></textarea>
              <div class="sep"></div>
              <div class="muted mono">Agent-authored targeted questions</div>
              <div id="questions" style="margin-top: 10px;"></div>
              <div class="sep"></div>
              <div class="row" style="gap: 8px; align-items: center; flex-wrap: wrap;">
                <div class="muted mono">Copy ratings</div>
                <div>
                  <button class="btn" id="copyAtoB" type="button">Copy A to B</button>
                  <button class="btn" id="copyBtoA" type="button">Copy B to A</button>
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
      </div>
    </div>
  `;

  const revealEl = document.getElementById('revealMetrics');
  const metricEls = Array.from(document.querySelectorAll('.run-metrics'));
  const applyReveal = () => {
    const on = Boolean(revealEl.checked);
    metricEls.forEach((el) => {
      el.style.display = on ? 'flex' : 'none';
    });
  };
  if (blindDefault) revealEl.checked = false;
  applyReveal();
  revealEl.addEventListener('change', applyReveal);

  const requireOverallEl = document.getElementById('requireOverall');
  const goodBadModeEl = document.getElementById('goodBadMode');
  const swipeHintEl = document.getElementById('swipeHint');

  const advancedModeEl = document.getElementById('advancedMode');
  const advancedEls = Array.from(document.querySelectorAll('.advanced-only'));
  const singleVideoModeEl = document.getElementById('singleVideoMode');
  const linkVideosEl = document.getElementById('linkVideos');
  const autoAdvanceSwipeEl = document.getElementById('autoAdvanceSwipe');
  const autoplayOnSwipeEl = document.getElementById('autoplaySwipe');

  const applyAdvancedMode = () => {
    const on = Boolean(advancedModeEl && advancedModeEl.checked);
    advancedEls.forEach((el) => {
      el.style.display = on ? '' : 'none';
    });

    if (!on) {
      if (singleVideoModeEl) singleVideoModeEl.checked = true;
      if (autoAdvanceSwipeEl) autoAdvanceSwipeEl.checked = true;
      if (autoplayOnSwipeEl) autoplayOnSwipeEl.checked = true;
      if (linkVideosEl) linkVideosEl.checked = false;
    }
  };

  const runStates = Array.from(appEl.querySelectorAll('.run-card')).map((card) => {
    const index = Number(card.getAttribute('data-run-index'));
    const prefix = String(card.getAttribute('data-run-prefix') || '');
    const upperPrefix = prefix.toUpperCase();
    const runId = String(card.getAttribute('data-run-id') || '');
    const variantId = String(card.getAttribute('data-run-variant-id') || '');
    const label = String(card.getAttribute('data-run-label') || prefix);
    const safePrefix = CSS.escape(prefix);
    const quickRange = card.querySelector(
      `.quick-range[data-prefix="${safePrefix}"][data-field="overall"]`
    );
    const quickNum = card.querySelector(
      `.quick-num[data-prefix="${safePrefix}"][data-field="overall"]`
    );
    const quickNote = card.querySelector('.quick-note[data-field="note"]');
    const quickValueEl = card.querySelector('.quick-rate-value[data-field="overall"]');
    return {
      cardEl: card,
      index: Number.isFinite(index) ? index : 0,
      prefix,
      upperPrefix,
      runId,
      variantId,
      label,
      notesEl: card.querySelector('.notes-field'),
      tagsEl: card.querySelector('.tags-field'),
      quickRangeEl: quickRange,
      quickNumEl: quickNum,
      quickNoteEl: quickNote,
      quickValueEl,
      metricsEl: card.querySelector('.run-metrics'),
      gridApi: bindRatingGrid(card),
      videoEl: document.getElementById(`video${upperPrefix}`),
      videoStatusEl: document.getElementById(`status${upperPrefix}`),
    };
  });

  const runByPrefix = Object.fromEntries(runStates.map((state) => [state.prefix, state]));
  const clampRating = (value) => Math.max(0, Math.min(100, Math.round(Number(value))));

  const activeReviewTargetEl = document.getElementById('activeReviewTarget');
  const activeQuickRangeEl = document.getElementById('activeQuickRange');
  const activeQuickNumEl = document.getElementById('activeQuickNum');
  const activeQuickValueEl = document.getElementById('activeQuickValue');
  const activeNotesEl = document.getElementById('activeNotes');
  const activeTagsEl = document.getElementById('activeTags');
  const activeRatingGridEl = document.getElementById('activeRatingGrid');
  const activeRatingGridApi = activeRatingGridEl ? bindRatingGrid(activeRatingGridEl) : null;

  const getReviewTargetState = () => {
    if (singleVideoModeEl && singleVideoModeEl.checked && variantStates.length) {
      return getActiveVariantState() || variantStates[0] || baselineState || null;
    }
    return baselineState || runStates[0] || null;
  };

  const getActiveQuickValue = (state) => {
    if (!state) return 70;
    if (state.quickNumEl) {
      const raw = Number.parseInt(String(state.quickNumEl.value || '').trim(), 10);
      if (Number.isFinite(raw)) return clampRating(raw);
    }
    if (state.quickRangeEl) {
      const raw = Number.parseInt(String(state.quickRangeEl.value || '').trim(), 10);
      if (Number.isFinite(raw)) return clampRating(raw);
    }
    return 70;
  };

  const writeActiveReviewToState = (state) => {
    if (!state) return;
    const quickValue = getActiveQuickValueFromPanel();
    if (state.quickRangeEl) state.quickRangeEl.value = String(quickValue);
    if (state.quickNumEl) state.quickNumEl.value = String(quickValue);
    if (state.quickValueEl) state.quickValueEl.textContent = `${quickValue}/100`;
    if (state.gridApi && activeRatingGridApi) {
      state.gridApi.setRatings(activeRatingGridApi.getRatings());
    }
    if (state.notesEl)
      state.notesEl.value = String(activeNotesEl && activeNotesEl.value ? activeNotesEl.value : '');
    if (state.tagsEl)
      state.tagsEl.value = String(activeTagsEl && activeTagsEl.value ? activeTagsEl.value : '');
  };

  const populateActiveReviewFromState = (state) => {
    const safeState = state || getReviewTargetState();
    if (!safeState) {
      if (activeReviewTargetEl) activeReviewTargetEl.textContent = 'No active video';
      if (activeQuickRangeEl) activeQuickRangeEl.value = '70';
      if (activeQuickNumEl) activeQuickNumEl.value = '70';
      if (activeQuickValueEl) activeQuickValueEl.textContent = '70';
      if (activeNotesEl) activeNotesEl.value = '';
      if (activeTagsEl) activeTagsEl.value = '';
      if (activeRatingGridApi) activeRatingGridApi.setRatings({});
      return;
    }

    if (activeReviewTargetEl) {
      activeReviewTargetEl.textContent = `Reviewing ${safeState.label || safeState.prefix.toUpperCase()}`;
    }

    const quickValue = getActiveQuickValue(safeState);
    if (activeQuickRangeEl) activeQuickRangeEl.value = String(quickValue);
    if (activeQuickNumEl) activeQuickNumEl.value = String(quickValue);
    if (activeQuickValueEl) activeQuickValueEl.textContent = `${quickValue}/100`;
    if (activeNotesEl) {
      activeNotesEl.value = safeState.notesEl ? String(safeState.notesEl.value || '') : '';
    }
    if (activeTagsEl) {
      const rawTags = safeState.tagsEl ? String(safeState.tagsEl.value || '') : '';
      activeTagsEl.value = rawTags;
    }
    if (activeRatingGridApi && safeState.gridApi) {
      activeRatingGridApi.setRatings(safeState.gridApi.getRatings());
    }
  };

  const syncActiveReviewFromPanel = () => {
    const state = getReviewTargetState();
    writeActiveReviewToState(state);
  };

  const getActiveQuickValueFromPanel = () => {
    if (activeQuickNumEl) {
      const direct = Number.parseInt(String(activeQuickNumEl.value || '').trim(), 10);
      if (Number.isFinite(direct)) return clampRating(direct);
    }
    if (activeQuickRangeEl) {
      const direct = Number.parseInt(String(activeQuickRangeEl.value || '').trim(), 10);
      if (Number.isFinite(direct)) return clampRating(direct);
    }
    return 70;
  };

  const setActiveQuickFromPanel = () => {
    const value = getActiveQuickValueFromPanel();
    if (activeQuickRangeEl) activeQuickRangeEl.value = String(value);
    if (activeQuickNumEl) activeQuickNumEl.value = String(value);
    if (activeQuickValueEl) activeQuickValueEl.textContent = `${value}/100`;
  };

  const syncQuick = (state, value) => {
    if (!state) return;
    const clamped = clampRating(value);
    if (state.quickRangeEl) state.quickRangeEl.value = String(clamped);
    if (state.quickNumEl) state.quickNumEl.value = String(clamped);
    if (state.quickValueEl) state.quickValueEl.textContent = `${clamped}/100`;
  };

  const readQuickOverall = (state) => {
    if (!state) return undefined;
    if (state.quickNumEl) {
      const raw = Number.parseInt(String(state.quickNumEl.value || '').trim(), 10);
      if (Number.isFinite(raw)) return clampRating(raw);
    }
    if (state.quickRangeEl) {
      const rangeValue = Number.parseInt(String(state.quickRangeEl.value || '').trim(), 10);
      if (Number.isFinite(rangeValue)) return clampRating(rangeValue);
    }
    return undefined;
  };

  const readQuickNote = (state) => {
    if (!state || !state.quickNoteEl) return '';
    return String(state.quickNoteEl.value || '').trim();
  };

  runStates.forEach((state) => {
    if (!state.quickRangeEl || !state.quickNumEl) return;
    [state.quickRangeEl, state.quickNumEl].forEach((el) => {
      el.addEventListener('input', () => {
        const next = readQuickOverall(state);
        if (typeof next === 'number') syncQuick(state, next);
      });
    });
  });

  const applyQuickDefaults = () => {
    runStates.forEach((state) => {
      syncQuick(state, 70);
    });
  };

  runStates.forEach((state) => {
    if (state.videoEl) {
      state.videoEl.loop = true;
      state.videoEl.playsInline = true;
    }
    if (state.videoEl && state.videoStatusEl) {
      bindVideoDiagnostics({
        videoEl: state.videoEl,
        statusEl: state.videoStatusEl,
        label: state.prefix.toUpperCase(),
      });
    }
  });

  const swipeModeEl = document.getElementById('swipeMode');
  const swipeLeftBtn = document.getElementById('swipeLeft');
  const swipeTieBtn = document.getElementById('swipeTie');
  const swipeRightBtn = document.getElementById('swipeRight');
  const swipeReasonEl = document.getElementById('swipeReason');
  const swipeReasonWrapEl = document.getElementById('swipeReasonWrap');
  const swipeConfidenceEl = document.getElementById('swipeConfidence');
  const swipeConfidenceLabelEl = document.getElementById('swipeConfidenceLabel');
  const questionsEl = document.getElementById('questions');
  const winnerInputs = Array.from(document.querySelectorAll('input[name="winner"]'));
  const quickRateModeEl = document.getElementById('quickRateMode');
  const deckPositionChipEl = document.getElementById('deckPositionChip');
  const audioSelEl = document.getElementById('audioSel');

  const deckPrevBtn = document.getElementById('deckPrev');
  const deckNextBtn = document.getElementById('deckNext');
  const deckPositionEl = document.getElementById('deckPosition');

  const baselineState = runStates[0] || null;
  const variantStates = runStates.slice(1);
  const pendingPlayByVideo = new WeakMap();

  const safePlay = (videoEl) => {
    try {
      if (!(videoEl instanceof HTMLVideoElement)) return;
      const run = () => {
        const attempt = () => {
          const p = videoEl.play();
          if (!p || typeof p.catch !== 'function') return;

          p.catch(() => {
            if (videoEl.muted) return;
            try {
              videoEl.muted = true;
              const mutedPlay = videoEl.play();
              if (!mutedPlay || typeof mutedPlay.then !== 'function') return;
              mutedPlay
                .then(() => {
                  videoEl.muted = false;
                })
                .catch(() => {});
            } catch {
              // Ignore autoplay fallbacks if browser blocks everything.
            }
          });
        };

        attempt();
      };

      if (videoEl.readyState >= 2 || videoEl.readyState === 4) {
        run();
        return;
      }

      const existing = pendingPlayByVideo.get(videoEl);
      if (existing) {
        try {
          videoEl.removeEventListener('loadeddata', existing);
        } catch {
          // best effort
        }
      }

      const onLoaded = () => {
        pendingPlayByVideo.delete(videoEl);
        run();
      };

      pendingPlayByVideo.set(videoEl, onLoaded);
      videoEl.addEventListener('loadeddata', onLoaded, { once: true });
      return;
    } catch {
      return;
    }
  };

  const safePause = (videoEl) => {
    try {
      videoEl.pause();
    } catch {
      return;
    }
  };

  const pauseAllVideos = (opts = {}) => {
    runStates.forEach((state) => {
      if (!state.videoEl) return;
      if (opts.preserve === state.videoEl) return;
      safePause(state.videoEl);
    });
  };

  const setSingleVideoMode = () => Boolean(singleVideoModeEl && singleVideoModeEl.checked);
  const clampVariantIndex = (value) => {
    if (!variantStates.length) return 0;
    const max = variantStates.length - 1;
    return Math.max(0, Math.min(max, value));
  };

  let activeVariantIndex = clampVariantIndex(0);
  const getActiveVariantState = () =>
    variantStates.length ? variantStates[clampVariantIndex(activeVariantIndex)] : null;

  const setAudioForActiveCard = () => {
    const oneCardMode = setSingleVideoMode() && variantStates.length > 0;
    if (!oneCardMode) return;

    const active = getActiveVariantState();
    runStates.forEach((state) => {
      if (!state.videoEl) return;
      state.videoEl.muted = state !== active;
    });

    if (!audioSelEl) return;
    if (audioSelEl.value !== 'b') {
      audioSelEl.value = 'b';
      audioSelEl.dispatchEvent(new Event('change'));
    }
  };

  const applyDeckLayout = () => {
    const oneCardMode = setSingleVideoMode();
    const active = getActiveVariantState();
    const showAll = !oneCardMode || !active;
    runStates.forEach((state) => {
      if (!state.cardEl) return;
      const isActive = showAll || state === active || !variantStates.length;
      state.cardEl.classList.toggle('run-card-hidden', !isActive);
    });
  };

  const updateDeckStatus = () => {
    if (!deckPositionEl) return;
    const active = getActiveVariantState();
    const total = variantStates.length;
    const oneCardMode = setSingleVideoMode();
    if (!oneCardMode || !active) {
      deckPositionEl.textContent = `Reviewing all (${total + (baselineState ? 1 : 0)} video cards)`;
      if (deckPositionChipEl)
        deckPositionChipEl.textContent = `cards: ${total + (baselineState ? 1 : 0)}`;
      return;
    }
    const activeLabel =
      String(active.label || active.prefix || '')
        .split('(')[0]
        .trim() || String(active.label || '');
    deckPositionEl.textContent = `Reviewing ${activeLabel} (${active.index}/${total})`;
    if (deckPositionChipEl) deckPositionChipEl.textContent = `#${active.index}/${total}`;
  };

  const setActiveVariantIndex = (next, opts = {}) => {
    const prevTarget = getReviewTargetState();
    syncActiveReviewFromPanel();
    const wasTarget = prevTarget;
    if (!variantStates.length) {
      activeVariantIndex = 0;
      syncSwipeToRadios();
      applyDeckLayout();
      updateDeckStatus();
      populateActiveReviewFromState(wasTarget);
      return;
    }
    const clamped = clampVariantIndex(next);
    activeVariantIndex = clamped;
    const nextState = getActiveVariantState();
    const preserve = nextState?.videoEl || null;
    if (singleVideoModeEl && singleVideoModeEl.checked) {
      pauseAllVideos({ preserve });
    }
    if (opts.autoPlay && shouldAutoplaySwipe() && nextState && nextState.videoEl) {
      safePlay(nextState.videoEl);
    }
    setAudioForActiveCard();
    syncSwipeToRadios();
    if (singleVideoModeEl && singleVideoModeEl.checked) {
      applyDeckLayout();
      updateDeckStatus();
    }
    populateActiveReviewFromState(nextState);
    if (!opts.silent && opts.autoFocusActive && getActiveVariantState()?.cardEl) {
      getActiveVariantState()?.cardEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  };

  const updateDeckControls = () => {
    const hasVariants = variantStates.length > 0;
    const single = setSingleVideoMode();
    if (deckPrevBtn) {
      deckPrevBtn.disabled = !hasVariants || !single || activeVariantIndex <= 0;
      deckPrevBtn.textContent = hasVariants ? 'Prev variant' : 'Prev variant';
    }
    if (deckNextBtn) {
      deckNextBtn.disabled =
        !hasVariants || !single || activeVariantIndex >= variantStates.length - 1;
      deckNextBtn.textContent = hasVariants ? 'Next variant' : 'Next variant';
    }
    if (deckPrevBtn) deckPrevBtn.classList.toggle('btn-primary', !deckPrevBtn.disabled);
    if (deckNextBtn) deckNextBtn.classList.toggle('btn-primary', !deckNextBtn.disabled);
  };

  const runIdByVariant = (state) => state && state.runId;
  const swipeChoiceByRunId = new Map();
  let swipeMode = false;
  let swipeConfidence = 70;
  const shouldAutoplaySwipe = () => !autoplayOnSwipeEl || Boolean(autoplayOnSwipeEl.checked);
  const isGoodBadMode = () => Boolean(goodBadModeEl && goodBadModeEl.checked);
  const isRequireOverall = () => Boolean(requireOverallEl && requireOverallEl.checked);

  if (autoAdvanceSwipeEl) {
    autoAdvanceSwipeEl.addEventListener('change', () => {
      if (singleVideoModeEl && singleVideoModeEl.checked) {
        updateDeckControls();
      }
    });
  }

  const setSwipeChoice = (choice) => {
    const normalizedChoice = isGoodBadMode() && choice === 'tie' ? '' : choice;
    const active = getActiveVariantState();
    if (!active || !active.runId) {
      return;
    }
    swipeChoiceByRunId.set(active.runId, normalizedChoice);

    if (normalizedChoice === 'baseline') {
      syncQuick(baselineState, 80);
      syncQuick(active, 20);
    } else if (normalizedChoice === 'variant') {
      syncQuick(active, 80);
      syncQuick(baselineState, 20);
    } else if (normalizedChoice === 'tie') {
      syncQuick(active, 50);
      syncQuick(baselineState, 50);
    }

    if (swipeLeftBtn) swipeLeftBtn.classList.remove('selected');
    if (swipeTieBtn) swipeTieBtn.classList.remove('selected');
    if (swipeRightBtn) swipeRightBtn.classList.remove('selected');

    if (normalizedChoice === 'baseline' && swipeLeftBtn) swipeLeftBtn.classList.add('selected');
    if (normalizedChoice === 'tie' && swipeTieBtn) swipeTieBtn.classList.add('selected');
    if (normalizedChoice === 'variant' && swipeRightBtn) swipeRightBtn.classList.add('selected');

    if (shouldAutoplaySwipe()) {
      if (normalizedChoice === 'baseline' && baselineState && baselineState.videoEl) {
        runStates.forEach((state) => {
          if (state.videoEl && state.videoEl !== baselineState.videoEl) safePause(state.videoEl);
        });
        safePlay(baselineState.videoEl);
      } else if (normalizedChoice === 'variant' && active.videoEl) {
        runStates.forEach((state) => {
          if (state.videoEl && state.videoEl !== active.videoEl) safePause(state.videoEl);
        });
        safePlay(active.videoEl);
      } else if (
        normalizedChoice === 'tie' &&
        active.videoEl &&
        baselineState &&
        baselineState.videoEl
      ) {
        safePlay(active.videoEl);
        safePlay(baselineState.videoEl);
      }
    }

    if (autoAdvanceSwipeEl && autoAdvanceSwipeEl.checked && variantStates.length) {
      if (activeVariantIndex < variantStates.length - 1) {
        setActiveVariantIndex(activeVariantIndex + 1, { silent: false, autoPlay: true });
        return;
      }
    }
    syncSwipeToRadios();
  };

  const syncSwipeToRadios = () => {
    if (!swipeMode) return;
    const allowTie = !isGoodBadMode();
    const active = getActiveVariantState();
    const activeChoice = active ? swipeChoiceByRunId.get(runIdByVariant(active)) || '' : '';
    const variantInput = active
      ? winnerInputs.find((el) => String(el.value || '') === active.variantId)
      : null;

    const baseline = winnerInputs.find((el) => String(el.value || '') === 'baseline');
    const tie = winnerInputs.find((el) => String(el.value || '') === '');

    if (swipeLeftBtn) swipeLeftBtn.classList.remove('selected');
    if (swipeTieBtn) swipeTieBtn.classList.remove('selected');
    if (swipeRightBtn) swipeRightBtn.classList.remove('selected');

    if (activeChoice === 'baseline' && baseline) baseline.checked = true;
    if (allowTie && activeChoice === 'tie' && tie) tie.checked = true;
    if (activeChoice === 'variant' && variantInput) variantInput.checked = true;

    if (activeChoice === 'baseline' && swipeLeftBtn) swipeLeftBtn.classList.add('selected');
    if (activeChoice === 'tie' && swipeTieBtn) swipeTieBtn.classList.add('selected');
    if (activeChoice === 'variant' && swipeRightBtn) swipeRightBtn.classList.add('selected');

    winnerInputs.forEach((input) => {
      input.disabled = false;
    });
  };

  const setWinnerFromRadio = () => {
    if (!swipeMode) return;
    const active = getActiveVariantState();
    const value = winnerInputs.find((el) => el.checked);
    if (!active || !value) {
      if (active) setSwipeChoice('');
      return;
    }
    const selected = String(value.value || '');
    if (!selected) setSwipeChoice('tie');
    else if (selected === 'baseline') setSwipeChoice('baseline');
    else if (selected === active.variantId) setSwipeChoice('variant');
  };

  const updateSwipeMode = () => {
    if (!swipeModeEl) return;
    swipeMode = Boolean(swipeModeEl.checked);
    updateDeckControls();
    const goodBad = isGoodBadMode();

    if (swipeHintEl) {
      swipeHintEl.textContent = goodBad
        ? 'Swipe: ← A (bad) / → B (good)'
        : 'Swipe: ← A / ↑ tie / → B';
    }

    if (swipeLeftBtn) {
      swipeLeftBtn.textContent = goodBad ? 'Swipe Left (A)' : 'Swipe Left (A)';
    }
    if (swipeRightBtn) {
      swipeRightBtn.textContent = goodBad ? 'Swipe Right (B)' : 'Swipe Right (B)';
    }
    if (swipeTieBtn) {
      swipeTieBtn.style.display = goodBad ? 'none' : '';
    }

    if (swipeReasonWrapEl) {
      swipeReasonWrapEl.style.display = swipeMode ? 'block' : 'none';
    }
    if (!swipeMode) {
      setSwipeChoice('');
      swipeChoiceByRunId.clear();
      winnerInputs.forEach((el) => {
        el.checked = false;
        el.disabled = false;
      });
      return;
    }

    winnerInputs.forEach((input) => {
      const value = String(input.value || '');
      if (goodBad && !value) {
        input.disabled = true;
      } else {
        input.disabled = false;
      }
    });

    syncSwipeToRadios();
  };

  const ensureSwipeChoice = () => {
    if (!swipeMode) return;
    const active = getActiveVariantState();
    if (!active) return;
    if (swipeChoiceByRunId.has(active.runId)) {
      return;
    }
    if (isGoodBadMode()) setSwipeChoice('');
    else setSwipeChoice('tie');
  };

  if (singleVideoModeEl) {
    singleVideoModeEl.addEventListener('change', () => {
      applyDeckLayout();
      updateDeckStatus();
      updateDeckControls();
      setAudioForActiveCard();
      if (!setSingleVideoMode()) {
        winnerInputs.forEach((el) => {
          el.checked = false;
        });
      }
      ensureSwipeChoice();
      populateActiveReviewFromState(getReviewTargetState());
    });
  }

  const propagateActiveReviewPanel = () => {
    setActiveQuickFromPanel();
    syncActiveReviewFromPanel();
  };

  if (activeQuickRangeEl) {
    activeQuickRangeEl.addEventListener('input', propagateActiveReviewPanel);
  }
  if (activeQuickNumEl) {
    activeQuickNumEl.addEventListener('input', propagateActiveReviewPanel);
  }
  if (activeNotesEl) {
    activeNotesEl.addEventListener('input', syncActiveReviewFromPanel);
  }
  if (activeTagsEl) {
    activeTagsEl.addEventListener('input', syncActiveReviewFromPanel);
  }
  if (activeRatingGridEl) {
    activeRatingGridEl.addEventListener('input', syncActiveReviewFromPanel);
    activeRatingGridEl.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.classList.contains('clear')) {
        syncActiveReviewFromPanel();
      }
    });
  }

  if (deckPrevBtn) {
    deckPrevBtn.addEventListener('click', () => {
      setActiveVariantIndex(activeVariantIndex - 1, { silent: true, autoFocusActive: true });
      ensureSwipeChoice();
      updateDeckControls();
    });
  }

  if (deckNextBtn) {
    deckNextBtn.addEventListener('click', () => {
      setActiveVariantIndex(activeVariantIndex + 1, { silent: true, autoFocusActive: true });
      ensureSwipeChoice();
      updateDeckControls();
    });
  }

  if (swipeModeEl) {
    swipeModeEl.addEventListener('change', updateSwipeMode);
  }
  if (goodBadModeEl) {
    goodBadModeEl.addEventListener('change', () => {
      updateSwipeMode();
      ensureSwipeChoice();
    });
  }
  if (swipeLeftBtn) {
    swipeLeftBtn.addEventListener('click', () => {
      if (!swipeMode || !getActiveVariantState()) return;
      setSwipeChoice('baseline');
    });
  }
  if (swipeTieBtn) {
    swipeTieBtn.addEventListener('click', () => {
      if (!swipeMode || !getActiveVariantState()) return;
      if (isGoodBadMode()) return;
      setSwipeChoice('tie');
    });
  }
  if (swipeRightBtn) {
    swipeRightBtn.addEventListener('click', () => {
      if (!swipeMode || !getActiveVariantState()) return;
      setSwipeChoice('variant');
    });
  }
  winnerInputs.forEach((input) => {
    input.addEventListener('change', setWinnerFromRadio);
  });

  if (swipeConfidenceEl) {
    swipeConfidenceEl.addEventListener('input', () => {
      const value = Number(swipeConfidenceEl.value);
      if (Number.isFinite(value)) {
        swipeConfidence = value;
        if (swipeConfidenceLabelEl) swipeConfidenceLabelEl.textContent = String(value);
      }
    });
  }

  const isInputTarget = (target) => {
    if (!(target instanceof Element)) return false;
    const tag = target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (target.isContentEditable) return true;
    return false;
  };

  const triggerLeft = () => {
    if (!swipeMode || done || !getActiveVariantState()) return;
    setSwipeChoice('baseline');
  };
  const triggerTie = () => {
    if (!swipeMode || done || !getActiveVariantState()) return;
    if (isGoodBadMode()) return;
    setSwipeChoice('tie');
  };
  const triggerRight = () => {
    if (!swipeMode || done || !getActiveVariantState()) return;
    setSwipeChoice('variant');
  };

  const keyboardHandler = (event) => {
    if (done || isInputTarget(event.target)) return;
    if (event.key === 'a' || event.key === 'A' || event.key === 'ArrowLeft') {
      triggerLeft();
      event.preventDefault();
      return;
    }
    if (event.key === 'b' || event.key === 'B' || event.key === 'ArrowRight') {
      triggerRight();
      event.preventDefault();
      return;
    }
    if (event.key === 'ArrowUp' || event.key === ' ') {
      triggerTie();
      event.preventDefault();
      return;
    }
    if (event.key === 'Enter') {
      const submit = document.getElementById('submitCompare');
      if (submit && !submit.disabled) {
        submit.click();
        event.preventDefault();
      }
      return;
    }
    if (event.key === 'n' || event.key === 'ArrowDown') {
      if (!singleVideoModeEl || !singleVideoModeEl.checked) return;
      setActiveVariantIndex(activeVariantIndex + 1, { silent: true });
      ensureSwipeChoice();
      updateDeckControls();
      event.preventDefault();
      return;
    }
    if (event.key === 'p') {
      if (!singleVideoModeEl || !singleVideoModeEl.checked) return;
      setActiveVariantIndex(activeVariantIndex - 1, { silent: true });
      ensureSwipeChoice();
      updateDeckControls();
      event.preventDefault();
      return;
    }
  };

  if (document) {
    document.addEventListener('keydown', keyboardHandler);
  }

  if (questionsEl) {
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
  }

  const getAnswers = () => {
    const answers = {};
    if (!questionsEl) return answers;
    questionsEl.querySelectorAll('[data-q]').forEach((el) => {
      const id = el.getAttribute('data-q');
      const val = String(el.value || '').trim();
      if (!id || !val) return;
      answers[id] = val;
    });
    return answers;
  };

  const readPerRunPayload = () => {
    const missing = [];
    const perRun = runStates.map((state) => {
      const ratings = state.gridApi ? state.gridApi.getRatings() : {};
      if (quickRateModeEl && quickRateModeEl.checked) {
        const quickOverall = readQuickOverall(state);
        if (typeof quickOverall === 'number') ratings.overall = quickOverall;
      }
      if (isRequireOverall() && typeof ratings.overall !== 'number') {
        missing.push(state.label);
      }

      const detailNote = state.notesEl ? String(state.notesEl.value || '').trim() : '';
      const note =
        detailNote || (quickRateModeEl && quickRateModeEl.checked ? readQuickNote(state) : '');
      const rawTags = state.tagsEl ? parseTags(state.tagsEl.value) : [];
      return {
        runId: state.runId,
        variantId: state.variantId,
        ratings,
        notes: note || undefined,
        tags: rawTags.length ? rawTags : undefined,
      };
    });

    return { perRun, missing };
  };

  const resolveSwipeOverallForRole = (choice, role) => {
    const normalized = String(choice || '').trim();
    if (normalized === 'baseline') return role === 'baseline' ? 80 : 20;
    if (normalized === 'variant') return role === 'baseline' ? 20 : 80;
    if (normalized === 'tie' && !isGoodBadMode()) return 50;
    return undefined;
  };

  const getRunLabelByRunId = (runId) => {
    const match = runStates.find((entry) => entry.runId === runId);
    return match ? match.label : String(runId || '');
  };

  const applySwipeImpliedRatings = (perRunById) => {
    if (!baselineState || quickRateModeEl?.checked) return;
    let baselineTotal = 0;
    let baselineCount = 0;

    variantStates.forEach((state) => {
      const choice = state.runId ? swipeChoiceByRunId.get(state.runId) : '';
      if (!state.runId || !choice) return;
      const baselineScore = resolveSwipeOverallForRole(choice, 'baseline');
      const variantScore = resolveSwipeOverallForRole(choice, 'variant');

      const variantEntry = perRunById.get(state.runId);
      if (typeof variantScore === 'number' && variantEntry) {
        variantEntry.ratings = {
          ...variantEntry.ratings,
          overall: variantScore,
        };
      }

      if (typeof baselineScore === 'number') {
        baselineTotal += baselineScore;
        baselineCount += 1;
      }
    });

    const baselineEntry = perRunById.get(baselineState.runId);
    if (baselineEntry && baselineCount > 0) {
      baselineEntry.ratings = {
        ...baselineEntry.ratings,
        overall: Math.round(baselineTotal / baselineCount),
      };
    }
  };

  const missingOverallLabels = (perRun) =>
    perRun
      .filter((entry) => {
        const hasOverall = entry && entry.ratings && typeof entry.ratings.overall === 'number';
        return !hasOverall;
      })
      .map((entry) => getRunLabelByRunId(entry.runId))
      .filter(Boolean);

  const copyAtoB = document.getElementById('copyAtoB');
  const copyBtoA = document.getElementById('copyBtoA');
  if (copyAtoB && runByPrefix.a && runByPrefix.b) {
    copyAtoB.addEventListener('click', () => {
      const aState = runByPrefix.a;
      const bState = runByPrefix.b;
      if (!aState.gridApi || !bState.gridApi) return;
      bState.gridApi.setRatings(aState.gridApi.getRatings());
    });
  }
  if (copyBtoA && runByPrefix.a && runByPrefix.b) {
    copyBtoA.addEventListener('click', () => {
      const aState = runByPrefix.a;
      const bState = runByPrefix.b;
      if (!aState.gridApi || !bState.gridApi) return;
      aState.gridApi.setRatings(bState.gridApi.getRatings());
    });
  }

  const cleanupFns = [];
  if (baselineState && variantStates[0] && variantStates[0].videoEl && baselineState.videoEl) {
    const cleanup = setupLinkedVideoControls({
      videoA: baselineState.videoEl,
      videoB: variantStates[0].videoEl,
      linkEl: document.getElementById('linkVideos'),
      speedEl: document.getElementById('speedSel'),
      audioEl: document.getElementById('audioSel'),
      toggleEl: document.getElementById('playPause'),
      syncEl: document.getElementById('syncBtn'),
    });
    if (typeof cleanup === 'function') {
      cleanupFns.push(cleanup);
    }
  }
  cleanupFns.push(() => {
    document.removeEventListener('keydown', keyboardHandler);
  });
  state.cleanup = () => {
    cleanupFns.forEach((fn) => {
      try {
        fn();
      } catch {
        // Defensive cleanup: avoid masking page-level failures with teardown issues.
      }
    });
  };

  const submitCompareBtn = document.getElementById('submitCompare');
  const submitCompareMsgEl = document.getElementById('submitMsg');
  let submittingCompare = false;

  if (advancedModeEl) {
    advancedModeEl.addEventListener('change', applyAdvancedMode);
  }
  applyAdvancedMode();
  applyDeckLayout();
  updateDeckStatus();
  updateDeckControls();
  updateSwipeMode();
  applyQuickDefaults();
  populateActiveReviewFromState(getReviewTargetState());
  setActiveVariantIndex(0, { silent: true, autoPlay: true });

  submitCompareBtn.addEventListener('click', async () => {
    if (submittingCompare) return;
    if (!runStates.length) return;
    syncActiveReviewFromPanel();
    const { perRun, missing } = readPerRunPayload();
    const isNoisy = Boolean(advancedModeEl && advancedModeEl.checked);
    const isRequire = isRequireOverall();

    const winner = document.querySelector('input[name="winner"]:checked');
    const winnerVariantId = winner ? String(winner.value || '') : '';

    if (swipeMode) {
      const activeState = getActiveVariantState();
      let activeSwipeChoice =
        activeState && swipeChoiceByRunId.get(activeState.runId)
          ? swipeChoiceByRunId.get(activeState.runId)
          : '';
      if (!activeSwipeChoice && !winnerVariantId) {
        const fallbackChoice = isGoodBadMode() ? '' : 'tie';
        setSwipeChoice(fallbackChoice);
        activeSwipeChoice = fallbackChoice;
      }

      const perRunById = new Map(perRun.map((item) => [item.runId, item]));
      applySwipeImpliedRatings(perRunById);

      const requireMissing = missingOverallLabels(perRun);
      if (isRequire && requireMissing.length) {
        submitCompareMsgEl.innerHTML = `<div class="error">overall is required for ${escapeHtml(
          requireMissing.join(', ')
        )}</div>`;
        return;
      }

      const swipeReason = String(swipeReasonEl.value || '').trim();
      if (activeSwipeChoice && activeState) {
        const baselineEntry = baselineState ? perRunById.get(baselineState.runId) : null;
        const activeEntry = perRunById.get(activeState.runId);
        const targetEntry = activeSwipeChoice === 'baseline' ? baselineEntry : activeEntry;
        if (targetEntry && !targetEntry.notes && swipeReason) targetEntry.notes = swipeReason;
      }

      const swipeAnswers = {
        ...getAnswers(),
        mode: 'swipe',
        confidence: Number.isFinite(swipeConfidence) ? swipeConfidence : 70,
        activeVariantId: activeState?.runId || null,
      };

      const body = {
        winnerVariantId: winnerVariantId || undefined,
        reason: isNoisy ? swipeReason : undefined,
        answers: Object.keys(swipeAnswers).length ? swipeAnswers : undefined,
        perRun,
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
        if (oneShot) {
          scheduleWindowClose(900);
        }
      } catch (err) {
        submitCompareMsgEl.innerHTML = `<div class="error">${escapeHtml(
          err instanceof Error ? err.message : String(err)
        )}</div>`;
        submitCompareBtn.disabled = false;
      } finally {
        setFootStatus('');
        submittingCompare = false;
      }
      return;
    }

    if (isRequire && missing.length) {
      submitCompareMsgEl.innerHTML = `<div class="error">overall is required for ${escapeHtml(
        missing.join(', ')
      )}</div>`;
      return;
    }

    const body = {
      winnerVariantId: winnerVariantId || undefined,
      reason: String(document.getElementById('reason').value || '').trim() || undefined,
      answers: (() => {
        const answers = getAnswers();
        return Object.keys(answers).length ? answers : undefined;
      })(),
      perRun,
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
      if (oneShot) {
        scheduleWindowClose(900);
      }
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

  const route = getRoute();
  const parts = route.parts;
  const routeModes = parseRouteModes(route.query);
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
      await renderReviewPage(decodeURIComponent(runId), {
        requireOverall: routeModes.requireOverall,
      });
      return;
    }
    if (page === 'compare') {
      const experimentId = parts[1];
      if (!experimentId) throw new Error('Missing experimentId');
      await renderComparePage(decodeURIComponent(experimentId), {
        requireOverall: routeModes.requireOverall,
        goodBadMode: routeModes.goodBadMode,
      });
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
