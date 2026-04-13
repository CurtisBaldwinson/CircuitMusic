/* ============================================================
   CIRCUIT MUSIC — Interactive JS
   ============================================================ */

// ---- THEME TOGGLE ----
(function () {
  const t = document.querySelector('[data-theme-toggle]');
  const r = document.documentElement;
  let d = matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light';
  r.setAttribute('data-theme', d);
  if (t) {
    t.addEventListener('click', () => {
      d = d === 'dark' ? 'light' : 'dark';
      r.setAttribute('data-theme', d);
      t.setAttribute('aria-label', 'Switch to ' + (d === 'dark' ? 'light' : 'dark') + ' mode');
      t.innerHTML = d === 'dark'
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    });
  }
})();

// ---- HERO WAVEFORM ANIMATION ----
(function () {
  const canvas = document.getElementById('heroWave');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w, h, raf;
  let phase = 0;

  function resize() {
    w = canvas.width = canvas.offsetWidth;
    h = canvas.height = 120;
  }

  function getColor(opacity) {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    return dark
      ? `rgba(167, 139, 250, ${opacity})`
      : `rgba(124, 58, 237, ${opacity})`;
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    const layers = [
      { amp: 18, freq: 0.018, speed: 0.008, opacity: 0.5 },
      { amp: 12, freq: 0.025, speed: 0.012, opacity: 0.35 },
      { amp: 8,  freq: 0.04,  speed: 0.02,  opacity: 0.2 },
    ];
    layers.forEach(({ amp, freq, speed, opacity }) => {
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      for (let x = 0; x <= w; x += 2) {
        const y = h / 2 + Math.sin(x * freq + phase * speed * 80) * amp
                       + Math.sin(x * freq * 1.7 + phase * speed * 50) * (amp * 0.5);
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = getColor(opacity);
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
    phase++;
    raf = requestAnimationFrame(draw);
  }

  window.addEventListener('resize', () => { resize(); });
  resize();
  draw();
})();

// ---- HERO STAT COUNTER ----
(function () {
  const targets = document.querySelectorAll('[data-count]');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const end = parseInt(el.dataset.count, 10);
        const duration = 1200;
        const start = performance.now();
        function tick(now) {
          const elapsed = now - start;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          el.textContent = Math.round(eased * end);
          if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.5 });
  targets.forEach(t => observer.observe(t));
})();

// ---- RHYTHM GRID ----
(function () {
  // 16 sixteenth note slots per bar
  // Tresillo positions in 8-unit pattern, applied across 16 slots (2x tresillo per bar):
  // 3+3+2 → slots 0,3,5 then 8,11,13
  const tresilloHits = new Set([0, 3, 5, 8, 11, 13]);
  // Kick: every 4 slots (beats 1,2,3,4 in 4/4 = slots 0,4,8,12)
  const kickHits = new Set([0, 4, 8, 12]);

  function buildGrid(containerId, hitSet, otherSet, colorClass) {
    const container = document.getElementById(containerId);
    if (!container) return;
    for (let i = 0; i < 16; i++) {
      const cell = document.createElement('div');
      cell.className = 'rhythm-cell';
      if (hitSet.has(i) && otherSet && otherSet.has(i)) {
        cell.classList.add('hit-both');
      } else if (hitSet.has(i)) {
        cell.classList.add(colorClass || 'hit');
      }
      container.appendChild(cell);
    }
  }

  buildGrid('tresilloGrid', tresilloHits, null, 'hit');
  buildGrid('kickGrid', kickHits, null, 'hit-kick');

  // Combined: show both
  const combined = document.getElementById('combinedGrid');
  if (combined) {
    for (let i = 0; i < 16; i++) {
      const cell = document.createElement('div');
      cell.className = 'rhythm-cell';
      const hasTresillo = tresilloHits.has(i);
      const hasKick = kickHits.has(i);
      if (hasTresillo && hasKick) cell.classList.add('hit-both');
      else if (hasTresillo) cell.classList.add('hit');
      else if (hasKick) cell.classList.add('hit-kick');
      combined.appendChild(cell);
    }
  }

  // Animated playback
  let step = 0;
  let playInterval = null;

  function playStep(s) {
    ['tresilloGrid', 'kickGrid', 'combinedGrid'].forEach(id => {
      const grid = document.getElementById(id);
      if (!grid) return;
      const cells = grid.querySelectorAll('.rhythm-cell');
      cells.forEach(c => c.classList.remove('lit'));
      if (cells[s]) {
        cells[s].classList.add('lit');
        // re-trigger animation
        cells[s].classList.remove('lit');
        void cells[s].offsetWidth;
        cells[s].classList.add('lit');
      }
    });
  }

  const rhythmSection = document.getElementById('rhythm');
  if (rhythmSection) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          if (!playInterval) {
            // Play at ~130 BPM: one 16th note = 60/130/4 sec ≈ 115ms
            playInterval = setInterval(() => {
              playStep(step);
              step = (step + 1) % 16;
            }, 115);
          }
        } else {
          if (playInterval) { clearInterval(playInterval); playInterval = null; }
        }
      });
    }, { threshold: 0.3 });
    observer.observe(rhythmSection);
  }
})();

// ---- CHART.JS DATA ---- 
const GENRES = ['Circuit', 'Tribal House', 'Disco', 'House', 'Jazz'];
const COLORS = ['#c084fc', '#f97316', '#facc15', '#4ade80', '#38bdf8'];
const COLORS_ALPHA = ['rgba(192,132,252,0.15)', 'rgba(249,115,22,0.15)', 'rgba(250,204,21,0.15)', 'rgba(74,222,128,0.15)', 'rgba(56,189,248,0.15)'];

const METRICS = {
  bpm: {
    title: 'Tempo (BPM)',
    explain: 'Beats per minute measured by librosa\'s beat tracker. Circuit music\'s 128–130 BPM range is faster than classic disco and standard house, placing it firmly in peak-time electronic territory.',
    values: [129.2, 103.4, 123.0, 123.0, 136.0],
    unit: 'BPM',
    min: 80,
    max: 160,
  },
  tresillo: {
    title: 'Tresillo Index',
    explain: 'Measures how strongly the 3+3+2 tresillo pattern appears in the kick/bass layer. A score above 1.0 means the tresillo positions receive more energy than non-tresillo positions. Circuit (1.15) and Tribal House (2.28) show deliberate use; Disco and Jazz encounter it incidentally.',
    values: [1.148, 2.277, 1.122, 1.262, 1.221],
    unit: '',
    min: 0.9,
    max: 2.5,
    refLine: { value: 1.0, label: 'Baseline (no preference)' }
  },
  density: {
    title: 'Event Density (onsets/sec)',
    explain: 'Number of musical events (note attacks, percussion hits) per second. Disco\'s high density comes from constant hi-hat fills. Circuit is denser than house, confirming its maximalist production. Jazz\'s sparseness reflects its emphasis on space and phrasing.',
    values: [6.27, 5.53, 8.15, 4.90, 3.20],
    unit: '/sec',
    min: 0,
    max: 10,
  },
  percussive: {
    title: 'Percussive Energy %',
    explain: 'What percentage of total audio energy is percussive vs. harmonic, measured via HPSS (Harmonic-Percussive Source Separation). Disco\'s live drums dominate at 54.5%. Jazz is nearly all harmonic (5.7%). Circuit sits in the middle at 40.8% — a balance between drum density and synth richness.',
    values: [40.8, 33.3, 54.5, 27.6, 5.7],
    unit: '%',
    min: 0,
    max: 65,
  },
  harmonic: {
    title: 'Harmonic Diversity (Chroma Entropy)',
    explain: 'Shannon entropy of the chroma distribution — how many different pitch classes are used and how evenly. Higher entropy means more tonal complexity. Jazz leads at 6.17 (constant chord changes). Circuit (5.48) is surprisingly rich — denser harmonically than disco or tribal house.',
    values: [5.48, 4.46, 4.50, 5.32, 6.17],
    unit: ' bits',
    min: 3.5,
    max: 7,
  },
  dynamic: {
    title: 'Dynamic Range (RMS CoV)',
    explain: 'Coefficient of variation of the RMS energy — how much loudness varies throughout the segment. Jazz (0.78) has enormous dynamic range from soft to loud passages. Circuit (0.36) and House (0.35) are highly compressed — a deliberate design for DJ-mix continuity across 8-hour sets.',
    values: [0.364, 0.486, 0.402, 0.346, 0.778],
    unit: '',
    min: 0,
    max: 0.9,
  },
};

// ---- MAIN BAR CHART ---- 
let mainChart = null;

function getCSSVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function buildMainChart(metricKey) {
  const m = METRICS[metricKey];
  const canvas = document.getElementById('mainChart');
  if (!canvas) return;

  const textColor = getCSSVar('--color-text');
  const mutedColor = getCSSVar('--color-text-muted');
  const faintColor = getCSSVar('--color-text-faint');
  const borderColor = getCSSVar('--color-border');
  const surfaceColor = getCSSVar('--color-surface');

  const data = {
    labels: GENRES,
    datasets: [{
      data: m.values,
      backgroundColor: COLORS.map(c => c + 'cc'),
      borderColor: COLORS,
      borderWidth: 2,
      borderRadius: 6,
    }]
  };

  const plugins = [];
  if (m.refLine) {
    plugins.push({
      id: 'refLine',
      afterDraw(chart) {
        const { ctx, chartArea, scales } = chart;
        const y = scales.y.getPixelForValue(m.refLine.value);
        ctx.save();
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = faintColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(chartArea.left, y);
        ctx.lineTo(chartArea.right, y);
        ctx.stroke();
        ctx.font = `11px ${getCSSVar('--font-body')}`;
        ctx.fillStyle = faintColor;
        ctx.fillText(m.refLine.label, chartArea.left + 8, y - 6);
        ctx.restore();
      }
    });
  }

  if (mainChart) mainChart.destroy();
  mainChart = new Chart(canvas, {
    type: 'bar',
    data,
    plugins,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 500, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: surfaceColor,
          titleColor: textColor,
          bodyColor: mutedColor,
          borderColor: borderColor,
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: ctx => `${ctx.parsed.y}${m.unit}`
          }
        },
      },
      scales: {
        x: {
          ticks: { color: textColor, font: { size: 13, weight: '500', family: getCSSVar('--font-body') } },
          grid: { color: borderColor, lineWidth: 0.5 },
          border: { display: false },
        },
        y: {
          min: m.min,
          max: m.max,
          ticks: { color: mutedColor, font: { size: 11 }, callback: v => v + m.unit },
          grid: { color: borderColor, lineWidth: 0.5 },
          border: { display: false },
        }
      }
    }
  });
}

// Chart tab switching
(function () {
  const tabs = document.querySelectorAll('.chart-tab');
  const titleEl = document.getElementById('chartTitle');
  const explainEl = document.getElementById('chartExplain');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      const key = tab.dataset.metric;
      titleEl.textContent = METRICS[key].title;
      explainEl.textContent = METRICS[key].explain;
      buildMainChart(key);
    });
  });

  // Initial chart
  buildMainChart('bpm');
})();

// ---- RADAR CHART ---- 
(function () {
  const canvas = document.getElementById('radarChart');
  if (!canvas) return;

  // Normalized data (0-1) for each genre across 6 dimensions
  // [BPM norm, Beat Regularity inv, Tresillo, Event Density, Percussive, Harmonic Diversity]
  // BPM: 80-160 range; Beat regularity inverted (lower CV = higher score); rest normalized 0-1
  const normalize = (val, min, max) => (val - min) / (max - min);

  const rawData = {
    Circuit:      [129.2, 0.0388, 1.148, 6.27, 40.8, 5.48],
    'Tribal House': [103.4, 0.0881, 2.277, 5.53, 33.3, 4.46],
    Disco:        [123.0, 0.0231, 1.122, 8.15, 54.5, 4.50],
    House:        [123.0, 0.0241, 1.262, 4.90, 27.6, 5.32],
    Jazz:         [136.0, 0.0281, 1.221, 3.20, 5.7, 6.17],
  };

  // Ranges for normalization
  const ranges = [
    [80, 160],   // BPM
    [0, 0.09],   // Beat irregularity (inverted)
    [1.0, 2.5],  // Tresillo
    [0, 10],     // Event density
    [0, 60],     // Percussive %
    [3.5, 7.0],  // Harmonic entropy
  ];

  const normalized = Object.entries(rawData).map(([name, vals]) => ({
    name,
    data: vals.map((v, i) => {
      const n = normalize(v, ranges[i][0], ranges[i][1]);
      // Invert beat irregularity (lower = more mechanical = higher "house" score)
      return i === 1 ? 1 - n : n;
    })
  }));

  const labels = ['Tempo', 'Mechanical Regularity', 'Tresillo Strength', 'Event Density', 'Percussive Energy', 'Harmonic Richness'];

  const textColor = getCSSVar('--color-text');
  const mutedColor = getCSSVar('--color-text-muted');
  const borderColor = getCSSVar('--color-border');
  const surfaceColor = getCSSVar('--color-surface');

  new Chart(canvas, {
    type: 'radar',
    data: {
      labels,
      datasets: normalized.map((g, i) => ({
        label: g.name,
        data: g.data,
        borderColor: COLORS[i],
        backgroundColor: COLORS_ALPHA[i],
        borderWidth: 2,
        pointBackgroundColor: COLORS[i],
        pointRadius: 4,
        pointHoverRadius: 6,
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      animation: { duration: 800 },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: surfaceColor,
          titleColor: textColor,
          bodyColor: mutedColor,
          borderColor: borderColor,
          borderWidth: 1,
          padding: 10,
        }
      },
      scales: {
        r: {
          min: 0,
          max: 1,
          ticks: { display: false },
          grid: { color: borderColor },
          angleLines: { color: borderColor },
          pointLabels: {
            color: mutedColor,
            font: { size: 12, family: getCSSVar('--font-body'), weight: '500' }
          }
        }
      }
    }
  });
})();

// ---- SCROLL ANIMATIONS ---- 
(function () {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        // Animate quality bars
        entry.target.querySelectorAll('.quality-bar-inner').forEach(bar => {
          bar.style.width = bar.style.getPropertyValue('--w') || bar.parentElement.parentElement.querySelector('.quality-bar-inner').style.cssText.match(/--w:\s*([^;]+)/)?.[1] || '0%';
        });
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  // Observe sections, cards, insight blocks
  document.querySelectorAll('.insight-card, .dj-card, .timeline-item, .rhythm-card, .quality-item').forEach(el => {
    observer.observe(el);
  });

  // Separately animate quality bars on scroll into view
  const qualityObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.querySelectorAll('.quality-bar-inner').forEach(bar => {
            const match = bar.style.cssText.match(/--w:\s*([^;]+)/);
            if (match) bar.style.width = match[1];
          });
        }, 200);
        qualityObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  const qualitiesEl = document.querySelector('.qualities');
  if (qualitiesEl) qualityObserver.observe(qualitiesEl);

  // Also animate dj bars
  document.querySelectorAll('.dj-card').forEach(card => {
    const barObserver = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          setTimeout(() => {
            e.target.querySelectorAll('.dj-bar-fill').forEach(fill => {
              const match = fill.style.cssText.match(/--w:\s*([^;]+)/);
              if (match) fill.style.width = match[1];
              else fill.style.width = '0%';
            });
          }, 100);
          barObserver.unobserve(e.target);
        }
      });
    }, { threshold: 0.2 });
    // Initialize all bars at 0 width so they animate in
    card.querySelectorAll('.dj-bar-fill').forEach(fill => {
      const target = fill.style.getPropertyValue('--w') || fill.style.cssText.match(/--w:\s*([^;]+)/)?.[1] || '0%';
      fill.setAttribute('data-target', target);
      fill.style.setProperty('--w', target);
      fill.style.width = '0%';
    });
    barObserver.observe(card);
  });

})();

// ---- RHYTHM AUDIO PLAY BUTTON ----
(function () {
  const btn = document.getElementById('rhythmPlayBtn');
  const audio = document.getElementById('circuitAudio');
  if (!btn || !audio) return;

  // Inject progress bar into rhythm-visual
  const visual = document.querySelector('.rhythm-visual');
  const progressBar = document.createElement('div');
  progressBar.className = 'rhythm-progress-bar';
  visual.appendChild(progressBar);

  const iconPlay = btn.querySelector('.rpb-icon-play');
  const iconStop = btn.querySelector('.rpb-icon-stop');
  const label = btn.querySelector('.rpb-label');

  let playing = false;
  let progressRaf = null;

  function setPlaying(state) {
    playing = state;
    btn.setAttribute('aria-pressed', state);
    btn.classList.toggle('playing', state);
    iconPlay.style.display = state ? 'none' : '';
    iconStop.style.display = state ? '' : 'none';
    label.textContent = state ? 'Stop' : 'Hear it';
    progressBar.classList.toggle('visible', state);
  }

  function updateProgress() {
    if (!playing) return;
    const pct = (audio.currentTime / audio.duration) * 100;
    progressBar.style.width = pct + '%';
    progressRaf = requestAnimationFrame(updateProgress);
  }

  btn.addEventListener('click', () => {
    if (playing) {
      audio.pause();
      audio.currentTime = 0;
      progressBar.style.width = '0%';
      cancelAnimationFrame(progressRaf);
      setPlaying(false);
    } else {
      // Fade in via Web Audio API gain node for smooth entry
      audio.volume = 0;
      audio.currentTime = 0;
      audio.play().then(() => {
        setPlaying(true);
        // Quick volume ramp 0→1 over 300ms
        let vol = 0;
        const ramp = setInterval(() => {
          vol = Math.min(vol + 0.06, 1);
          audio.volume = vol;
          if (vol >= 1) clearInterval(ramp);
        }, 18);
        progressRaf = requestAnimationFrame(updateProgress);
      }).catch(() => {
        // Autoplay blocked — user gesture already happened, try direct
        audio.volume = 1;
        audio.play();
        setPlaying(true);
        progressRaf = requestAnimationFrame(updateProgress);
      });
    }
  });

  // When audio ends naturally (loop is on so this won't fire, but just in case)
  audio.addEventListener('ended', () => {
    setPlaying(false);
    progressBar.style.width = '0%';
    cancelAnimationFrame(progressRaf);
  });

  // Stop audio if user scrolls far away from section
  const rhythmSec = document.getElementById('rhythm');
  if (rhythmSec) {
    const stopObserver = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting && playing) {
          // Fade out
          let vol = audio.volume;
          const fadeOut = setInterval(() => {
            vol = Math.max(vol - 0.08, 0);
            audio.volume = vol;
            if (vol <= 0) {
              audio.pause();
              audio.currentTime = 0;
              audio.volume = 1;
              cancelAnimationFrame(progressRaf);
              progressBar.style.width = '0%';
              setPlaying(false);
              clearInterval(fadeOut);
            }
          }, 16);
        }
      });
    }, { threshold: 0.05 });
    stopObserver.observe(rhythmSec);
  }
})();

// Re-build chart on theme change (to pick up new CSS variable colors)
const themeToggle = document.querySelector('[data-theme-toggle]');
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    setTimeout(() => {
      const activeTab = document.querySelector('.chart-tab.active');
      if (activeTab) buildMainChart(activeTab.dataset.metric);
    }, 50);
  });
}
