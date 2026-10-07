/**
 * Static game content: the ships you can fly and the stages you fly through.
 *
 * `power` is both the thrust multiplier and the points earned per click, so a
 * shorter flight is only worth it if you can click fast enough to exploit it.
 */

export const SHIPS = [
  {
    id: 'scout',
    name: 'Pioneer',
    class: 'CARGO / 01',
    form: 'cargo',
    duration: 35,
    cost: 0,
    power: 1,
    thrust: 1,
    color: 0xc8ff59,
    desc: 'A heavy hauler. More time to build momentum.',
  },
  {
    id: 'pulse',
    name: 'Pulse',
    class: 'INTERCEPTOR / 02',
    form: 'interceptor',
    duration: 25,
    cost: 300,
    power: 2,
    thrust: 1.2,
    color: 0x71e5ff,
    desc: 'Twin nacelles and a narrow, agile frame.',
  },
  {
    id: 'nova',
    name: 'Nova',
    class: 'STRIKER / 03',
    form: 'striker',
    duration: 20,
    cost: 800,
    power: 3,
    thrust: 1.45,
    color: 0xffb45e,
    desc: 'Swept wings. A balanced burst of power.',
  },
  {
    id: 'spectre',
    name: 'Spectre',
    class: 'STEALTH / 04',
    form: 'stealth',
    duration: 12,
    cost: 1800,
    power: 5,
    thrust: 1.7,
    color: 0xbda0ff,
    desc: 'A low-profile flying wing. Fast and fleeting.',
  },
  {
    id: 'zenith',
    name: 'Zenith',
    class: 'LIGHTRUNNER / 05',
    form: 'lightrunner',
    duration: 10,
    cost: 4000,
    power: 8,
    thrust: 2,
    color: 0xff7698,
    desc: 'A needle hull with outriggers. Every click counts.',
  },
];

/** Ordered by `at`, the score at which the stage begins. */
export const STAGES = [
  { name: 'Departure', place: 'EARTH ORBIT', at: 0, color: 0xc8ff59 },
  { name: 'Deep space', place: 'BEYOND THE BELT', at: 70, color: 0x71e5ff },
  { name: 'Star surge', place: 'ORION NEBULA', at: 180, color: 0xffb45e },
  { name: 'Hyperspace', place: 'THE EVENT HORIZON', at: 350, color: 0xbda0ff },
  { name: 'Lightspeed', place: 'THE GREAT BEYOND', at: 600, color: 0xff7698 },
];

export const DEFAULT_SHIP_ID = 'scout';

export const findShip = (id) => SHIPS.find((ship) => ship.id === id);

/** `'CARGO / 01'` -> `'CARGO'`. */
export const shipCategory = (ship) => ship.class.split(' /')[0];
