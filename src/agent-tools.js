/**
 * Web MCP tool definitions, which let an agent read the flight and change
 * ships through the same `Flight` instance the UI uses.
 *
 * Entirely optional: browsers without `document.modelContext` simply never
 * register anything.
 */

import { SHIPS } from './game/catalog.js';

function readFlightStatusTool(flight) {
  return {
    name: 'read_flight_status',
    description: 'Read current flight score, time, ship, credits and available upgrades.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
    execute: () => ({
      state: flight.state,
      score: flight.score,
      rawClicks: flight.clicks,
      secondsLeft: flight.remaining(performance.now()),
      stage: flight.stage + 1,
      ship: flight.ship.name,
      credits: flight.save.credits,
      ships: SHIPS,
    }),
  };
}

function equipSpaceshipTool(flight, onEquip) {
  return {
    name: 'equip_spaceship',
    description:
      'Buy and equip a ship using earned credits, or equip an owned ship. Available between flights.',
    inputSchema: {
      type: 'object',
      properties: { shipId: { type: 'string', enum: SHIPS.map((ship) => ship.id) } },
      required: ['shipId'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false },
    execute: (input) => {
      if (!input || typeof input.shipId !== 'string') throw new Error('shipId is required');

      const result = flight.equip(input.shipId);
      if (!result.ok) throw new Error(result.message);

      onEquip();

      return { ship: flight.ship.name, credits: flight.save.credits };
    },
  };
}

/**
 * @param {object} options
 * @param {import('./game/flight.js').Flight} options.flight
 * @param {() => void} options.onEquip Persist and refresh after an agent equip.
 */
export function registerAgentTools({ flight, onEquip }) {
  if (!document.modelContext?.registerTool) return;

  // Registration is tied to the page, not the session, so drop it on unload.
  const lifecycle = new AbortController();
  window.addEventListener('pagehide', () => lifecycle.abort(), { once: true });

  // Registration is best-effort: a host that rejects a tool must not break
  // the game, and the API may signal failure by throwing or by rejecting.
  const register = (tool) => {
    try {
      Promise.resolve(
        document.modelContext.registerTool(tool, { signal: lifecycle.signal }),
      ).catch(() => {});
    } catch {}
  };

  register(readFlightStatusTool(flight));
  register(equipSpaceshipTool(flight, onEquip));
}
