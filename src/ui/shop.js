/**
 * The hangar dialog: ship cards, purchase/equip handling and the lazily
 * rendered 3D previews.
 */

import { SHIPS } from '../game/catalog.js';
import { el, formatNumber } from './dom.js';
import { closeResult } from './flight-view.js';

const PREVIEW_WIDTH = 360;
const PREVIEW_HEIGHT = 240;

const nodes = {
  wallet: el('shop-wallet'),
  grid: el('ship-grid'),
  message: el('shop-message'),
  dialog: el('shop-dialog'),
};

const plural = (count, word) => `${word}${count > 1 ? 'S' : ''}`;

function glyphMarkup(ship, preview) {
  if (!preview) return `<span>${ship.form.toUpperCase()}</span>`;

  return `<img src="${preview}" alt="${ship.form} spaceship" width="${PREVIEW_WIDTH}" height="${PREVIEW_HEIGHT}">`;
}

function actionLabel(ship, { owned, selected }) {
  if (selected) return 'EQUIPPED';

  return owned ? 'EQUIP SHIP' : `◈ ${formatNumber(ship.cost)} · BUY`;
}

function cardMarkup(ship, { save, preview }) {
  const owned = save.owned.includes(ship.id);
  const selected = save.selected === ship.id;
  const affordable = owned || save.credits >= ship.cost;

  return `
    <article class="ship-card ${selected ? 'equipped' : ''}" style="--ship-color:#${ship.color.toString(16)}">
      <div class="ship-glyph">${glyphMarkup(ship, preview)}</div>
      <small>${ship.class}</small>
      <h3>${ship.name}</h3>
      <p>${ship.desc}</p>
      <div class="spec"><strong>+${ship.power} SPEED / CLICK</strong><br><strong>${ship.duration}s FLIGHT TIME</strong><br>${ship.power} ${plural(ship.power, 'POINT')} / CLICK</div>
      <button data-ship="${ship.id}" ${selected || !affordable ? 'disabled' : ''}>${actionLabel(ship, { owned, selected })}</button>
    </article>`;
}

/**
 * @param {object} options
 * @param {import('../game/flight.js').Flight} options.flight
 * @param {(result: { ok: boolean, message: string }) => void} options.onEquip
 *   Called after every equip attempt so the caller can persist and refresh.
 */
export function createShop({ flight, onEquip }) {
  /** Data URLs keyed by ship id, filled in once the preview renderer loads. */
  let previews;

  function render() {
    nodes.wallet.textContent = formatNumber(flight.save.credits);
    nodes.grid.innerHTML = SHIPS.map((ship) =>
      cardMarkup(ship, { save: flight.save, preview: previews?.[ship.id] }),
    ).join('');
  }

  /**
   * Previews need a second WebGL context, so they load on first open and the
   * cards fall back to text glyphs if that fails.
   */
  function loadPreviews() {
    if (previews) return;

    import('../ships/previews.js')
      .then(({ renderShipPreviews }) => {
        if (previews) return;

        previews = renderShipPreviews(SHIPS);
        render();
      })
      .catch(() => {});
  }

  function open() {
    if (flight.state === 'flying') return;

    closeResult();
    render();
    loadPreviews();

    nodes.message.textContent = '';
    nodes.dialog.showModal();
  }

  nodes.grid.addEventListener('click', (event) => {
    const button = event.target.closest('[data-ship]');
    if (!button) return;

    const result = flight.equip(button.dataset.ship);
    nodes.message.textContent = result.message;

    if (result.ok) render();
    onEquip(result);
  });

  return { render, open };
}
