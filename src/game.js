export const SHIPS = [{
    id: 'scout',
    name: 'Pioneer',
    class: 'CARGO / 01',
    form: 'cargo',
    duration: 35,
    cost: 0,
    power: 1,
    thrust: 1,
    color: 0xc8ff59,
    desc: 'A heavy hauler. More time to build momentum.'
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
    desc: 'Twin nacelles and a narrow, agile frame.'
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
    desc: 'Swept wings. A balanced burst of power.'
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
    desc: 'A low-profile flying wing. Fast and fleeting.'
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
    desc: 'A needle hull with outriggers. Every click counts.'
  }
];
export const STAGES = [{
    name: 'Departure',
    place: 'EARTH ORBIT',
    at: 0,
    color: 0xc8ff59
  },
  {
    name: 'Deep space',
    place: 'BEYOND THE BELT',
    at: 70,
    color: 0x71e5ff
  },
  {
    name: 'Star surge',
    place: 'ORION NEBULA',
    at: 180,
    color: 0xffb45e
  },
  {
    name: 'Hyperspace',
    place: 'THE EVENT HORIZON',
    at: 350,
    color: 0xbda0ff
  },
  {
    name: 'Lightspeed',
    place: 'THE GREAT BEYOND',
    at: 600,
    color: 0xff7698
  }
];
export const stageFor = score => STAGES.reduce((n, s, i) => score >= s.at ? i : n, 0);
export function cleanSave(raw = {}) {
  if (!raw || typeof raw !== 'object') raw = {};
  const owned = ['scout', ...SHIPS.filter(s => s.cost > 0 && Array.isArray(raw.owned) && raw.owned.includes(s.id)).map(s => s.id)];
  return {
    credits: Number.isSafeInteger(raw.credits) && raw.credits >= 0 ? raw.credits : 0,
    best: Number.isSafeInteger(raw.best) && raw.best >= 0 ? raw.best : 0,
    owned,
    selected: owned.includes(raw.selected) ? raw.selected : 'scout'
  };
}
export class Flight {
  constructor(save) {
    this.save = cleanSave(save);
    this.state = 'ready';
    this.score = 0;
    this.clicks = 0;
    this.started = 0;
    this.deadline = 0;
    this.history = [];
    this.peak = 0;
  }
  get ship() {
    return SHIPS.find(s => s.id === this.save.selected);
  }
  get stage() {
    return stageFor(this.score);
  }
  start(now) {
    if (this.state === 'flying') return false;
    this.state = 'flying';
    this.score = 0;
    this.clicks = 0;
    this.history = [];
    this.peak = 0;
    this.started = now;
    this.deadline = now + this.ship.duration * 1000;
    return true;
  }
  remaining(now) {
    return this.state === 'flying' ? Math.max(0, (this.deadline - now) / 1000) : this.state === 'done' ? 0 : this.ship.duration;
  }
  cps(now) {
    this.history = this.history.filter(t => t > now - 1000);
    return this.history.length;
  }
  click(now) {
    if (this.state !== 'flying') return false;
    if (now >= this.deadline) {
      this.finish();
      return false;
    }
    this.clicks++;
    this.score += this.ship.power;
    this.history.push(now);
    this.peak = Math.max(this.peak, this.cps(now));
    return true;
  }
  tick(now) {
    if (this.state === 'flying' && now >= this.deadline) this.finish();
  }
  finish() {
    if (this.state !== 'flying') return false;
    this.state = 'done';
    this.save.credits += this.score;
    this.save.best = Math.max(this.save.best, this.score);
    return true;
  }
  equip(id) {
    if (this.state === 'flying') return {
      ok: false,
      message: 'Finish your flight before changing ships.'
    };
    const ship = SHIPS.find(s => s.id === id);
    if (!ship) return {
      ok: false,
      message: 'Unknown ship.'
    };
    if (!this.save.owned.includes(id)) {
      if (this.save.credits < ship.cost) return {
        ok: false,
        message: `You need ${ship.cost - this.save.credits} more credits.`
      };
      this.save.credits -= ship.cost;
      this.save.owned.push(id);
    }
    this.save.selected = id;
    return {
      ok: true,
      message: `${ship.name} equipped.`
    };
  }
}
