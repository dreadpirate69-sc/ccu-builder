// chains.js: a small, generic set of example chains for a fresh page.
//
// Stage 4: you add, edit, delete and reorder chains on the page itself, and the
// page saves them in your browser. This file is only used when nothing is saved yet,
// or when you click "Load example chains". Editing it by hand still works for that.
//
// Stage 4.2: a chain has no starting ship built in. Every row starts empty at $0;
// pieces are placed on the page itself.
//
// Standalone prices checked 2026-09-29 against the Star Citizen Wiki ship pages
// (starcitizen.tools), which track RSI pledge-store prices.
//
// Each { ... } block below is ONE row. The fields mean:
//   id       - a fixed, unique code for the row. Your layout remembers pieces by id,
//              so you can rename a chain without losing its pieces. Never reuse one.
//   name     - what the row is called
//   endShip  - the ship at the end of the chain (the goal)
//   endPrice - its current standalone store price in $.
//
// Remember the comma after every } except the last one.

const CHAINS = [
  { id: "galaxy",           name: "Galaxy",           endShip: "Galaxy",           endPrice: 380 },
  { id: "asgard",           name: "Asgard",           endShip: "Asgard",           endPrice: 350 },
  { id: "ironclad-1",       name: "Ironclad",         endShip: "Ironclad",         endPrice: 600 },
  { id: "ironclad-assault", name: "Ironclad Assault", endShip: "Ironclad Assault", endPrice: 650 },
  { id: "carrack",          name: "Carrack",          endShip: "Carrack",          endPrice: 600 }
];
