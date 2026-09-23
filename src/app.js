import {
  Flight,
  SHIPS,
  STAGES
} from './game.js';

const $ = id => document.getElementById(id),
  format = n => n.toLocaleString('en-US');
let saved;
try {
  saved = JSON.parse(localStorage.getItem('click-speedometer-v1') || '{}');
} catch {
  saved = {};
}
const flight = new Flight(saved);
let sound = false,
  audio, scene, previous = performance.now(),
  lastStage = 0,
  resultShown = false,
  flashTimer, toastTimer, shipPreviews, reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const save = () => {
  try {
    localStorage.setItem('click-speedometer-v1', JSON.stringify(flight.save));
  } catch {
    toast('Storage is unavailable. Progress lasts for this visit.');
  }
};

function toast(text) {
  $('toast').textContent = text;
  $('toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('show'), 3000);
}

function beep(freq = 300, duration = .045) {
  if (!sound) return;
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    audio.resume();
    const o = audio.createOscillator(),
      g = audio.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq, audio.currentTime);
    o.frequency.exponentialRampToValueAtTime(freq * .5, audio.currentTime + duration);
    g.gain.setValueAtTime(.04, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration);
    o.connect(g);
    g.connect(audio.destination);
    o.start();
    o.stop(audio.currentTime + duration);
  } catch {
    sound = false;
  }
}

function renderWallet() {
  $('wallet').textContent = format(flight.save.credits);
  $('best').textContent = format(flight.save.best);
  $('ship-name').textContent = flight.ship.name;
  $('ship-spec').textContent = `${flight.ship.class.split(' /')[0]} · +${flight.ship.power} SPEED · ${flight.ship.duration}s`;
  $('multiplier').textContent = `${flight.ship.power}× CLICK MULTIPLIER`;
  $('active-hint').lastElementChild.textContent = `+${flight.ship.power} SPEED / CLICK`;
  $('launch-description').textContent = `${flight.ship.name} · +${flight.ship.power} speed / click · ${flight.ship.duration}s flight`;
  $('flight-duration').textContent = `${flight.ship.duration} SECONDS`;
}

function renderStages() {
  $('stages').innerHTML = STAGES.map((s, i) => `<div class="stage ${i === flight.stage ? 'active' : i < flight.stage ? 'complete' : ''}"><span>${i < flight.stage ? '✓' : String(i + 1).padStart(2, '0')}</span><div><strong>${s.name}</strong><small>${s.at === 0 ? 'START' : s.at + ' PTS'}</small></div></div>`).join('');
  $('stage-number').textContent = String(flight.stage + 1).padStart(2, '0');
  $('stage-name').textContent = STAGES[flight.stage].name;
  $('sector').textContent = STAGES[flight.stage].place;
}

function start() {
  if (!flight.start(performance.now())) return;
  document.querySelectorAll('dialog[open]').forEach(d => d.close());
  resultShown = false;
  lastStage = 0;
  $('launch-panel').hidden = true;
  $('active-hint').hidden = false;
  $('flight-input').hidden = false;
  $('flight-input').tabIndex = 0;
  $('flight-input').focus({
    preventScroll: true
  });
  $('flight').classList.add('flying');
  $('flight-status').textContent = '● FLIGHT IN PROGRESS';
  $('engine-status').textContent = 'THRUST ONLINE';
  $('shop').disabled = true;
  $('help').disabled = true;
  renderStages();
  beep(600, .16);
}

function input(e) {
  if (!flight.click(performance.now())) return;
  scene?.kick();
  beep(180 + flight.stage * 80);
  if (!reduced && e?.clientX !== undefined) {
    const bounds = $('flight').getBoundingClientRect(),
      pop = document.createElement('span');
    pop.className = 'click-pop';
    pop.textContent = `+${flight.ship.power}`;
    pop.style.left = (e.clientX - bounds.left) + 'px';
    pop.style.top = (e.clientY - bounds.top - 20) + 'px';
    $('flight').append(pop);
    setTimeout(() => pop.remove(), 650);
  }
}

function finish() {
  resultShown = true;
  save();
  renderWallet();
  $('flight-input').hidden = true;
  $('flight-input').tabIndex = -1;
  $('active-hint').hidden = true;
  $('flight-status').textContent = '● FLIGHT COMPLETE';
  $('engine-status').textContent = 'FLIGHT RECORDED';
  $('shop').disabled = false;
  $('help').disabled = false;
  $('launch-panel').hidden = false;
  $('launch-panel').querySelector('h3').innerHTML = 'One more<br><em>light-year?</em>';
  $('launch').innerHTML = 'LAUNCH AGAIN <span aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M3.5 20.5L17 7M9 7H17V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/> </svg></span>';
  $('flight').classList.remove('flying');
  $('result-title').innerHTML = flight.stage === 4 ? 'Lightspeed.<br>You made it.' : 'A little closer<br>to the stars.';
  $('result-score').textContent = format(flight.score);
  $('result-clicks').textContent = format(flight.clicks);
  $('result-cps').textContent = (flight.clicks / flight.ship.duration).toFixed(2);
  $('result-stage').textContent = `${flight.stage + 1} / 5`;
  $('result-credit').textContent = `+${format(flight.score)} credits added to your balance`;
  $('result-dialog').showModal();
  beep(750, .3);
}

function renderShop() {
  $('shop-wallet').textContent = format(flight.save.credits);
  $('ship-grid').innerHTML = SHIPS.map((s, i) => {
    const owned = flight.save.owned.includes(s.id),
      selected = flight.save.selected === s.id;
    return `<article class="ship-card ${selected ? 'equipped' : ''}" style="--ship-color:#${s.color.toString(16)}"><div class="ship-glyph">${shipPreviews?.[s.id] ? `<img src="${shipPreviews[s.id]}" alt="${s.form} spaceship" width="360" height="240">` : `<span>${s.form.toUpperCase()}</span>`}</div><small>${s.class}</small><h3>${s.name}</h3><p>${s.desc}</p><div class="spec"><strong>+${s.power} SPEED / CLICK</strong><br><strong>${s.duration}s FLIGHT TIME</strong><br>${s.power} POINT${s.power > 1 ? 'S' : ''} / CLICK</div><button data-ship="${s.id}" ${selected || (!owned && flight.save.credits < s.cost) ? 'disabled' : ''}>${selected ? 'EQUIPPED' : owned ? 'EQUIP SHIP' : '◈ ' + format(s.cost) + ' · BUY'}</button></article>`;
  }).join('');
}

function loadPreviews() {
  if (shipPreviews) return;
  import('./ships.js').then(({
    renderShipPreviews
  }) => {
    if (!shipPreviews) {
      shipPreviews = renderShipPreviews(SHIPS);
      renderShop();
    }
  }).catch(() => { });
}

function openShop() {
  if (flight.state === 'flying') return;
  $('result-dialog').close();
  renderShop();
  loadPreviews();
  $('shop-message').textContent = '';
  $('shop-dialog').showModal();
}

$('launch').addEventListener('click', start);
$('again').addEventListener('click', start);
$('shop').addEventListener('click', openShop);
$('result-shop').addEventListener('click', openShop);
$('help').addEventListener('click', () => $('help-dialog').showModal());
$('flight-input').addEventListener('pointerdown', e => {
  if (e.button !== 0) return;
  e.preventDefault();
  input(e);
});
$('flight-input').addEventListener('click', e => {
  if (e.detail === 0) input();
});
document.addEventListener('keydown', e => {
  if ((e.code === 'Space' || e.code === 'Enter') && flight.state === 'flying' && !document.querySelector('dialog[open]')) {
    if (e.target instanceof HTMLButtonElement && e.target !== $('flight-input')) return;
    e.preventDefault();
    if (!e.repeat) input();
  }
});
$('sound').addEventListener('click', () => {
  sound = !sound;
  $('sound').setAttribute('aria-label', sound ? 'Mute sound' : 'Enable sound');
  $('sound').querySelector('span').hidden = sound;
  beep(450, .1);
});

function updateMotion() {
  $('motion').textContent = `REDUCED MOTION: ${reduced ? 'ON' : 'OFF'}`;
  $('motion').setAttribute('aria-pressed', String(reduced));
  document.body.classList.toggle('reduced', reduced);
}
updateMotion();
$('motion').addEventListener('click', () => {
  reduced = !reduced;
  updateMotion();
});
document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(d => d.addEventListener('click', e => {
  if (e.target === d) {
    const r = d.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) d.close();
  }
}));
$('ship-grid').addEventListener('click', e => {
  const b = e.target.closest('[data-ship]');
  if (!b) return;
  const result = flight.equip(b.dataset.ship);
  $('shop-message').textContent = result.message;
  if (result.ok) {
    save();
    renderWallet();
    renderShop();
    beep(500, .12);
  }
});
renderWallet();
renderStages();

// The game remains playable if WebGL is unavailable.
import('./scene.js').then(({
  createScene
}) => {
  scene = createScene($('space'));
}).catch(() => {
  $('engine-status').textContent = 'LOW-GRAPHICS MODE';
});

function frame(now) {
  const dt = Math.min((now - previous) / 1000, .05);
  previous = now;
  flight.tick(now);
  if (flight.state === 'done' && !resultShown) finish();
  $('timer').textContent = flight.remaining(now).toFixed(1);
  $('timer-bar').style.width = `${flight.remaining(now) / flight.ship.duration * 100}%`;
  $('score').textContent = String(flight.score).padStart(3, '0');
  $('cps').textContent = flight.state === 'flying' ? flight.cps(now).toFixed(1) : '0.0';
  if (lastStage !== flight.stage) {
    lastStage = flight.stage;
    renderStages();
    $('stage-flash').textContent = `STAGE ${flight.stage + 1} · ${STAGES[flight.stage].name.toUpperCase()}`;
    $('stage-flash').classList.add('show');
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => $('stage-flash').classList.remove('show'), 1600);
    beep(650 + flight.stage * 100, .22);
  }
  const next = STAGES[flight.stage + 1];
  $('next-stage').textContent = next ? `${next.at - flight.score} PTS TO NEXT STAGE` : 'LIGHTSPEED UNLOCKED';
  const velocity = scene?.update(dt, now, flight, reduced) || 0;
  $('velocity').textContent = velocity.toFixed(2);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
document.addEventListener('visibilitychange', () => {
  flight.tick(performance.now());
});
if (document.modelContext?.registerTool) {
  const lifecycle = new AbortController();
  window.addEventListener('pagehide', () => lifecycle.abort(), {
    once: true
  });
  const register = tool => {
    try {
      Promise.resolve(document.modelContext.registerTool(tool, {
        signal: lifecycle.signal
      })).catch(() => { });
    } catch { }
  };
  register({
    name: 'read_flight_status',
    description: 'Read current flight score, time, ship, credits and available upgrades.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    },
    annotations: {
      readOnlyHint: true
    },
    execute: () => ({
      state: flight.state,
      score: flight.score,
      rawClicks: flight.clicks,
      secondsLeft: flight.remaining(performance.now()),
      stage: flight.stage + 1,
      ship: flight.ship.name,
      credits: flight.save.credits,
      ships: SHIPS
    })
  });
  register({
    name: 'equip_spaceship',
    description: 'Buy and equip a ship using earned credits, or equip an owned ship. Available between flights.',
    inputSchema: {
      type: 'object',
      properties: {
        shipId: {
          type: 'string',
          enum: SHIPS.map(s => s.id)
        }
      },
      required: ['shipId'],
      additionalProperties: false
    },
    annotations: {
      readOnlyHint: false
    },
    execute: input => {
      if (!input || typeof input.shipId !== 'string') throw new Error('shipId is required');
      const r = flight.equip(input.shipId);
      if (!r.ok) throw new Error(r.message);
      save();
      renderWallet();
      renderShop();
      return {
        ship: flight.ship.name,
        credits: flight.save.credits
      };
    }
  });
}
