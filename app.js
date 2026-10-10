// app.js: what the page DOES.
// CCU Builder 1.0 = first public release (same features as the 4.8 test build, history below).
// Stage 1 = read your CSV and draw one piece per CCU.
// Stage 2 = draw your chains as price rulers, and let you drag pieces onto them.
// Stage 3 = check ship names link up, show missing stretches in yellow, add up totals.
// Stage 3.1 = "Speculative prices*" switch: concept ships use community guesses (prices.js).
// Stage 4 = one shared price ruler for all rows, your ships CSV, and add / edit /
//           delete / reorder chains right on the page.
// Stage 4.2 = chains start EMPTY at $0. Starter ships are draggable pieces ($0 up to
//           their price) that you drop on a row's $0 slot. You can also add "planned"
//           ships you don't own yet (their price counts as missing money).
// Stage 4.3 = "Save to file" / "Load from file" (a .json backup), a welcome pop-up with
//           "? Help", every prices.js ship in the name suggestions, and an orange ⚠
//           warning when speculative prices make a CCU go DOWN (or stay level) in price.
//           Also a "Try example data" button: a made-up hangar from example.js (part 1b).
// Stage 4.4 = "Likely warbonds ★": teal SPECULATIVE pieces built from past warbond sales
//           (warbonds.js), a filter by chain / yellow gap / price, and a 🛒 shopping list
//           with Copy, Download .txt and "Email to myself" (part 11).
// Stage 4.5 = gap planning: click a yellow gap and the list shows EVERY CCU that fits inside
//           it, warbond (with a small "WB" badge, paid in cash) AND standard (estimated from
//           the price difference, paid with store credit). Planned standard pieces are teal
//           too, are never owned, and go on the shopping list (part 12).
// 4.7 = the shopping list has two sections (warbonds = cash, standard CCUs = store credit),
//         your CSV prices win over prices.js / warbonds.js (part 2f), a visible warning +
//         "last saved" time + a one-time backup tip (part 5b), ship name aliases like
//         "G12 R" = "G12r" (part 2b), and a small "no LTI" tag on chains (part 3).
//         Later in 4.7: the left column shows "Your ships", then "Your CCUs (owned)", then
//         the "Suggested warbonds ★" box (was "Likely warbonds ★"), each scrolling on its own, with a soft
//         "warbonds under $100 have become rare" note; price hovers mention CCU Game's own
//         speculative prices.
// 4.8 = in the gap planning list every warbond (WB) option comes first, then every standard
//         CCU (part 12), and the teal ★ pieces are called "suggested warbonds" everywhere.
//
// Big idea: the page keeps a few lists in memory ("state"), and redraws everything
// from them whenever something changes. You never move things on screen by hand;
// you change the lists, then call drawAll().

// ---- Settings you can play with ----
// "let" instead of "const" because the zoom slider changes it while the page runs.
let PIXELS_PER_5_DOLLARS = 16;  // every $5 of upgrade value = 16 pixels of length

// Stage 3: should a piece right after a yellow gap be flagged "nothing ends at $N"?
// true  = yes (strict: every piece must connect to the one before it)
// false = no (the yellow "missing" block already tells you something is missing there)
const FLAG_PIECES_AFTER_GAPS = false;

// Stage 4: width of the pinned chain-name column on the left, in pixels.
// (style.css uses the same number in .chain-label and .axis-corner.)
const LABEL_WIDTH = 270;

// Stage 4.2: does a PLANNED ship's price count in "value"?
// false = no: you haven't bought it, so it is only "missing" money (and savings
//         don't grow from a ship you haven't paid for)
// true  = yes: value includes it too (then savings = value − paid includes it as well)
const PLANNED_SHIP_COUNTS_AS_VALUE = false;

// Names used to save things in the browser's storage (localStorage).
// Stage 4.2 saves chains and the layout under NEW names ("...v42"), so Stage 4 still
// works exactly as before if you open it again. The old names are only READ, once.
const SAVE_CCUS        = "ccuBuilder.ccus";          // the CCU list from your CSV
const SAVE_LAYOUT      = "ccuBuilder.layout.v42";    // which CCU sits in which chain (by chain id)
const SAVE_LAYOUT_V4   = "ccuBuilder.layout.v4";     // Stage 4/4.1 layout, read once
const SAVE_LAYOUT_OLD  = "ccuBuilder.layout";        // Stage 2/3 layout (by chain NAME), read once
const SAVE_ZOOM        = "ccuBuilder.zoom";          // the zoom slider position
const SAVE_SPEC        = "ccuBuilder.specPrices";    // is the "Speculative prices*" box ticked?
const SAVE_SHIPS       = "ccuBuilder.ships";         // your ships CSV (Stage 4)
const SAVE_CHAINS      = "ccuBuilder.chains.v42";    // your chains (Stage 4.2: no start ship fields)
const SAVE_CHAINS_OLD  = "ccuBuilder.chains";        // Stage 4/4.1 chains, read once and converted
const SAVE_PLANNED     = "ccuBuilder.plannedShips";  // NEW in 4.2: your planned ships
const SAVE_SHIP_LAYOUT = "ccuBuilder.shipLayout";    // NEW in 4.2: which ship sits in which chain
const SAVE_HIDE_WELCOME = "ccuBuilder.hideWelcome";  // NEW in 4.3: "yes" = don't show the welcome pop-up
const SAVE_EXAMPLE     = "ccuBuilder.exampleData";   // NEW in 4.3: "yes" = the made-up example data is loaded
const SAVE_WARBONDS    = "ccuBuilder.warbondPieces"; // NEW in 4.4: the teal ★ likely warbond pieces on your chains
const SAVE_STANDARD    = "ccuBuilder.standardPieces"; // NEW in 4.5: the teal ★ planned STANDARD CCUs (store credit)
const SAVE_LAST_FILE   = "ccuBuilder.lastFileSave";  // NEW in 4.7: when you last clicked "Save to file"
const SAVE_BACKUP_TIP  = "ccuBuilder.backupTipDone"; // NEW in 4.7: "yes" = the backup tip was closed

// Stage 4.3: the "Save to file" format. The number goes up only if the file's layout
// changes, so a newer file is recognised (and refused politely) by an older page.
const SAVE_FILE_APP     = "CCU Builder";
const SAVE_FILE_VERSION = 1;

// Stage 4.3: the narrowest an orange "speculative prices collide" piece is drawn, in
// pixels, when it can't sit at its store-price spot (see collisionSpot()).
const MIN_WARNING_WIDTH = 40;

// Stage 4.4: RSI never sells a CCU for less than $5, so a likely warbond piece costs
// at least this much cash, even when the math says less.
const WB_MIN_CASH = 5;

// Stage 4.5: a gap with a huge price range (say $60 to $600) can have thousands of possible
// standard CCUs. With "Show all" ticked we draw at most this many lines (the list says so).
const MAX_GAP_ITEMS = 200;

// Stage 4.5: rumored "Mk V" ships (Taurus / Aquila / Phoenix Mk V ...) are never offered as
// standard CCUs. A regular expression ("regex") is a text pattern: \b = a word edge,
// \s* = any spaces, i = upper/lower case doesn't matter. So "Mk V", "MKV" and "mk v" match,
// but "Mk IV" and "Mk II" don't.
const RUMORED_SHIP = /\bmk\s*v\b/i;

// ---- Grab the page elements we need (by the id we gave them in CCU-Builder.html) ----
const csvInput      = document.getElementById("csvInput");
const shipsInput    = document.getElementById("shipsInput");
const stack         = document.getElementById("stack");
const chainsBox     = document.getElementById("chains");
const zoomSlider    = document.getElementById("zoomSlider");
const zoomValue     = document.getElementById("zoomValue");
const resetButton   = document.getElementById("resetButton");
const totalsBar     = document.getElementById("totals");
const specToggle    = document.getElementById("specToggle");
const shipsList     = document.getElementById("shipsList");
const shipsCount    = document.getElementById("shipsCount");
const addChainButton      = document.getElementById("addChainButton");
const exampleChainsButton = document.getElementById("exampleChainsButton");
const clearChainsButton   = document.getElementById("clearChainsButton");
const chainDialog   = document.getElementById("chainDialog");
const chainForm     = document.getElementById("chainForm");
const formTitle     = document.getElementById("formTitle");
const formErrors    = document.getElementById("formErrors");
const formCancel    = document.getElementById("formCancel");
const shipNames     = document.getElementById("shipNames");
const fName         = document.getElementById("fName");
const fEndShip      = document.getElementById("fEndShip");
const fEndPrice     = document.getElementById("fEndPrice");
const fSpecHint     = document.getElementById("fSpecHint");
// NEW in Stage 4.2: the "Add starter ship" button and form
const addShipButton = document.getElementById("addShipButton");
const shipDialog    = document.getElementById("shipDialog");
const shipForm      = document.getElementById("shipForm");
const shipErrors    = document.getElementById("shipErrors");
const shipCancel    = document.getElementById("shipCancel");
const sName         = document.getElementById("sName");
const sPrice        = document.getElementById("sPrice");
// NEW in Stage 4.3: save / load a file, and the welcome pop-up
const saveFileButton = document.getElementById("saveFileButton");
const loadFileButton = document.getElementById("loadFileButton");
const jsonInput      = document.getElementById("jsonInput");
const helpButton     = document.getElementById("helpButton");
const welcomeDialog  = document.getElementById("welcomeDialog");
const welcomeHide    = document.getElementById("welcomeHide");
const welcomeOk      = document.getElementById("welcomeOk");
// NEW in Stage 4.3: the "Try example data" button and the orange "Example data" pill
const exampleDataButton = document.getElementById("exampleDataButton");
const exampleBadge      = document.getElementById("exampleBadge");
// NEW in Stage 4.4: the "Suggested warbonds ★" section (called "Likely warbonds" before 4.7) and the shopping list
const warbondBox      = document.getElementById("warbondBox");
const warbondCount    = document.getElementById("warbondCount");
const warbondUpdated  = document.getElementById("warbondUpdated");
const warbondFor      = document.getElementById("warbondFor");
const warbondFilterBar = document.getElementById("warbondFilterBar");
const warbondListBox  = document.getElementById("warbondList");
const wbMin           = document.getElementById("wbMin");
const wbMax           = document.getElementById("wbMax");
const wbRangeClear    = document.getElementById("wbRangeClear");
const shopButton      = document.getElementById("shopButton");
const shopDialog      = document.getElementById("shopDialog");
const shopUpdated     = document.getElementById("shopUpdated");
const shopLines       = document.getElementById("shopLines");
const shopTotal       = document.getElementById("shopTotal");
const shopCopy        = document.getElementById("shopCopy");
const shopDownload    = document.getElementById("shopDownload");
const shopEmail       = document.getElementById("shopEmail");
const shopClose       = document.getElementById("shopClose");
const shopStatus      = document.getElementById("shopStatus");
const shopCredit      = document.getElementById("shopCredit");   // NEW in 4.5: the store credit subtotal
// NEW in 4.7: the "last saved" stamp, the autosave warning and the one-time backup tip
const saveStatus      = document.getElementById("saveStatus");
const saveWarning     = document.getElementById("saveWarning");
const backupTip       = document.getElementById("backupTip");
const backupTipSave   = document.getElementById("backupTipSave");
const backupTipClose  = document.getElementById("backupTipClose");

// ---- The state: everything the page knows ----
// ccus:   list of CCU objects, e.g. { id: "Cutlass Black → Cutlass Red #1", from: "Cutlass Black", ... }
// layout: which chain each placed CCU is in, by the chain's id,
//         e.g. { "Cutlass Black → Cutlass Red #1": "galaxy" }. Not in layout = in the stack.
// chains: your chain rows (saved in the browser, see chains.js for the fields)
// ships:  your ships from the ships CSV, e.g. { name: "Starfarer", insurance: "LTI", msrp: 300, paid: 250, place: "hangar" }
// plannedShips: NEW in 4.2, ships you added by hand, e.g. { id: "planned-k3f9x2", name: "Aurora ES", price: 20 }
// shipLayout:   NEW in 4.2, which chain each placed ship is in,
//         e.g. { "ship:Starfarer #1": "galaxy" }. Not in shipLayout = in the stack.
// useSpecPrices: true when the "Speculative prices*" box is ticked
// usingExampleData: NEW, true while the made-up data from example.js is loaded
// warbondPieces: NEW in 4.4, the teal ★ likely warbond pieces placed on chains, e.g.
//         { id: "wb-k3f9x2", target: "Corsair", from: "Constellation Taurus", fromMsrp: 200, chain: "galaxy" }
//         (from / fromMsrp = the ship it follows in the chain, worked out when you drop it)
// selectedChainId: NEW in 4.4, the chain whose suggested warbonds are listed (click a chain's name)
// gapFilter: NEW in 4.4, the yellow gap you clicked, e.g. { chain: "galaxy", from: 200, to: 250 }, or null
// standardPieces: NEW in 4.5, the teal ★ planned STANDARD CCUs placed on chains, e.g.
//         { id: "std-k3f9x2", from: "Constellation Taurus", to: "Hurricane", fromMsrp: 200, toMsrp: 210, chain: "galaxy" }
//         (fromMsrp / toMsrp = today's STORE prices; the store credit it costs = toMsrp − fromMsrp)
// gapShowAll: NEW in 4.5, true when "Show all" is ticked in the gap list
let ccus = [];
let layout = {};
let chains = [];
let ships = [];
let plannedShips = [];
let shipLayout = {};
let useSpecPrices = false;
let usingExampleData = false;
let warbondPieces = [];
let selectedChainId = null;
let gapFilter = null;
let standardPieces = [];
let gapShowAll = false;
// NEW in 4.7 (part 5b): saving
//   lastAutosave  - when the page last saved itself in the browser (this visit), or null
//   lastFileSave  - when you last clicked "Save to file" (remembered between visits), or null
//   storageFailed - true when the browser refused the last autosave
//   backupTipDone - true once you closed the backup tip (or saved to a file)
let lastAutosave = null;
let lastFileSave = null;
let storageFailed = false;
let backupTipDone = false;


// =====================================================================
// 1. LOADING THE CSV FILES
// =====================================================================

// Read a picked file as text, then hand the text to "whenDone"
function readFile(input, whenDone) {
  const file = input.files[0];
  if (!file) return;                       // you cancelled the dialog
  const reader = new FileReader();
  reader.onload = function () {
    whenDone(reader.result);
    input.value = "";                      // so picking the same file again still works
  };
  reader.readAsText(file);                 // reading happens in the file, stays on your PC
}

// The CCUs CSV
csvInput.addEventListener("change", function () {
  readFile(csvInput, loadCCUsText);
});

// Stage 4: the ships CSV. Stage 4.2: every ship in it becomes a starter ship piece.
shipsInput.addEventListener("change", function () {
  readFile(shipsInput, loadShipsText);
});

// Use the text of a CCUs CSV. Gives back true if it was a good file.
function loadCCUsText(text) {
  const newCCUs = rowsToCCUs(parseCSV(text));   // text -> rows -> CCU objects
  if (newCCUs.length === 0) return false;       // wrong file: keep what we had
  endExampleData();                             // NEW: a real file replaces the example data
  ccus = newCCUs;
  cleanLayout();                                // drop placements for pieces that no longer exist
  saveToStorage();
  drawAll();
  maybeShowBackupTip();                         // NEW in 4.7: first real CSV? suggest a backup file
  return true;
}

// Use the text of a ships CSV. Gives back true if it was a good file.
function loadShipsText(text) {
  const newShips = rowsToShips(parseCSV(text));
  if (newShips.length === 0) return false;
  endExampleData();                             // NEW: a real file replaces the example data
  ships = newShips;
  cleanLayout();                                // a ship that's gone leaves its row
  saveToStorage();
  drawAll();
  maybeShowBackupTip();                         // NEW in 4.7 (part 5b)
  return true;
}

// Turn CSV text into rows of values.
// CCU Game wraps text in quotes, so a comma inside quotes is not a separator.
function parseCSV(text) {
  const rows = [];
  let row = [], value = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { value += '"'; i++; } // "" = a literal quote
      else if (ch === '"') inQuotes = false;
      else value += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") { row.push(value); value = ""; }
    else if (ch === "\n") { row.push(value); rows.push(row); row = []; value = ""; }
    else if (ch !== "\r") value += ch;
  }
  if (value || row.length) { row.push(value); rows.push(row); }
  return rows;
}

// Turn rows into CCU objects we can work with.
// The first row is the header (column names). We look columns up by name,
// so it still works if CCU Game reorders its columns.
// We only copy the columns we need (so your account name is never kept or shown).
function rowsToCCUs(rows) {
  const header = rows[0] || [];
  const col = name => header.indexOf(name);
  if (col("from") < 0 || col("toMsrp") < 0) {
    alert("That doesn't look like a CCU Game CCU export. Use the CCUs CSV, not the ships one.");
    return [];
  }
  const list = [];
  const seen = {};                                   // how many copies of each upgrade so far
  for (const r of rows.slice(1)) {
    if (r.length < header.length) continue;          // skip blank lines
    const count = Number(r[col("count")]) || 1;
    // A row with count 2 means you own two copies: make one piece for each.
    for (let n = 0; n < count; n++) {
      const from = r[col("from")], to = r[col("to")];
      // A stable id, like "Cutlass Black → Cutlass Red #2". Copies get #1, #2, ...
      const key = from + " → " + to;
      seen[key] = (seen[key] || 0) + 1;
      list.push({
        id:       key + " #" + seen[key],
        from:     from,
        to:       to,
        fromMsrp: Number(r[col("fromMsrp")]),
        toMsrp:   Number(r[col("toMsrp")]),
        paid:     Number(r[col("pledge")]),
        buyback:  r[col("isBuyback")] === "true",
      });
    }
  }
  // Sort cheapest starting ship first, like reading a chain left to right
  list.sort((a, b) => a.fromMsrp - b.fromMsrp || a.toMsrp - b.toMsrp);
  return list;
}

// Stage 4: turn the ships CSV rows into ship objects.
// We keep only name, insurance, msrp, pledge (what you paid) and place
// (never the account column).
function rowsToShips(rows) {
  const header = rows[0] || [];
  const col = name => header.indexOf(name);
  if (col("name") < 0 || col("msrp") < 0 || col("from") >= 0) {
    alert("That doesn't look like a CCU Game ships export. Use the ships CSV, not the CCUs one.");
    return [];
  }
  const list = [];
  for (const r of rows.slice(1)) {
    if (r.length < header.length) continue;          // skip blank lines
    list.push({
      name:      r[col("name")],
      insurance: r[col("insurance")],
      msrp:      Number(r[col("msrp")]),
      // Stage 4.1: the "pledge" column = what you actually paid. No column = unknown (null).
      paid:      col("pledge") >= 0 && r[col("pledge")] !== "" ? Number(r[col("pledge")]) : null,
      place:     r[col("place")],
    });
  }
  list.sort((a, b) => a.msrp - b.msrp);
  return list;
}


// =====================================================================
// 1b. NEW in Stage 4.3: "TRY EXAMPLE DATA"
// example.js holds a MADE-UP hangar written like the two CCU Game CSVs. We read it
// with the very same functions as a real file (parseCSV, rowsToCCUs, rowsToShips),
// so it behaves exactly like real data. While it's loaded, an orange pill in the
// header says so. Loading a real CSV removes ALL of the example data (its ships and
// its CCUs), so made-up and real pieces never get mixed up.
// =====================================================================

// Load the example data. Asks first if you have real data loaded.
// Gives back true if it loaded.
function loadExampleData() {
  if (typeof EXAMPLE_CCUS_CSV === "undefined") {     // example.js is missing from the folder
    alert("example.js is missing. Put it in the same folder as CCU-Builder.html / index.html.");
    return false;
  }
  const hasRealData = !usingExampleData && (ccus.length > 0 || ships.length > 0);
  if (hasRealData && !confirm("Replace your loaded data with example data?")) return false;
  ccus  = rowsToCCUs(parseCSV(EXAMPLE_CCUS_CSV));
  ships = rowsToShips(parseCSV(EXAMPLE_SHIPS_CSV));
  usingExampleData = true;
  // Start from an empty layout, then put a few example pieces on the example chains.
  // { ...x } = a copy, so moving pieces later never changes EXAMPLE_LAYOUT itself.
  const oldShipLayout = shipLayout;
  layout     = { ...EXAMPLE_LAYOUT.ccus };
  shipLayout = { ...EXAMPLE_LAYOUT.ships };
  // NEW in 4.4: a few teal ★ likely warbond pieces (real past sales from warbonds.js)
  warbondPieces = (EXAMPLE_LAYOUT.warbonds || []).map(p => ({ ...p }));
  // NEW in 4.5: planned standard CCUs, if example.js has any
  standardPieces = (EXAMPLE_LAYOUT.standards || []).map(p => ({ ...p }));
  gapFilter = null;
  // Your planned ships stay on their rows (unless an example ship needs that row)
  for (const p of plannedShips) {
    if (oldShipLayout[p.id]) shipLayout[p.id] = oldShipLayout[p.id];
  }
  cleanLayout();              // skips rows you deleted and pieces that don't fit your rows
  saveToStorage();
  drawAll();
  return true;
}

// Called when a real CSV is loaded: throw away the example ships AND CCUs.
// (Nothing happens when your own data is loaded.)
function endExampleData() {
  if (!usingExampleData) return;
  ccus = [];
  ships = [];
  warbondPieces = [];      // NEW in 4.4: the example's ★ pieces were planned on example data
  standardPieces = [];     // NEW in 4.5: same for the planned standard CCUs
  // 4.4 fix: also forget where the example pieces were placed. (A real CCU can have the same
  // id as an example one, like "M2 Hercules → Ironclad #1", and must not inherit its spot.)
  // Your planned ships keep their rows.
  layout = {};
  const plannedIds = plannedShips.map(p => p.id);
  for (const id in shipLayout) {
    if (!plannedIds.includes(id)) delete shipLayout[id];
  }
  usingExampleData = false;
}

// Show the orange pill only while example data is loaded.
// "hidden" is the same as the hidden attribute in the HTML.
function drawExampleBadge() {
  exampleBadge.hidden = !usingExampleData;
}


// =====================================================================
// 2. THE RULES: where may a piece go?
// These little functions only do math. They never touch the screen,
// which makes them easy to test and easy to extend.
// =====================================================================

// Stage 4: ONE shared ruler for every row, starting at $0 (like columns in Excel).
// So the same price is at the same x on every row.
// Example: zoom 16. Price $85 -> 85 / 5 * 16 = 272 px from the left of every ruler.
function priceToX(price) {
  return price / 5 * PIXELS_PER_5_DOLLARS;
}

// How wide (in pixels) is a piece? Same formula as Stage 1.
// Math.abs = "ignore the minus sign". At speculative prices a CCU can end up going DOWN
// in price (e.g. Merchantman $975 -> Perseus $800); it still gets a visible width.
function pieceWidth(ccu) {
  return Math.abs(ccu.toMsrp - ccu.fromMsrp) / 5 * PIXELS_PER_5_DOLLARS;
}

// The cheaper and the dearer end of a piece (normally from and to, but see above)
function lowPrice(p)  { return Math.min(p.fromMsrp, p.toMsrp); }
function highPrice(p) { return Math.max(p.fromMsrp, p.toMsrp); }

// Find things by id. They give back the SHOWN version (store or speculative
// prices, see part 2c), so every rule below automatically uses the right prices.
function findChain(id) {
  const chain = chains.find(ch => ch.id === id);
  return chain ? shownChain(chain) : undefined;
}
function findCCU(id) {
  const c = ccus.find(c => c.id === id);
  return c ? shownCCU(c) : undefined;
}

// All CCUs currently placed in one chain (optionally ignoring one piece:
// the one being dragged, so it doesn't "overlap with itself").
// Stage 4.4: the teal ★ likely warbond pieces in the row are included too, so they use
// the SAME fit, overlap and name checks as your own CCUs. (They have wb: true.)
// Stage 4.5: and so are the teal ★ planned standard CCUs (they have std: true).
function piecesInChain(chainId, ignoreId) {
  const mine = ccus.filter(c => layout[c.id] === chainId && c.id !== ignoreId).map(shownCCU);
  return mine.concat(warbondPiecesInChain(chainId, ignoreId), standardPiecesInChain(chainId, ignoreId));
}

// Stage 4.5: is this a PLANNED teal piece (a likely warbond or a planned standard CCU)?
// Planned pieces are never owned: no value, no paid, and their stretch still counts as missing.
function isPlannedPiece(p) {
  return p.wb === true || p.std === true;
}

// Do two price ranges overlap? $85-90 and $90-100 only TOUCH, which is fine.
function rangesOverlap(a, b) {
  return lowPrice(a) < highPrice(b) && lowPrice(b) < highPrice(a);
}

// The heart of Stage 2: work out the ONE slot a CCU could have in a chain.
// Stage 4.2: the row runs from $0 to the end price, and a starter ship in the row
// covers $0 up to its price (so a CCU can't sit on top of the ship).
// Returns an object:
//   fits    - true if the piece's price range lies inside the row
//   overlap - true if it fits but another piece (or the ship) already uses part of it
//   left    - x position of the slot in pixels (fixed by price, you can't choose it)
//   width   - width of the slot in pixels
function slotFor(ccu, chain) {
  const fits = ccu.fromMsrp > 0                      // a CCU can never take the $0 slot
               && ccu.toMsrp <= chain.endPrice
               && ccu.toMsrp > ccu.fromMsrp;         // and it must really go UP in price
  const others = piecesInChain(chain.id, ccu.id);
  const onShip = chain.ship ? lowPrice(ccu) < chain.ship.price : false;
  const overlap = fits && (onShip || others.some(p => rangesOverlap(p, ccu)));
  return { fits: fits, overlap: overlap, left: priceToX(ccu.fromMsrp), width: pieceWidth(ccu) };
}

// May this CCU be dropped in this chain?
// (A wrong ship name does NOT block the drop. The piece is placed and flagged red
//  instead, so you can see the problem. See checkChain below.)
function canDrop(ccu, chain) {
  const slot = slotFor(ccu, chain);
  return slot.fits && !slot.overlap;
}

// NEW in Stage 4.2: the slot for a STARTER SHIP. There is only one: $0 up to its price.
// Returns:
//   fits    - the ship isn't dearer than the row's end (you can't upgrade DOWN to it)
//   taken   - another ship is already in this row (one ship per row)
//   overlap - a CCU in this row starts below the ship's price
function slotForShip(ship, chain) {
  const fits = ship.price > 0 && ship.price <= chain.endPrice;
  const other = chain.ship && chain.ship.id !== ship.id ? chain.ship : null;   // not itself
  const under = piecesInChain(chain.id).find(p => lowPrice(p) < ship.price);
  return { fits: fits, taken: fits && other !== null, takenBy: other,
           overlap: fits && under !== undefined, overlapWith: under,
           left: 0, width: priceToX(ship.price) };
}

function canDropShip(ship, chain) {
  const slot = slotForShip(ship, chain);
  return slot.fits && !slot.taken && !slot.overlap;
}

// Send everything in ONE row back to the stack (its CCUs AND its ship); other rows
// are not touched. "delete layout[id]" removes that piece's entry, and a piece with
// no entry is in the stack. Gives back how many pieces were moved.
function resetRow(chainId) {
  let moved = 0;
  for (const id in layout) {
    if (layout[id] === chainId) {
      delete layout[id];
      moved++;
    }
  }
  for (const id in shipLayout) {
    if (shipLayout[id] === chainId) {
      delete shipLayout[id];
      moved++;
    }
  }
  // Stage 4.4: ★ likely warbond pieces in the row go back to the list (off the shopping list)
  const before = warbondPieces.length;
  warbondPieces = warbondPieces.filter(p => p.chain !== chainId);
  moved += before - warbondPieces.length;
  // Stage 4.5: and the planned standard CCUs
  const beforeStd = standardPieces.length;
  standardPieces = standardPieces.filter(p => p.chain !== chainId);
  moved += beforeStd - standardPieces.length;
  return moved;
}


// =====================================================================
// 2a. STAGE 4.2: STARTER SHIPS
// Every ship in your ships CSV is an "owned" starter ship. Ships you add with
// "+ Add starter ship" are "planned". Both are pieces from $0 to their price.
// =====================================================================

// All starter ships as pieces, owned first (cheapest first), then planned ones.
// A piece looks like:
//   { id: "ship:Starfarer #1", name: "Starfarer", price: 300, paid: 250, lti: true, planned: false }
// Two ships with the same name get #1, #2 (like CCU copies).
function allShips() {
  const seen = {};
  const owned = ships.map(function (s) {
    seen[s.name] = (seen[s.name] || 0) + 1;
    return {
      id:        "ship:" + s.name + " #" + seen[s.name],
      name:      s.name,
      price:     s.msrp,                                          // today's store price (MSRP)
      paid:      typeof s.paid === "number" && isFinite(s.paid) ? s.paid : null,   // null = unknown
      lti:       String(s.insurance || "").toUpperCase() === "LTI",
      insurance: s.insurance || "",
      planned:   false,
    };
  });
  const planned = plannedShips.map(p => ({
    id: p.id, name: p.name, price: p.price, paid: 0, lti: false, insurance: "", planned: true,
  }));
  return owned.concat(planned);
}

// Find one ship piece by id (with shown prices)
function findShip(id) {
  const s = allShips().find(s => s.id === id);
  return s ? shownShip(s) : undefined;
}

// The ship placed in a chain, or null (optionally ignoring one ship id)
function shipInChain(chainId, ignoreId) {
  const s = allShips().find(s => shipLayout[s.id] === chainId && s.id !== ignoreId);
  return s ? shownShip(s) : null;
}

// Check the "Add starter ship" form. Gives back a list of problems (empty = all good).
function validatePlannedShip(d) {
  const problems = [];
  if (!d.name) problems.push("Type the ship's name.");
  if (!(typeof d.price === "number" && isFinite(d.price) && d.price > 0)) {
    problems.push("Price must be a number more than 0.");
  }
  return problems;
}

// A new unique id like "planned-k3f9x2" (same idea as makeChainId below)
function makePlannedId() {
  let id;
  do {
    id = "planned-" + Math.random().toString(36).slice(2, 8);
  } while (plannedShips.some(p => p.id === id));
  return id;
}

// Add a planned ship to the stack. Gives back the new ship.
function addPlannedShip(d) {
  const ship = { id: makePlannedId(), name: d.name, price: d.price };
  plannedShips.push(ship);
  return ship;
}

// Delete a planned ship (and take it off its row, if it was on one)
function deletePlannedShip(id) {
  plannedShips = plannedShips.filter(p => p.id !== id);
  delete shipLayout[id];
}


// =====================================================================
// 2b. STAGE 3 RULES: do the ship names link up? what is missing? totals?
// Stage 4.2: measured from $0. A starter ship in the row covers $0 -> its price.
// =====================================================================

// NEW in 4.7: a few ships have two names in the wild. The key is the cleaned-up name
// (see normalizeShip below), the value is the one name we compare with. Keep this list SHORT:
// only names that are clearly the SAME ship. (CCU Game says "Mercury", the RSI store and
// warbond sale threads say "Mercury Star Runner".)
const SHIP_ALIASES = {
  "mercury star runner": "mercury",
};

// Make two ship names comparable: "Hull-A (LTI) " and "hull a" both become "hull a".
// NEW in 4.7: a single variant letter after a model NUMBER is joined to it, so
// "G12 R", "G12-R", "G12r" and "G12R" all become "g12r" (and "G12 A" = "G12a" = "g12a",
// "325 A" = "325a"). Only after a number: "Hull A" and "Hull B" stay two different ships,
// and "Mk I" / "Mk II" are never touched. Then SHIP_ALIASES above is checked.
function normalizeShip(name) {
  const clean = String(name || "")
    .toLowerCase()               // ignore upper/lower case
    .replace(/\(lti\)/g, "")     // remove "(lti)"
    .replace(/-/g, " ")          // a hyphen counts the same as a space
    .replace(/\s+/g, " ")        // many spaces in a row -> one space
    .trim()                      // no spaces at the start or end
    // 4.7: "g12 r" -> "g12r". (\d = a digit, [a-z] = one letter, (?![a-z0-9]) = and
    // nothing else is glued to that letter, so "g12 rx" or "f7c m2" are left alone)
    .replace(/(\d) ([a-z])(?![a-z0-9])/g, "$1$2");
  return SHIP_ALIASES[clean] || clean;
}

function sameShip(a, b) {
  return normalizeShip(a) === normalizeShip(b);
}

// Walk along one row from cheap to expensive and check every piece connects.
// Returns { ship, shipNotes, checks, warnings }, where
//   ship      - the starter ship in the row (or null)
//   shipNotes - problems with the ship itself (empty list = fine)
//   checks    - a list of { ccu, notes } (notes empty = connected, all good)
//   warnings  - NEW in 4.3: orange ⚠ "speculative prices collide" notes, a list of
//               { text, piece, edge }: piece = the orange CCU (or null),
//               edge = the ship/CCU right before a step that can't exist (or null)
// Stage 4.3: a red ✗ that is only there BECAUSE of a collision (e.g. "doesn't fit"
// for the piece leading into it) is left out: the orange ⚠ already explains it.
function checkChain(chain, pieces) {
  const sorted = pieces.slice().sort((a, b) => a.fromMsrp - b.fromMsrp);
  const ship = chain.ship || null;
  const real = sorted.filter(p => !p.collides);     // pieces that really go UP in price
  const hops = collapsedHops(chain, sorted);         // steps that can't exist (part 2e)
  // Is the step from a to b one of those? (b can also be "end" = the row's end ship)
  const hopBetween = (a, b) => hops.some(h => h.a === a && h.b === b);
  // Does this ship / piece lead straight into a collision? (its next step can't exist,
  // or an orange CCU starts from the ship it ends on)
  const leadsIntoCollision = (item, endName) =>
    hops.some(h => h.a === item) || sorted.some(q => q.collides && sameShip(q.from, endName));

  // The ship itself: at speculative prices it may no longer fit, and a ship that
  // reaches the end of the row (with no CCUs) must BE the end ship.
  const shipNotes = [];
  if (ship && !leadsIntoCollision(ship, ship.name)) {
    if (ship.price > chain.endPrice) shipNotes.push(`doesn't fit at ${priceModeName()}`);
    else if (ship.price === chain.endPrice && sorted.length === 0 && !sameShip(ship.name, chain.endShip)) {
      shipNotes.push(`is ${ship.name}, needs ${chain.endShip}`);
    }
  }

  const checks = [];
  sorted.forEach(function (p) {
    const notes = [];
    const intoCollision = leadsIntoCollision(p, p.to);
    // Stage 3.1: after switching prices, a placed piece may no longer fit or may overlap.
    // We never move it; we flag it, and it's fine again when you switch back.
    // (Stage 4.3: an orange collision piece skips these checks; it has its own warning.)
    if (!p.collides) {
      if (p.toMsrp <= p.fromMsrp) {
        notes.push(`not an upgrade at ${priceModeName()} ($${p.fromMsrp} → $${p.toMsrp})`);
      } else if (p.fromMsrp <= 0 || (p.toMsrp > chain.endPrice && !intoCollision)) {
        notes.push(`doesn't fit at ${priceModeName()}`);
      }
      const overlapping = real.find(q => q !== p && rangesOverlap(p, q) && !hopBetween(p, q) && !hopBetween(q, p));
      if (overlapping) notes.push(`overlaps ${overlapping.from} → ${overlapping.to}`);
      if (ship && lowPrice(p) < ship.price && !hopBetween(ship, p)) notes.push(`overlaps the starter ship ${ship.name}`);
    }

    if (ship && p.fromMsrp === ship.price) {
      // starts right where the ship ends: must start FROM that ship
      if (!sameShip(p.from, ship.name) && !hopBetween(ship, p)) notes.push(`from ${p.from}, needs ${ship.name}`);
    } else {
      // otherwise: find the piece that ends exactly where this one starts.
      // (4.3: at speculative prices two pieces can end at the same price, e.g.
      //  Ironclad → Odyssey and Odyssey → Perseus both end at $800. Then we prefer
      //  the one whose ship name matches.)
      const enders = sorted.filter(q => q !== p && q.toMsrp === p.fromMsrp);
      const before = enders.find(q => sameShip(q.to, p.from)) || enders[0];
      if (!before) {
        if (FLAG_PIECES_AFTER_GAPS) notes.push(`nothing ends at $${p.fromMsrp}`);
      } else if (!sameShip(p.from, before.to) && !hopBetween(before, p)) {
        notes.push(`from ${p.from}, needs ${before.to}`);
      }
    }
    // a piece that reaches the end of the row must end on the row's end ship
    if (p.toMsrp === chain.endPrice && !sameShip(p.to, chain.endShip) && !intoCollision) {
      notes.push(`ends as ${p.to}, needs ${chain.endShip}`);
    }
    checks.push({ ccu: p, notes: notes });
  });

  // Stage 4.3: the orange warnings. First every CCU that can't exist at these prices...
  const warnings = [];
  for (const p of sorted) {
    if (p.collides) {
      warnings.push({ piece: p, edge: null,
        text: collisionText(p.from, p.fromMsrp, p.to, p.toMsrp, "this CCU can't exist at those prices") +
              " Its value counts as $0." });
    }
  }
  // ...then every step between two pieces (or ship → first CCU, or → the end ship)
  // that collapses to nothing or less. Nobody sells that upgrade either.
  for (const h of hops) {
    warnings.push({ piece: null, edge: h.a === "end" ? null : h.a,
      text: collisionText(h.fromName, h.fromPrice, h.toName, h.toPrice,
                          `a ${h.fromName} → ${h.toName} upgrade can't exist at those prices`) });
  }
  return { ship: ship, shipNotes: shipNotes, checks: checks, warnings: warnings };
}

// Find every price stretch from $0 to the end that nothing covers.
// Walk left to right with a "cursor" = how far we are covered so far.
// The cursor starts at $0, or at the ship's price when a ship is in the row.
// Example: row $0-$800, no ship, pieces $85-100 and $100-120 -> gaps $0-85 and $120-800.
// Stage 4.3: an orange collision piece covers nothing (it can't exist), so it's skipped.
function findGaps(chain, pieces) {
  const sorted = pieces.filter(p => !p.collides).sort((a, b) => lowPrice(a) - lowPrice(b));
  const gaps = [];
  let cursor = chain.ship ? chain.ship.price : 0;
  for (const p of sorted) {
    if (lowPrice(p) > cursor) gaps.push({ from: cursor, to: lowPrice(p) });   // hole before this piece
    cursor = Math.max(cursor, highPrice(p));
  }
  if (cursor < chain.endPrice) gaps.push({ from: cursor, to: chain.endPrice }); // hole at the end
  return gaps;
}

// Everything we need to know about one row, in one object.
// Stage 4.2:
//   value   = the placed ship's store price + (to − from) of every placed CCU
//   paid    = what you paid for the ship (pledge) + what you paid for every CCU
//   savings = value − paid
//   missing = the yellow gaps + the price of a PLANNED ship (you haven't bought it)
// If we don't know what you paid for an owned ship, we leave it out of BOTH value
// and paid (so the savings stay honest) and add the note "ship paid unknown".
// Stage 4.3: an orange collision CCU (speculative prices only) counts as $0 value
// (its to − from would be $0 or less), but what you paid for it still counts.
// A row with a ⚠ warning is never "complete".
function rowTotals(chain, pieces) {
  const check = checkChain(chain, pieces);
  // Stage 4.4: "gaps" = what you don't OWN yet (a ★ piece doesn't fill it, so it stays missing).
  // "openGaps" = what nothing covers, not even a ★ piece: those are drawn yellow.
  // (Stage 4.5: planned standard CCUs are left out too: you don't own them either.)
  const gaps  = findGaps(chain, pieces.filter(p => !isPlannedPiece(p)));
  const openGaps = findGaps(chain, pieces);
  const ship  = chain.ship || null;
  let value = 0, paid = 0, missing = 0;
  const notes = [];
  if (ship && ship.planned) {
    missing += ship.price;                                    // not bought yet = missing
    if (PLANNED_SHIP_COUNTS_AS_VALUE) value += ship.price;
  } else if (ship && ship.paid === null) {
    notes.push("ship paid unknown");
  } else if (ship) {
    value += ship.price;
    paid  += ship.paid;
  }
  let wbCash = 0, wbCount = 0;
  let stdCredit = 0, stdCount = 0;     // Stage 4.5: planned standard CCUs (store credit, estimated)
  for (const p of pieces) {
    // Stage 4.4: a teal ★ likely warbond is NOT owned: no value, no paid. Its cash (at the
    // last-seen warbond price) is counted on its own, and its stretch stays "missing".
    if (p.wb) {
      wbCash += p.cost || 0;
      wbCount++;
      continue;
    }
    // Stage 4.5: a teal ★ planned STANDARD CCU isn't owned either. Its estimated store credit
    // (the store price difference) is counted on its own, separate from the warbond cash.
    if (p.std) {
      stdCredit += p.cost || 0;
      stdCount++;
      continue;
    }
    value += p.collides ? 0 : p.toMsrp - p.fromMsrp;
    paid  += p.paid;
  }
  for (const g of gaps) missing += g.to - g.from;
  const flagged = check.checks.filter(c => c.notes.length > 0).length + (check.shipNotes.length > 0 ? 1 : 0);
  const warnings = check.warnings.length;                     // orange ⚠ (spec prices only)
  const complete = missing === 0 && flagged === 0 && warnings === 0;
  return { check: check, gaps: gaps, openGaps: openGaps, wbCash: wbCash, wbCount: wbCount,
           stdCredit: stdCredit, stdCount: stdCount,
           value: value, paid: paid, savings: value - paid,
           missing: missing, flagged: flagged, warnings: warnings, complete: complete,
           planned: !!(ship && ship.planned),
           notes: notes, partial: notes.length > 0 };   // partial = some costs unknown
}

// Add up all rows, for the header
function allTotals() {
  const t = { value: 0, paid: 0, missing: 0, flagged: 0, specWarnings: 0, partialRows: 0, wbCash: 0, wbCount: 0,
              stdCredit: 0, stdCount: 0 };
  // These counts used to be shown in the summary sentence. Keep them as small,
  // separately labeled boxes so each count is easy to scan and updates live.
  t.ccus = ccus.length;
  t.hangar = ccus.filter(c => !c.buyback).length;
  t.buyback = ccus.length - t.hangar;
  t.onChains = ccus.filter(c => layout[c.id]).length;
  const allShipsNow = allShips();
  t.shipsPlaced = allShipsNow.filter(s => shipLayout[s.id]).length;
  t.shipsTotal = allShipsNow.length;
  for (const chain of chains.map(shownChain)) {
    const r = rowTotals(chain, piecesInChain(chain.id));
    t.value += r.value; t.paid += r.paid; t.missing += r.missing; t.flagged += r.flagged;
    t.specWarnings += r.warnings;                                 // Stage 4.3
    t.wbCash += r.wbCash; t.wbCount += r.wbCount;                 // Stage 4.4: ★ pieces, not owned
    t.stdCredit += r.stdCredit; t.stdCount += r.stdCount;         // Stage 4.5: planned standard CCUs
    if (r.partial) t.partialRows++;                               // rows with unknown costs
  }
  t.savings = t.value - t.paid;                                   // what it's all worth minus what you paid
  t.savingsPct = t.value > 0 ? Math.round(t.savings / t.value * 100) : 0;
  t.inStack = ccus.filter(c => !layout[c.id]).length;             // CCUs not placed yet
  t.shipsInStack = allShips().filter(s => !shipLayout[s.id]).length;   // ships not placed yet
  return t;
}


// =====================================================================
// 2c. STAGE 3.1: SPECULATIVE PRICES
// Your saved data always keeps the REAL prices. When the box is ticked we make a
// "shown" copy of each piece and row where concept ships (listed in prices.js)
// use their community median price instead. The layout only remembers which ROW
// a piece is in, never its price, so switching back and forth never loses anything.
// =====================================================================

// Look a ship up in prices.js. Gives { store, spec } or null if it's not listed.
// Stage 4.5: the answers are remembered in specCache (a Map: ship name -> answer), because
// the gap planning list asks about the same ships thousands of times. prices.js never changes
// while the page is open, so the remembered answer stays right.
const specCache = new Map();
function specEntry(ship) {
  const key = String(ship);
  if (specCache.has(key)) return specCache.get(key);
  let found = null;
  for (const name in SPEC_PRICES) {
    if (sameShip(name, ship)) { found = SPEC_PRICES[name]; break; }
  }
  specCache.set(key, found);
  return found;
}

// Is this ship's price being replaced right now?
function usesSpec(ship) {
  return useSpecPrices && specEntry(ship) !== null;
}

// The price to SHOW for a ship: its spec price when the box is ticked and the ship
// is in prices.js, otherwise the real price we were given.
function shownPrice(ship, realPrice) {
  return usesSpec(ship) ? specEntry(ship).spec : realPrice;
}

// A copy of a CCU with shown prices. spec = true if either end uses a spec price.
// ({ ...c } means "a copy of c with all its fields", then we overwrite a few.)
// Stage 4.3 adds:
//   storeFrom, storeTo - the REAL (store) prices, kept for the collision check
//   collides - true when speculative prices make this CCU go DOWN or stay level in price
//              (e.g. Odyssey $800* -> Perseus $800). RSI never sells such a CCU, so it
//              gets an orange ⚠ warning (part 2e). A CCU is always an upgrade at store
//              prices, so this can only happen with the box ticked.
function shownCCU(c) {
  const from = shownPrice(c.from, c.fromMsrp);
  const to   = shownPrice(c.to, c.toMsrp);
  return { ...c,
    fromMsrp:  from,
    toMsrp:    to,
    storeFrom: c.fromMsrp,
    storeTo:   c.toMsrp,
    spec:      usesSpec(c.from) || usesSpec(c.to),
    collides:  useSpecPrices && from >= to && c.fromMsrp < c.toMsrp };
}

// NEW in 4.2: a copy of a starter ship with its shown price
// (4.3: storePrice = its real price, for the collision check)
function shownShip(s) {
  return { ...s, price: shownPrice(s.name, s.price), storePrice: s.price, spec: usesSpec(s.name) };
}

// A copy of a chain row with shown prices. Stage 4.2: it also carries the
// starter ship placed in it (or null), so every rule can see it as chain.ship.
// (4.3: storeEndPrice = the real end price, for the collision check)
function shownChain(chain) {
  return { ...chain,
    endPrice:      shownPrice(chain.endShip, chain.endPrice),
    storeEndPrice: chain.endPrice,
    ship:          shipInChain(chain.id) };
}

function priceModeName() {
  return useSpecPrices ? "speculative prices" : "store prices";
}

// "$5" or, for a negative number, "−$175"
function money(n) {
  return n < 0 ? "−$" + (-n) : "$" + n;
}

// A ship's price as text, with a * when it is a speculative price. Example: "$975*"
function priceText(ship, price) {
  return "$" + price + (usesSpec(ship) ? "*" : "");
}

// "Avenger Titan → G12 ($60–$65*)"
function rangeText(c) {
  return `${c.from} → ${c.to} (${priceText(c.from, c.fromMsrp)}–${priceText(c.to, c.toMsrp)})`;
}


// =====================================================================
// 2e. NEW in Stage 4.3: SPECULATIVE PRICE COLLISIONS
// RSI only sells a CCU that goes UP in price. With "Speculative prices*" ticked, a
// concept ship's guessed price can land at or above the next ship's price, e.g.
// Odyssey $800* -> Perseus $800, or Merchantman $975* -> Perseus $800. Such a step
// "collapses": at those prices it would be worth $0 or less, so it can't exist.
// We never hide it: it's drawn orange with a ⚠ and a note under the ruler.
// =====================================================================

// "Odyssey*" for a ship using a speculative price, plain "Perseus" otherwise
function specName(ship) {
  return ship + (usesSpec(ship) ? "*" : "");
}

// The orange note, e.g.
// "⚠ Speculative prices collide: Odyssey* $800 ≥ Perseus $800, so this CCU can't exist at those prices."
function collisionText(fromShip, fromPrice, toShip, toPrice, soWhat) {
  return `⚠ Speculative prices collide: ${specName(fromShip)} $${fromPrice} ≥ ` +
         `${specName(toShip)} $${toPrice}, so ${soWhat}.`;
}

// Find the steps in a row that collapse at speculative prices. A "step" is where the
// row needs an upgrade you haven't placed yet: between the ship and the first CCU,
// between two CCUs whose ship names differ, or from the last one to the end ship.
// We walk the row in STORE-price order (the order you planned it in). A step collapses
// when it goes up at store prices but not at the shown (speculative) prices.
// Gives back a list of { a, b, fromName, fromPrice, toName, toPrice }, where a and b are
// the ship / pieces on either side ("end" = the row's end ship).
function collapsedHops(chain, pieces) {
  if (!useSpecPrices) return [];            // store prices always go up: nothing to check
  const steps = [];
  if (chain.ship) {
    steps.push({ item: chain.ship, endName: chain.ship.name,
                 endShown: chain.ship.price, endStore: chain.ship.storePrice });
  }
  const byStore = pieces.slice().sort((a, b) => a.storeFrom - b.storeFrom || a.storeTo - b.storeTo);
  for (const p of byStore) {
    steps.push({ item: p, startName: p.from, startShown: p.fromMsrp, startStore: p.storeFrom,
                 endName: p.to, endShown: p.toMsrp, endStore: p.storeTo });
  }
  steps.push({ item: "end", startName: chain.endShip, startShown: chain.endPrice, startStore: chain.storeEndPrice });

  const hops = [];
  for (let i = 1; i < steps.length; i++) {
    const a = steps[i - 1], b = steps[i];
    if (sameShip(a.endName, b.startName)) continue;          // same ship: no upgrade needed here
    if (a.endStore < b.startStore && a.endShown >= b.startShown) {
      hops.push({ a: a.item, b: b.item, fromName: a.endName, fromPrice: a.endShown,
                  toName: b.startName, toPrice: b.startShown });
    }
  }
  return hops;
}

// Where to draw an orange collision piece that sits in a row. Its speculative width is
// $0 or less, so we use its STORE-price spot and width when nothing else is there.
// If that spot is taken, it gets a small MIN_WARNING_WIDTH piece at its speculative
// from-price instead. Gives back { left, width, atStore }.
function collisionSpot(ccu, chain, pieces) {
  const atStore = { fromMsrp: ccu.storeFrom, toMsrp: ccu.storeTo };
  const taken = (chain.ship && ccu.storeFrom < chain.ship.price) ||
                pieces.some(p => p.id !== ccu.id && !p.collides && rangesOverlap(p, atStore));
  if (!taken) {
    return { left: priceToX(ccu.storeFrom), width: priceToX(ccu.storeTo - ccu.storeFrom), atStore: true };
  }
  return { left: priceToX(ccu.fromMsrp), width: MIN_WARNING_WIDTH, atStore: false };
}


// =====================================================================
// 2f. NEW in 4.7: YOUR CSV PRICES WIN
// prices.js and warbonds.js are snapshots: they can be out of date. Your CCU Game export
// knows today's price of every ship in it (fromMsrp / toMsrp in the CCUs CSV, msrp in the
// ships CSV). So once a CSV is loaded, ITS price is the store price of that ship, and
// prices.js / warbonds.js only fill in ships your export never mentions.
// (The "Speculative prices*" box still swaps in the community guess from prices.js, as before.)
// =====================================================================

// The price list from your loaded CSVs: a Map from cleaned-up ship name to price.
// We remember it (csvPriceCache) until a new CSV is loaded. Loading a CSV puts a NEW list
// in "ccus" or "ships", so "is it still the same list?" tells us when to build it again.
let csvPriceCache = null;
function csvPriceMap() {
  if (csvPriceCache && csvPriceCache.ccus === ccus && csvPriceCache.ships === ships) return csvPriceCache.map;
  const map = new Map();
  const add = function (name, price) {
    const key = normalizeShip(name);
    if (key && isNumber(price) && price > 0 && !map.has(key)) map.set(key, price);   // first one found wins
  };
  for (const c of ccus) { add(c.to, c.toMsrp); add(c.from, c.fromMsrp); }   // the CCUs CSV first
  for (const s of ships) add(s.name, s.msrp);                               // then the ships CSV
  csvPriceCache = { ccus: ccus, ships: ships, map: map };
  return map;
}

// A ship's price in your loaded CSVs, or null if your export doesn't mention it
function csvPrice(ship) {
  const price = csvPriceMap().get(normalizeShip(ship));
  return price === undefined ? null : price;
}

// Today's store price of a ship: your CSV's price when it has one, otherwise the price the
// data file lists (listed = prices.js "store" or warbonds.js "now"). Example: prices.js says
// G12a $65, your export says $80 -> $80.
function storeNow(ship, listed) {
  const mine = csvPrice(ship);
  return mine !== null ? mine : listed;
}

// Where a ship's store price comes from, in words (for hover texts)
function csvSourceName() {
  return usingExampleData ? "the example data" : "your CCU Game CSV";
}
// (later in 4.7: CCU Game lets you type your OWN speculative price for a ship, and that price
//  is what its export contains. So the hover text for a CSV price says so.)
const CCU_GAME_SPEC_NOTE = "if you set a speculative price in CCU Game, that's the one used";
function priceSourceText(ship, fileName) {
  if (csvPrice(ship) === null) return fileName;
  return usingExampleData ? csvSourceName() : `${csvSourceName()} (${CCU_GAME_SPEC_NOTE})`;
}
// Which data file a ship's store price comes from when your CSV doesn't have it
function storeFileName(ship) {
  const entry = specEntry(ship);
  return entry && entry.store !== null ? "prices.js" : "warbonds.js";
}


// =====================================================================
// 2d. STAGE 4: MANAGING CHAINS (add, edit, delete, reorder)
// These change the "chains" list only. The buttons in part 6 call them,
// then save and redraw.
// =====================================================================

// A copy of the example chains from chains.js (no ships placed: you choose)
function exampleChains() {
  return CHAINS.map(ch => ({ ...ch }));
}

// A new unique id like "chain-k3f9x2". Math.random() gives a random number;
// toString(36) writes it with letters and digits; slice(2, 8) keeps 6 of them.
function makeChainId() {
  let id;
  do {
    id = "chain-" + Math.random().toString(36).slice(2, 8);
  } while (chains.some(ch => ch.id === id));     // try again in the (tiny) chance it's taken
  return id;
}

// Check the form data. Gives back a list of problems (empty list = all good).
// Stage 4.2: only name, end ship and end price are left.
function validateChain(d) {
  const problems = [];
  if (!d.name) problems.push("Give the chain a name (or an end ship).");
  if (!d.endShip) problems.push("Type the end ship.");
  if (!(typeof d.endPrice === "number" && isFinite(d.endPrice) && d.endPrice > 0)) {
    problems.push("End ship price must be a number more than 0.");
  }
  return problems;
}

// Add a chain at the bottom. Gives back the new chain (with its new id).
function addChain(d) {
  const chain = { id: makeChainId(), ...d };
  chains.push(chain);
  return chain;
}

// Change an existing chain. The id stays the same, so its pieces stay with it.
function updateChain(id, d) {
  const chain = chains.find(ch => ch.id === id);
  if (chain) Object.assign(chain, d);     // copy every field of d onto the chain
  return chain;
}

// Delete a chain and send its pieces (and ship) back to the stack.
// Gives back how many pieces moved.
function deleteChain(id) {
  const moved = resetRow(id);
  chains = chains.filter(ch => ch.id !== id);
  return moved;
}

// Move a chain up (step -1) or down (step +1) by swapping it with its neighbour
function moveChain(id, step) {
  const i = chains.findIndex(ch => ch.id === id);
  const j = i + step;
  if (i < 0 || j < 0 || j >= chains.length) return false;   // already at the top/bottom
  const temp = chains[i];
  chains[i] = chains[j];
  chains[j] = temp;
  return true;
}

// Do we know a price for this ship? Looks in: your CCUs, then your ships CSV,
// then prices.js (store price). Gives back a number, or null if nobody knows.
// (We never guess a price.)
function knownPrice(ship) {
  if (!ship) return null;
  const mine = csvPrice(ship);              // 4.7: the same CSV price list as everywhere (part 2f)
  if (mine !== null) return mine;
  const entry = specEntry(ship);
  if (entry && entry.store !== null) return entry.store;
  return null;
}

// Stage 2/3 saved the layout by chain NAME ("Perseus"); Stage 4 uses chain ids.
// Turn an old layout into the new kind. Entries that already use an id are kept.
function migrateLayout(oldLayout) {
  const result = {};
  for (const ccuId in oldLayout) {
    const value = oldLayout[ccuId];
    const byId   = chains.find(ch => ch.id === value);
    const byName = chains.find(ch => ch.name === value);
    if (byId) result[ccuId] = byId.id;
    else if (byName) result[ccuId] = byName.id;
  }
  return result;
}

// NEW in 4.2: a chain saved by Stage 4 / 4.1 had startShip, startPrice, startPaid,
// currentShip and currentPrice. Those are gone: we keep only id, name, endShip and
// endPrice. (Its placed CCUs are checked again by cleanLayout(); any that no longer
// fit go back to the stack.)
function migrateChain(chain) {
  return {
    id:       chain.id || makeChainId(),
    name:     String(chain.name || chain.endShip || "Chain"),
    endShip:  String(chain.endShip || ""),
    endPrice: Number(chain.endPrice),
  };
}


// =====================================================================
// 3. DRAWING: turn the state into things on screen
// =====================================================================

function drawAll() {
  drawShips();
  drawStack();
  drawChains();
  drawTotals();
  drawExampleBadge();         // NEW: the orange "Example data" pill
  drawWarbonds();             // NEW in 4.4: the "Suggested warbonds ★" section (part 11)
  drawShoppingList();         // NEW in 4.4: the 🛒 button and the shopping list pop-up
}

// Build ONE CCU piece element. showNames = true for pieces sitting in a chain row.
// Stage 4.3: a CCU that "collides" at speculative prices (part 2e) is orange with a ⚠,
// counts as $0, and keeps its STORE-price width so you can still see and grab it.
function makePiece(ccu, showNames) {
  const value = ccu.collides ? 0 : ccu.toMsrp - ccu.fromMsrp;   // upgrade value in $
  const piece = document.createElement("div");
  piece.className = "piece " + (ccu.buyback ? "buyback" : "owned") + (ccu.collides ? " collision" : "");
  piece.style.width = (ccu.collides ? priceToX(ccu.storeTo - ccu.storeFrom) : pieceWidth(ccu)) + "px";
  // Text as well as color, so you can tell hangar and buyback apart without color
  let text = (ccu.collides ? "⚠ " : "") + money(value) + (ccu.spec ? "*" : "") + (ccu.buyback ? " BB" : "");
  if (showNames) text += " " + ccu.from + " → " + ccu.to;
  piece.textContent = text;
  piece.title = `${rangeText(ccu)} · ` +
                `${ccu.buyback ? "in buyback" : "in hangar"} · paid $${ccu.paid}` +   // hover text
                (ccu.collides ? " · ⚠ speculative prices collide: can't exist at these prices, counts as $0" : "");
  piece.dataset.id = ccu.id;                          // remember which CCU this is
  piece.dataset.kind = "ccu";                         // Stage 4.2: a CCU, not a ship
  piece.addEventListener("pointerdown", startDrag);  // see part 4
  return piece;
}

// NEW in Stage 4.2: build ONE starter ship piece ($0 up to its price).
// Gray for owned ships (4.3; it was violet); dashed outline and the word "planned" for planned ones.
// notes = list of problems (drawn red with a ✗, like CCU pieces).
function makeShipPiece(ship, notes) {
  const piece = document.createElement("div");
  piece.className = "piece ship" + (ship.planned ? " planned" : "");
  piece.style.width = priceToX(ship.price) + "px";
  const flagged = notes && notes.length > 0;
  if (flagged) piece.classList.add("flagged");
  const text = (flagged ? "✗ " : "") + (ship.planned ? "planned · " : "") +
               ship.name + " " + priceText(ship.name, ship.price);
  piece.appendChild(makeSpan("piece-text", text));
  if (ship.lti) piece.appendChild(makeSpan("lti-tag", "LTI"));   // small LTI tag
  piece.title = `${ship.name} · starter ship $0–${priceText(ship.name, ship.price)} · ` +
                (ship.planned ? "planned: not paid, counts as missing"
                              : (ship.paid === null ? "paid unknown" : "paid $" + ship.paid)) +
                (ship.lti ? " · LTI" : ship.insurance ? " · insurance " + ship.insurance : "") +
                (flagged ? " · ✗ " + notes.join(" · ✗ ") : "");
  piece.dataset.id = ship.id;
  piece.dataset.kind = "ship";
  piece.addEventListener("pointerdown", startDrag);
  return piece;
}

// The name of the chain a ship is on, or "" when it's in the stack
function shipRowName(shipId) {
  const chain = chains.find(ch => ch.id === shipLayout[shipId]);
  return chain ? chain.name : "";
}

// Stage 4: the "Your ships" list. Stage 4.2: planned ships are listed too (with a
// small ✕ to delete them). Ships on a chain get a small ● (hover the line to see which row).
// Every line has the same 5 columns: name, price, paid, badge, ✕ (style.css .ship-line).
function drawShips() {
  shipsList.innerHTML = "";
  const all = allShips();
  shipsCount.textContent = all.length;
  if (all.length === 0) shipsList.textContent = "Load your ships CSV (or add a planned ship) to see them here.";
  for (const s of all) {
    const line = document.createElement("div");
    line.className = "ship-line" + (s.planned ? " planned-line" : "");
    line.appendChild(makeSpan("ship-name", s.name));
    line.appendChild(makeSpan("ship-price", "$" + s.price));
    // what you paid (from the pledge column), when we know it
    let paidText = "";
    if (s.planned) paidText = "not paid";
    else if (s.paid !== null) paidText = "paid $" + s.paid;
    line.appendChild(makeSpan("ship-paid", paidText));
    if (s.lti) line.appendChild(makeSpan("lti-badge", "LTI"));
    else if (s.planned) line.appendChild(makeSpan("planned-badge", "planned"));
    else line.appendChild(makeSpan("ship-ins", s.insurance));
    if (s.planned) line.appendChild(makeDeletePlannedButton(s, "✕"));
    else line.appendChild(makeSpan("ship-action", ""));       // empty 5th column
    // Hover a line to see where the ship is
    const where = shipRowName(s.id);
    line.title = s.name + (s.lti ? " (LTI)" : s.insurance ? " (insurance: " + s.insurance + ")" : "") +
                 (where ? " · on the " + where + " row" : " · in the stack");
    if (where) line.classList.add("on-chain");
    shipsList.appendChild(line);
  }
}

// The small "Delete" button for a planned ship. It asks first, like the other buttons.
// text = what the button says ("Delete", or just "✕" where space is tight)
function makeDeletePlannedButton(ship, text) {
  return makeSmallButton(text, "Delete this planned ship", false, function () {
    const where = shipRowName(ship.id);
    const question = `Are you sure? This will delete the planned ship ${ship.name} ($${ship.price})` +
                     (where ? ` and take it off the ${where} row` : "") +
                     `. Your other ships won't change.`;
    if (!confirm(question)) return;
    deletePlannedShip(ship.id); saveToStorage(); drawAll();
  });
}

// The stack: every piece that is NOT placed in a chain.
// Stage 4.2: two groups, "Starter ships" first, then "CCUs".
function drawStack() {
  stack.innerHTML = "";                                // clear any old pieces

  // ---- Starter ships ----
  const all = allShips();
  const looseShips = all.filter(s => !shipLayout[s.id]).map(shownShip);
  stack.appendChild(makeSpan("group-title", `Starter ships (${looseShips.length} here, ` +
                                            `${all.length - looseShips.length} on chains)`));
  if (all.length === 0) stack.appendChild(makeSpan("group-note", "Load your ships CSV or click \"+ Add starter ship\"."));
  else if (looseShips.length === 0) stack.appendChild(makeSpan("group-note", "All starter ships are on chains."));
  for (const s of looseShips) {
    const row = document.createElement("div");
    row.className = "row";
    const label = document.createElement("span");
    label.className = "label";
    label.textContent = `${s.name} · ${priceText(s.name, s.price)} · ` +
      (s.planned ? "planned (not paid, counts as missing) "
                 : (s.paid === null ? "paid unknown" : "paid $" + s.paid) + (s.lti ? " · LTI" : ""));
    if (s.planned) label.appendChild(makeDeletePlannedButton(s, "Delete"));
    row.appendChild(makeShipPiece(s, []));
    row.appendChild(label);
    stack.appendChild(row);
  }

  // ---- CCUs ----
  const loose = ccus.filter(c => !layout[c.id]).map(shownCCU);   // shown prices (part 2c)
  stack.appendChild(makeSpan("group-title", `CCUs (${loose.length} here, ${ccus.length - loose.length} on chains)`));
  if (ccus.length === 0) stack.appendChild(makeSpan("group-note", "Load your CCU Game CSV to get pieces."));
  else if (loose.length === 0) stack.appendChild(makeSpan("group-note", "All pieces are on chains."));
  for (const c of loose) {
    // Each line in the stack = a "row" holding the piece plus a text label.
    // The label sits OUTSIDE the piece so the piece's length stays true to its price.
    const row = document.createElement("div");
    row.className = "row";

    const label = document.createElement("span");
    label.className = "label";
    label.textContent = `${rangeText(c)} · ` + (c.buyback ? "in buyback" : "in hangar") +
                        (c.collides ? " · ⚠ can't exist at speculative prices" : "");

    row.appendChild(makePiece(c, false));
    row.appendChild(label);
    stack.appendChild(row);
  }
}

// Where the shared ruler ends: the most expensive end price of all rows
// (in the current price mode), rounded up to the next $50, at least $100.
function axisEnd() {
  let max = 100;
  for (const chain of chains.map(shownChain)) {
    max = Math.max(max, chain.endPrice, chain.ship ? chain.ship.price : 0);
  }
  return Math.ceil(max / 50) * 50;
}

// The chains: a price header on top, then one row per chain
function drawChains() {
  chainsBox.innerHTML = "";
  const end = axisEnd();
  const width = priceToX(end);
  chainsBox.appendChild(makeAxisHeader(end, width));
  if (chains.length === 0) {
    chainsBox.appendChild(makeSpan("empty-note", "No chains yet. Click \"+ Add chain\" to make one."));
  }
  chains.forEach(function (realChain, index) {
    const chain = shownChain(realChain);           // shown prices (part 2c) + its ship
    const pieces = piecesInChain(chain.id);
    const info = rowTotals(chain, pieces);         // Stage 3: checks, gaps and totals for this row

    // The whole row = pinned label on the left + ruler on the right.
    // data-chain remembers the chain's id, so a drop knows where it landed.
    const row = document.createElement("div");
    row.className = "chain-row" + (info.complete ? " complete" : "");
    // Stage 4.4: the chain whose warbonds are listed in "Suggested warbonds ★" (left column) is highlighted
    if (currentChainId() === chain.id) row.classList.add("selected");
    row.dataset.chain = chain.id;
    row.appendChild(makeChainLabel(chain, pieces, info, index));

    // The ruler: the same width on every row, from $0 to the axis end
    const area = document.createElement("div");
    area.className = "ruler-area";
    const ruler = document.createElement("div");
    ruler.className = "ruler";
    ruler.style.width = width + "px";

    // Faint line every $5, a stronger one every $50 (the $ labels are in the header)
    for (let price = 0; price <= end; price += 5) {
      const tick = document.createElement("div");
      tick.className = "tick" + (price % 50 === 0 ? " major" : "");
      tick.style.left = priceToX(price) + "px";
      ruler.appendChild(tick);
    }

    // Past the end of this chain: darker, with a line where the chain ends
    if (chain.endPrice < end) {
      ruler.appendChild(makeBlock("beyond", chain.endPrice, end, ""));
    }

    // Stage 3: yellow "missing" blocks for every uncovered stretch
    // (Stage 4.4: a stretch under a teal ★ piece isn't drawn yellow, but still counts as missing.
    //  Click a yellow block to list the warbonds that fit it in "Suggested warbonds ★".)
    for (const g of info.openGaps) ruler.appendChild(makeGap(g, chain));

    const flagList = document.createElement("div");
    flagList.className = "flag-list";

    // Stage 4.3: the ship / pieces right BEFORE a step that collapses at speculative
    // prices get an orange outline (the ⚠ note under the ruler says why)
    const edges = info.check.warnings.filter(w => w.edge).map(w => w.edge);

    // Stage 4.2: the starter ship, always at $0
    if (chain.ship) {
      const shipPiece = makeShipPiece(chain.ship, info.check.shipNotes);
      shipPiece.classList.add("placed");
      shipPiece.style.left = "0px";
      if (edges.includes(chain.ship)) shipPiece.classList.add("collision-edge");
      ruler.appendChild(shipPiece);
      for (const note of info.check.shipNotes) {
        flagList.appendChild(makeSpan("flag-note", `✗ ${chain.ship.name} (starter ship): ${note}`));
      }
    }

    // CCUs placed in this chain, each at the x its price says.
    // Pieces with problems are drawn red with a ✗, and their notes listed under the ruler.
    for (const c of info.check.checks) {
      // Stage 4.4: a ★ likely warbond gets its own teal look (makeWarbondPiece, part 11)
      // Stage 4.5: so does a ★ planned standard CCU (makeStandardPiece, part 12)
      let piece;
      if (c.ccu.wb) piece = makeWarbondPiece(c.ccu, true);
      else if (c.ccu.std) piece = makeStandardPiece(c.ccu, true);
      else piece = makePiece(c.ccu, true);
      piece.classList.add("placed");
      piece.style.left = priceToX(lowPrice(c.ccu)) + "px";
      if (c.ccu.collides) {
        // Stage 4.3: orange piece at its store-price spot (or a small one, see collisionSpot)
        const spot = collisionSpot(c.ccu, chain, pieces);
        piece.style.left  = spot.left + "px";
        piece.style.width = spot.width + "px";
      }
      if (edges.includes(c.ccu)) piece.classList.add("collision-edge");
      if (c.notes.length > 0) {
        piece.classList.add("flagged");
        // Put "✗ " in front of the text. (4.5: insertBefore adds it as the first bit of text
        // without wiping out the small "WB" badge inside a warbond piece.)
        piece.insertBefore(document.createTextNode("✗ "), piece.firstChild);
        piece.title += " · ✗ " + c.notes.join(" · ✗ ");
        for (const note of c.notes) {
          flagList.appendChild(makeSpan("flag-note", `✗ ${rangeText(c.ccu)}: ${note}`));
        }
      }
      ruler.appendChild(piece);
    }

    // Stage 4.3: the orange ⚠ notes (speculative prices only), after the red ones
    for (const w of info.check.warnings) flagList.appendChild(makeSpan("flag-note warn-note", w.text));

    area.appendChild(ruler);
    if (flagList.children.length > 0) area.appendChild(flagList);
    row.appendChild(area);
    chainsBox.appendChild(row);
  });
}

// The price header: "$0 $50 $100 ..." above the rulers. It stays at the top
// while you scroll down (position: sticky in style.css).
function makeAxisHeader(end, width) {
  const header = document.createElement("div");
  header.className = "axis-header";
  header.appendChild(makeSpan("axis-corner", "Chain · price →"));
  const labels = document.createElement("div");
  labels.className = "axis-labels";
  labels.style.width = width + "px";
  for (let price = 0; price <= end; price += 50) {
    const label = makeSpan("axis-label", "$" + price);
    label.style.left = priceToX(price) + "px";
    labels.appendChild(label);
  }
  header.appendChild(labels);
  return header;
}

// The pinned label on the left of a row: name, ships and prices, badge, totals, buttons
function makeChainLabel(chain, pieces, info, index) {
  const label = document.createElement("div");
  label.className = "chain-label";

  const title = document.createElement("strong");
  title.textContent = chain.name;
  label.appendChild(title);

  // Stage 4.2: "ship: Starfarer $300 → Galaxy $380", or "no starter ship yet → Galaxy $380"
  const ship = chain.ship;
  let text = ship
    ? `ship: ${ship.name} ${priceText(ship.name, ship.price)}${ship.planned ? " (planned)" : ""} → `
    : "no starter ship yet → ";
  text += `${chain.endShip} ${priceText(chain.endShip, chain.endPrice)}`;
  // Concept end ship (listed in prices.js): at store prices, also show the community's
  // expected price after release, marked with *
  const expected = specEntry(chain.endShip);
  // (skipped when the expected price equals today's price, e.g. a released ship like the Carrack)
  if (expected && expected.spec !== expected.store && !useSpecPrices) text += ` · expected after release $${expected.spec}*`;
  label.appendChild(makeSpan("chain-details", text));

  // NEW in 4.7: a small tag when the starter ship has no LTI (a CCU keeps that ship's insurance)
  const insurance = starterInsuranceFlag(ship);
  if (insurance) {
    const tag = makeSpan("ins-flag", insurance.text);
    tag.title = insurance.why;
    label.appendChild(tag);
  }

  // Status badge, like the chain map
  const status = document.createElement("div");
  status.className = "status-line";
  if (info.complete) {
    status.appendChild(makeSpan("badge", "✓ CHAIN COMPLETE"));
  } else {
    if (info.missing > 0) status.appendChild(makeSpan("badge missing", `$${info.missing} missing`));
    if (info.flagged > 0) status.appendChild(makeSpan("badge flag", `✗ ${info.flagged} flagged`));
    // Stage 4.3: orange badge for speculative price collisions
    if (info.warnings > 0) {
      status.appendChild(makeSpan("badge spec-warn", `⚠ ${info.warnings} spec warning${info.warnings === 1 ? "" : "s"}`));
    }
  }
  // Row totals on the same line as the badge.
  // "value $110 · paid $65 · savings $45". "(partial)" = some costs unknown.
  let totals = `value ${money(info.value)} · paid $${info.paid}${info.partial ? " (partial)" : ""}` +
               ` · savings ${money(info.savings)}`;
  if (!info.complete) totals += ` · missing $${info.missing}`;
  status.appendChild(makeSpan("row-totals", totals));
  label.appendChild(status);
  // Why it's partial, e.g. "ship paid unknown"
  if (info.partial) label.appendChild(makeSpan("paid-note", "ⓘ " + info.notes.join(" · ")));
  // A planned ship: say that its price is in "missing"
  if (info.planned) {
    label.appendChild(makeSpan("paid-note", `ⓘ planned ${ship.name} $${ship.price} counted as missing (not paid)`));
  }
  // Stage 4.4: teal ★ likely warbond pieces: not owned, their cash is shown on its own
  if (info.wbCount > 0) {
    label.appendChild(makeSpan("paid-note wb-note", `★ ${info.wbCount} suggested warbond${info.wbCount === 1 ? "" : "s"}: ` +
      `~$${info.wbCash} cash at last-seen WB (not owned, still counted as missing)`));
  }
  // Stage 4.5: teal ★ planned standard CCUs: paid with store credit, estimated
  if (info.stdCount > 0) {
    label.appendChild(makeSpan("paid-note wb-note std-note", `★ ${info.stdCount} planned standard CCU${info.stdCount === 1 ? "" : "s"}: ` +
      `~$${info.stdCredit} store credit, estimated (not owned, still counted as missing)`));
  }
  // Stage 4.4: click a chain's name (not its buttons) to list its warbonds in "Suggested warbonds ★"
  label.title = "Click to show suggested warbonds ★ for this chain (left column, below your CCUs)";
  label.addEventListener("click", function (event) {
    if (event.target.closest("button")) return;     // the ↑ ↓ Edit ... buttons do their own thing
    selectChain(chain.id);
  });

  // Buttons: ↑ ↓ Edit Delete Reset row
  const shipPart = ship ? ` and the ${ship.name}` : "";
  const buttons = document.createElement("div");
  buttons.className = "row-buttons";
  buttons.appendChild(makeSmallButton("↑", "Move this chain up", index === 0, function () {
    moveChain(chain.id, -1); saveToStorage(); drawAll();
  }));
  buttons.appendChild(makeSmallButton("↓", "Move this chain down", index === chains.length - 1, function () {
    moveChain(chain.id, +1); saveToStorage(); drawAll();
  }));
  buttons.appendChild(makeSmallButton("Edit", "Change this chain", false, function () {
    openChainForm(chain.id);
  }));
  buttons.appendChild(makeSmallButton("Delete", "Delete this chain", false, function () {
    const question = `Are you sure? This will delete the ${chain.name} chain and send its ` +
                     `${pieces.length} pieces${shipPart} back to the stack. Your other chains won't change.`;
    if (!confirm(question)) return;
    deleteChain(chain.id); saveToStorage(); drawAll();
  }));
  // Stage 4.2: every row has room for pieces now (it starts empty at $0), so every
  // row gets "Reset row". Greyed out when there is nothing on it.
  buttons.appendChild(makeSmallButton("Reset row", "Send this row's pieces and ship back to the stack",
    pieces.length === 0 && !ship, function () {
      const question = `Are you sure? This will send all ${pieces.length} pieces${shipPart} in the ` +
                       `${chain.name} row back to the stack. Your other chains won't change.`;
      if (!confirm(question)) return;
      resetRow(chain.id); saveToStorage(); drawAll();   // redraw = totals recomputed too
    }));
  label.appendChild(buttons);
  return label;
}

// NEW in 4.7: insurance comes from the chain's STARTER ship. A CCU never changes it: upgrade
// a 6-month Aurora all the way to a Perseus and the Perseus has 6 months too. So a chain
// whose owned starter ship isn't LTI gets a small tag. Gives back { text, why } or null:
//   - no ship yet, a planned ship (you haven't picked the real one yet) or an LTI ship: null
//   - an owned ship with other insurance: "no LTI · 6 Months"
//   - an owned ship whose CSV row has no insurance: "insurance unknown"
function starterInsuranceFlag(ship) {
  if (!ship || ship.planned || ship.lti) return null;
  const ins = String(ship.insurance || "").trim();
  const why = "Insurance carries over from the starter ship: a CCU never changes it. ";
  if (!ins) {
    return { text: "insurance unknown", why: why + `Your ships CSV doesn't say what insurance ${ship.name} has.` };
  }
  // CCU Game writes months as a plain number ("120"), or as words ("6 Months")
  const nice = /^\d+$/.test(ins) ? ins + " months" : ins;
  return { text: "no LTI · " + nice,
           why: why + `${ship.name} has ${nice} insurance, so the ship at the end of this chain will too (not LTI).` };
}

// A small button. "disabled" greys it out (e.g. ↑ on the top row, Reset row on an empty row).
function makeSmallButton(text, hoverText, disabled, onClick) {
  const button = document.createElement("button");
  button.className = "small-button";
  button.textContent = text;
  button.title = hoverText;
  button.disabled = disabled;
  button.addEventListener("click", onClick);
  return button;
}

// Small helper: make a <span> with a class and some text
function makeSpan(className, text) {
  const span = document.createElement("span");
  span.className = className;
  span.textContent = text;
  return span;
}

// A block on the ruler from one price to another (Stage 4.2: only "past the end" is left)
function makeBlock(className, fromPrice, toPrice, text) {
  const block = document.createElement("div");
  block.className = "block " + className;
  block.style.left = priceToX(fromPrice) + "px";
  block.style.width = priceToX(toPrice) - priceToX(fromPrice) + "px";
  block.textContent = text;
  block.title = text ? `${text} ($${fromPrice}–$${toPrice})` : "";
  return block;
}

// One yellow "missing" block. Short blocks can't fit the whole text, so we
// show less text the narrower it is (hover to read it all).
// Stage 4.4: chain = the row it's in. Clicking the block lists the warbonds that fit it ("Suggested warbonds ★").
function makeGap(g, chain) {
  const gap = document.createElement("div");
  gap.className = "gap";
  if (chain) {
    if (gapFilter && gapFilter.chain === chain.id && gapFilter.from === g.from && gapFilter.to === g.to) {
      gap.classList.add("selected");                 // the gap the list is filtered to
    }
    gap.addEventListener("click", function () { setGapFilter(chain.id, g); });
  }
  const width = priceToX(g.to) - priceToX(g.from);
  gap.style.left = priceToX(g.from) + "px";
  gap.style.width = width + "px";
  const fullText = `missing $${g.from}–$${g.to} (+$${g.to - g.from})`;
  gap.title = fullText;
  if (width >= 150)     gap.textContent = fullText;
  else if (width >= 80) gap.textContent = `missing +$${g.to - g.from}`;
  else if (width >= 30) gap.textContent = `+$${g.to - g.from}`;
  return gap;
}

function drawTotals() {
  // Totals across all rows, plus the live inventory counts from the old summary line.
  const t = allTotals();
  totalsBar.innerHTML = "";
  const boxes = [
    ["Totals",             useSpecPrices ? "at speculative prices*" : "at store prices",
                           useSpecPrices ? "* community consensus (median), not official" : "real store / CCU Game prices"],
    ["Value",              money(t.value), "placed starter ships' store price (when you know what you paid) + to − from price of every placed CCU" +
                           (PLANNED_SHIP_COUNTS_AS_VALUE ? " (planned ships included)" : " (planned ships not included)")],
    ["Paid" + (t.partialRows ? " (partial)" : ""), "$" + t.paid,
                           "what you paid: placed owned ships (CSV pledge) + placed CCUs (CSV pledge)" +
                           (t.partialRows ? `. ${t.partialRows} rows have unknown costs, left out of value AND paid` : "")],
    ["Savings",            money(t.savings) + " (" + t.savingsPct + "%)", "value − paid"],
    ["Missing",            "$" + t.missing, "yellow gaps in all rows (measured from $0) + prices of planned ships" +
                           " (a stretch under a teal ★ suggested warbond still counts: you don't own it yet)"],
    // Stage 4.4: the teal ★ pieces are never owned. Their estimated cash is shown on its own.
    ["Planned at last-seen WB", "$" + t.wbCash, `cash needed for the ${t.wbCount} teal ★ suggested warbond pieces on your chains, ` +
                           "at the last-seen warbond prices. Not in value, paid or savings. Always double-check on RSI."],
    // Stage 4.5: planned STANDARD CCUs are paid with store credit, so they get their own box
    ["Planned credit (est.)", "$" + t.stdCredit, `store credit for the ${t.stdCount} teal ★ planned standard CCUs on your chains, ` +
                           "estimated as the difference between today's store prices (CIG doesn't sell every pair). " +
                           "Not in value, paid or savings."],
    ["Flagged",            String(t.flagged), "red pieces: names don't link up, or they don't fit / overlap"],
  ];
  // Stage 4.3: with speculative prices ticked, one more box after "Flagged": the orange
  // ⚠ warnings. They are NOT added to "Flagged" (red = a mistake in your chain; orange =
  // the guessed prices contradict each other, which isn't your mistake).
  if (useSpecPrices) {
    boxes.push(["Spec warnings", String(t.specWarnings),
      "orange ⚠: at speculative prices a CCU (or a step you still need) would go DOWN or stay level " +
      "in price. RSI never sells that, so it can't exist. Such a CCU counts as $0 value."]);
  }
  // These replace the old combined "In stack" box. Each item is its own small,
  // readable count, and every one is recomputed whenever the page redraws.
  boxes.push(
    ["CCUs",        String(t.ccus),       "all loaded CCUs"],
    ["In hangar",   String(t.hangar),     "loaded CCUs not marked buyback"],
    ["In buyback",  String(t.buyback),    "loaded CCUs marked buyback"],
    ["On chains",   String(t.onChains),   "CCUs placed on a chain"],
    ["Ships placed", t.shipsPlaced + "/" + t.shipsTotal, "starter ships placed on a chain"]
  );
  // Each item in boxes is a list of 3 things; this line unpacks them into 3 names
  for (const [name, value, help] of boxes) {
    const box = document.createElement("div");
    box.className = "total";
    box.title = help;                                   // hover to see what it means
    box.appendChild(makeSpan("total-name", name));
    box.appendChild(makeSpan("total-value", value));
    totalsBar.appendChild(box);
  }
}


// =====================================================================
// 4. DRAGGING with Pointer Events
// pointerdown = button pressed on a piece -> start dragging
// pointermove = mouse moved               -> move the piece with it
// pointerup   = button released           -> drop (snap into a slot, or back to the stack)
// Stage 4.2: the piece can be a CCU or a starter ship (piece.dataset.kind says which).
// =====================================================================

let drag = null;   // info about the drag in progress, or null when not dragging

function startDrag(event) {
  if (event.button !== 0) return;          // left mouse button only
  event.preventDefault();                  // stop the browser selecting text
  const piece = event.currentTarget;
  const kind = piece.dataset.kind;         // "ccu", "ship" or (4.4) "wb" = a ★ likely warbond
  let item;
  if (kind === "ship") item = findShip(piece.dataset.id);
  else if (kind === "wb") item = { id: piece.dataset.id || null, target: piece.dataset.target };   // id null = from the list
  else if (kind === "std") item = standardDragItem(piece);   // 4.5: a ★ planned standard CCU (part 12)
  else item = findCCU(piece.dataset.id);
  const box = piece.getBoundingClientRect();

  // Make a copy ("ghost") that floats above the page and follows the mouse.
  // The original stays put, faded, so you can see where it came from.
  const ghost = piece.cloneNode(true);
  ghost.classList.add("ghost");
  ghost.style.width = box.width + "px";
  document.body.appendChild(ghost);
  piece.classList.add("drag-source");

  drag = {
    kind: kind,
    item: item,
    ghost: ghost,
    // where inside the piece you grabbed it, so it doesn't jump to the mouse tip
    grabX: event.clientX - box.left,
    grabY: event.clientY - box.top,
  };
  moveGhost(event);
  showSlots(kind, item);

  // Listen on the whole document, so we still hear the mouse if it leaves the piece
  document.addEventListener("pointermove", onDragMove);
  document.addEventListener("pointerup", onDragEnd);
  document.addEventListener("pointercancel", onDragCancel);
}

function moveGhost(event) {
  drag.ghost.style.left = (event.clientX - drag.grabX) + "px";
  drag.ghost.style.top  = (event.clientY - drag.grabY) + "px";
}

function onDragMove(event) {
  moveGhost(event);
  // Mark the row under the mouse, so its slot lights up more
  const hovered = rowUnderPointer(event);
  for (const row of chainsBox.querySelectorAll(".chain-row")) {
    row.classList.toggle("hover", row === hovered);
  }
  autoScroll(event);
}

function onDragEnd(event) {
  const row = rowUnderPointer(event);
  const chain = row ? findChain(row.dataset.chain) : null;
  const id = drag.item.id;
  if (drag.kind === "ship") {
    // A ship snaps into the row's $0 slot. shipLayout has ONE entry per ship, so
    // moving it to a new row automatically takes it off the old one.
    if (chain && canDropShip(drag.item, chain)) shipLayout[id] = chain.id;
    else delete shipLayout[id];            // anywhere else: back to the stack
  } else if (drag.kind === "wb") {
    // Stage 4.4: a ★ likely warbond starts from the ship it follows in that row (worked out now)
    const slot = chain ? slotForWarbond(drag.item.target, chain, id) : null;
    if (slot && canDropWarbond(slot)) placeWarbond(drag.item.target, chain.id, slot, id);
    else if (id) removeWarbondPiece(id);   // dropped anywhere else: off the chain (and the shopping list)
  } else if (drag.kind === "std") {
    // Stage 4.5: a ★ planned standard CCU goes where its prices say, with the SAME canDrop() as a CCU
    if (chain && canDrop(standardShownCCU(drag.item), chain)) placeStandard(drag.item, chain.id);
    else if (id) removeStandardPiece(id);  // dropped anywhere else: off the chain (and the shopping list)
  } else {
    if (chain && canDrop(drag.item, chain)) layout[id] = chain.id;   // snap (x comes from its price)
    else delete layout[id];                // anywhere else: back to the stack
  }
  finishDrag();
}

function onDragCancel() {                  // e.g. the window lost focus: change nothing
  finishDrag();
}

function finishDrag() {
  document.removeEventListener("pointermove", onDragMove);
  document.removeEventListener("pointerup", onDragEnd);
  document.removeEventListener("pointercancel", onDragCancel);
  drag.ghost.remove();
  drag = null;
  saveToStorage();
  drawAll();                               // redraw from the state (also clears the slots)
}

// Which chain row is under the mouse? elementFromPoint finds the element at that
// spot (the ghost is ignored thanks to "pointer-events: none" in style.css),
// then closest() walks up to the row that contains it.
function rowUnderPointer(event) {
  const el = document.elementFromPoint(event.clientX, event.clientY);
  return el ? el.closest(".chain-row") : null;
}

// While dragging: draw the target slot in every row where the piece fits.
// A CCU's slot is fixed by its prices; a ship's slot is always $0 -> its price.
function showSlots(kind, item) {
  for (const row of chainsBox.querySelectorAll(".chain-row")) {
    const chain = findChain(row.dataset.chain);
    let slot, okText, badText = null;
    if (kind === "ship") {
      slot = slotForShip(item, chain);
      okText = `✓ $0 slot ($0–$${item.price})`;
      if (slot.taken) badText = `✗ row has ${slot.takenBy.name}`;
      else if (slot.overlap) badText = "✗ overlap";
    } else if (kind === "wb") {
      // Stage 4.4: a ★ likely warbond: its start is the ship it would follow in this row
      slot = slotForWarbond(item.target, chain, item.id);
      okText = `✓ ~$${slot.cost} cash from ${slot.from}`;
      if (slot.fits && !slot.possible) badText = `✗ not possible from ${slot.from} ($${slot.fromMsrp} > WB $${slot.entry.wb})`;
      else if (slot.overlap) badText = "✗ overlap";
    } else if (kind === "std") {
      // Stage 4.5: a ★ planned standard CCU: fixed by its prices, exactly like your own CCUs
      const ccu = standardShownCCU(item);
      slot = slotFor(ccu, chain);
      okText = `✓ ~$${ccu.cost} store credit (est.) $${ccu.fromMsrp}–$${ccu.toMsrp}`;
      if (slot.overlap) badText = "✗ overlap";
    } else {
      slot = slotFor(item, chain);
      okText = `✓ fits $${item.fromMsrp}–$${item.toMsrp}`;
      if (slot.overlap) badText = "✗ overlap";
    }
    if (!slot.fits) continue;              // price range outside this chain: no slot
    const box = document.createElement("div");
    box.className = "slot" + (badText ? " overlap" : "");
    box.style.left = slot.left + "px";
    box.style.width = slot.width + "px";
    const text = document.createElement("span");
    text.className = "slot-text";
    text.textContent = badText || okText;
    box.appendChild(text);
    row.querySelector(".ruler").appendChild(box);
  }
}

// If you drag near the edge of the chains area, scroll it so you can reach far slots.
// (The left edge of the ruler area is just right of the pinned label column.)
function autoScroll(event) {
  const box = chainsBox.getBoundingClientRect();
  const edge = 40, step = 20;
  const rulerLeft = box.left + LABEL_WIDTH;
  if (event.clientY < box.top || event.clientY > box.bottom) return;
  // 4.7 fix: only when the mouse is over the chains area itself. The suggested warbonds now sit
  // low in the left column, and grabbing a ★ there used to scroll the chains away under you.
  if (event.clientX < box.left || event.clientX > box.right) return;
  if (event.clientX > box.right - edge && event.clientX < box.right) chainsBox.scrollLeft += step;
  if (event.clientX < rulerLeft + edge && event.clientX > rulerLeft) chainsBox.scrollLeft -= step;
  if (event.clientY > box.bottom - edge) chainsBox.scrollTop += step;
  if (event.clientY < box.top + edge) chainsBox.scrollTop -= step;
}


// =====================================================================
// 5. SAVING AND RESTORING (localStorage = a small storage box in your browser)
// It only holds text, so we turn our lists into text with JSON.stringify
// and back into lists with JSON.parse.
// =====================================================================

function saveToStorage() {
  try {
    localStorage.setItem(SAVE_CCUS, JSON.stringify(ccus));
    localStorage.setItem(SAVE_LAYOUT, JSON.stringify(layout));
    localStorage.setItem(SAVE_ZOOM, String(PIXELS_PER_5_DOLLARS));
    localStorage.setItem(SAVE_SPEC, useSpecPrices ? "yes" : "no");
    localStorage.setItem(SAVE_SHIPS, JSON.stringify(ships));
    localStorage.setItem(SAVE_CHAINS, JSON.stringify(chains));
    localStorage.setItem(SAVE_PLANNED, JSON.stringify(plannedShips));
    localStorage.setItem(SAVE_SHIP_LAYOUT, JSON.stringify(shipLayout));
    localStorage.setItem(SAVE_EXAMPLE, usingExampleData ? "yes" : "no");
    localStorage.setItem(SAVE_WARBONDS, JSON.stringify(warbondPieces));   // NEW in 4.4
    localStorage.setItem(SAVE_STANDARD, JSON.stringify(standardPieces));  // NEW in 4.5
    lastAutosave = new Date();              // NEW in 4.7: for the "Autosaved 4:52 PM" stamp
    storageFailed = false;
  } catch (e) {
    console.warn("Could not save:", e);     // storage blocked or full; the page still works
    storageFailed = true;                   // NEW in 4.7: ...but now you SEE it (part 5b)
  }
  drawSaveStatus();
}

// Read one saved item and turn it back from text (null if nothing is saved)
function readSaved(key) {
  return JSON.parse(localStorage.getItem(key));
}

function loadFromStorage() {
  try {
    ccus  = readSaved(SAVE_CCUS)  || [];
    ships = readSaved(SAVE_SHIPS) || [];
    // Planned ships: keep only ones with an id, a name and a positive price
    plannedShips = (readSaved(SAVE_PLANNED) || []).filter(p => p && p.id && validatePlannedShip(p).length === 0);
    shipLayout = readSaved(SAVE_SHIP_LAYOUT) || {};
    // Chains: Stage 4.2's own list, or else Stage 4/4.1's list converted (start fields
    // dropped), or else (first time) the examples from chains.js.
    // An EMPTY saved list is kept empty: that means you cleared them on purpose.
    const saved42  = readSaved(SAVE_CHAINS);
    const savedOld = readSaved(SAVE_CHAINS_OLD);
    if (Array.isArray(saved42))       chains = saved42.map(migrateChain);
    else if (Array.isArray(savedOld)) chains = savedOld.map(migrateChain);
    else                              chains = exampleChains();
    // Layout: Stage 4.2's, else Stage 4's (by id), else Stage 2/3's (by chain name)
    const saved = readSaved(SAVE_LAYOUT) || readSaved(SAVE_LAYOUT_V4) || readSaved(SAVE_LAYOUT_OLD) || {};
    layout = migrateLayout(saved);
    const zoom = Number(localStorage.getItem(SAVE_ZOOM));
    if (zoom >= 8 && zoom <= 30) PIXELS_PER_5_DOLLARS = zoom;
    useSpecPrices = localStorage.getItem(SAVE_SPEC) === "yes";
    usingExampleData = localStorage.getItem(SAVE_EXAMPLE) === "yes";
    // NEW in 4.4: the ★ likely warbond pieces (only well-formed ones; cleanLayout checks the rest)
    warbondPieces = (readSaved(SAVE_WARBONDS) || []).filter(isWarbondPiece);
    // NEW in 4.5: the planned standard CCUs (a browser used by Stage 4.4 has none saved yet: [])
    standardPieces = (readSaved(SAVE_STANDARD) || []).filter(isStandardPiece);
  } catch (e) {
    // saved data was broken: start fresh
    ccus = []; layout = {}; ships = []; plannedShips = []; shipLayout = {}; chains = exampleChains();
    usingExampleData = false;
    warbondPieces = [];
    standardPieces = [];
  }
  cleanLayout();
}

// Re-check every saved placement with the rules. Anything that no longer
// makes sense (piece gone, chain deleted, doesn't fit) goes back to the stack.
// Ships first (one per row, must fit the row), then CCUs one at a time, so
// overlaps (with each other or with the ship) are caught too.
// A piece is kept if it is fine at store prices OR at speculative prices,
// so a layout made in either mode survives. (Problems in the other mode
// are shown as red flags instead.)
function cleanLayout() {
  const oldLayout = layout, oldShips = shipLayout, oldWarbonds = warbondPieces, oldStandards = standardPieces;
  const savedMode = useSpecPrices;       // remember the switch, we flip it below
  // Is test() true at store prices OR at speculative prices?
  const okEitherWay = function (test) {
    useSpecPrices = false; const atStore = test();
    useSpecPrices = true;  const atSpec  = test();
    return atStore || atSpec;
  };
  layout = {};
  shipLayout = {};
  warbondPieces = [];                    // 4.4: your own CCUs are checked first, ★ pieces last
  standardPieces = [];                   // 4.5: planned standard CCUs come very last
  for (const s of allShips()) {
    const chainId = oldShips[s.id];
    if (!chainId || !chains.some(ch => ch.id === chainId)) continue;   // not placed, or unknown chain
    if (okEitherWay(() => canDropShip(findShip(s.id), findChain(chainId)))) shipLayout[s.id] = chainId;
  }
  for (const c of ccus) {
    const chainId = oldLayout[c.id];
    if (!chainId || !chains.some(ch => ch.id === chainId)) continue;   // unknown chain
    if (okEitherWay(() => canDrop(findCCU(c.id), findChain(chainId)))) layout[c.id] = chainId;
  }
  // Stage 4.4: a ★ likely warbond stays if its target is still in warbonds.js, its row exists,
  // it fits without overlapping, and its start ship isn't dearer than the old warbond price.
  for (const p of oldWarbonds) {
    const entry = findWarbond(p.target);
    if (!entry || !chains.some(ch => ch.id === p.chain)) continue;
    if (warbondCost(entry, p.fromMsrp) === null) continue;
    if (okEitherWay(() => canDrop(shownCCU(warbondCCU(p)), findChain(p.chain)))) warbondPieces.push(p);
  }
  // Stage 4.5: a planned standard CCU stays if its row exists and it fits without overlapping
  // (the same canDrop() as your own CCUs).
  for (const p of oldStandards) {
    if (!chains.some(ch => ch.id === p.chain)) continue;
    if (okEitherWay(() => canDrop(standardShownCCU(p), findChain(p.chain)))) standardPieces.push(p);
  }
  useSpecPrices = savedMode;             // put the switch back how it was
}


// =====================================================================
// 5b. NEW in 4.7: SEE WHETHER YOUR WORK IS SAVED
// The page saves itself in the browser (localStorage) after every change. Some browsers
// block or wipe that for pages opened from a file. So next to "Save to file" we show:
//   - when it last saved ("Autosaved 4:52 PM · Saved to file 2026-10-01 9:15 PM")
//   - a small orange warning if the browser refused to save
//   - the first time you load a real CSV: a one-time tip to click "Save to file" as a backup
// =====================================================================

// A time as "4:52 PM" when it's today, or "2026-10-01 9:15 PM" when it's an older day
function stampTime(d, now) {
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return dateText(d) === dateText(now) ? time : dateText(d) + " " + time;
}

// The "last saved" text (a pure function, easy to test)
function saveStampText(autoTime, fileTime, now) {
  const parts = [];
  if (autoTime) parts.push("Autosaved " + stampTime(autoTime, now));
  parts.push(fileTime ? "Saved to file " + stampTime(fileTime, now) : "Not saved to a file yet");
  return parts.join(" · ");
}

// Show the stamp and (only when saving failed) the warning
function drawSaveStatus() {
  saveStatus.textContent = saveStampText(lastAutosave, lastFileSave, new Date());
  saveWarning.hidden = !storageFailed;
}

// On start-up: does the browser let us save at all? (Try a tiny test value.)
// Also read when you last saved to a file, and whether the backup tip was closed.
function checkStorage() {
  try {
    localStorage.setItem("ccuBuilder.test", "1");
    localStorage.removeItem("ccuBuilder.test");
    const saved = localStorage.getItem(SAVE_LAST_FILE);
    const when = saved ? new Date(saved) : null;
    lastFileSave = when && !isNaN(when.getTime()) ? when : null;    // ignore a broken date
    backupTipDone = localStorage.getItem(SAVE_BACKUP_TIP) === "yes";
    storageFailed = false;
  } catch (e) {
    storageFailed = true;
  }
}

// Remember one small value. Storage blocked? Then it's only remembered until you close the page.
function rememberSetting(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn("Could not save:", e);
  }
}

// "Save to file" was clicked: remember when, and the backup tip isn't needed any more
function noteFileSaved(when) {
  lastFileSave = when;
  rememberSetting(SAVE_LAST_FILE, when.toISOString());
  closeBackupTip();
  drawSaveStatus();
}

// After loading a REAL CSV (not the example data): show the tip once, unless you already
// closed it or have saved to a file before
function maybeShowBackupTip() {
  if (backupTipDone || lastFileSave) return false;
  backupTip.hidden = false;
  return true;
}

function closeBackupTip() {
  backupTipDone = true;
  rememberSetting(SAVE_BACKUP_TIP, "yes");
  backupTip.hidden = true;
}

backupTipSave.addEventListener("click", function () {
  saveFileButton.click();                    // the same as clicking "Save to file" (part 8)
});
backupTipClose.addEventListener("click", closeBackupTip);


// =====================================================================
// 6. HEADER CONTROLS AND CHAIN BUTTONS
// =====================================================================

// "input" fires continuously while you slide, so the page redraws live
zoomSlider.addEventListener("input", function () {
  PIXELS_PER_5_DOLLARS = Number(zoomSlider.value);
  zoomValue.textContent = PIXELS_PER_5_DOLLARS + " px per $5";
  saveToStorage();
  drawAll();
});

// The "Speculative prices*" box. Only the prices we SHOW change;
// the layout stays the same, so un-ticking it gives you exactly what you had.
specToggle.addEventListener("change", function () {
  useSpecPrices = specToggle.checked;
  saveToStorage();
  drawAll();
});

resetButton.addEventListener("click", function () {
  const placed = Object.keys(layout).length;          // how many CCUs are on chains
  const placedShips = Object.keys(shipLayout).length; // and how many ships
  const planned = warbondPieces.length + standardPieces.length;     // 4.5: both kinds of teal ★ piece
  const wbText = planned > 0 ? ` (and take ${planned} teal ★ planned pieces off)` : "";
  if (!confirm(`Are you sure? This will send all ${placed} placed pieces and ${placedShips} ` +
               `starter ships on every chain back to the stack${wbText}.`)) return;
  layout = {};
  shipLayout = {};
  warbondPieces = [];
  standardPieces = [];
  saveToStorage();
  drawAll();
});

addChainButton.addEventListener("click", function () {
  openChainForm(null);                                // null = a new chain
});

exampleChainsButton.addEventListener("click", function () {
  if (!confirm("Are you sure? This will replace all your chains with the example chains from " +
               "chains.js. All starter ships go back to the stack, and pieces on chains that " +
               "no longer exist go back too.")) return;
  chains = exampleChains();
  shipLayout = {};                                    // examples come WITHOUT ships: you choose
  cleanLayout();
  saveToStorage();
  drawAll();
});

// NEW: "Try example data" (part 1b)
exampleDataButton.addEventListener("click", loadExampleData);

clearChainsButton.addEventListener("click", function () {
  const placed = Object.keys(layout).length;
  const placedShips = Object.keys(shipLayout).length;
  if (!confirm(`Are you sure? This will delete all ${chains.length} chains and send their ` +
               `${placed} pieces and ${placedShips} starter ships back to the stack.`)) return;
  chains = [];
  layout = {};
  shipLayout = {};
  warbondPieces = [];
  standardPieces = [];
  saveToStorage();
  drawAll();
});


// =====================================================================
// 7. THE ADD / EDIT CHAIN FORM
// =====================================================================

let editingId = null;   // id of the chain being edited, or null when adding a new one

// Open the form. chainId = null for "Add chain", or the id of the chain to edit.
function openChainForm(chainId) {
  editingId = chainId;
  const chain = chainId ? chains.find(ch => ch.id === chainId) : null;   // REAL prices, not shown ones
  formTitle.textContent = chain ? "Edit chain: " + chain.name : "Add chain";
  fillShipNameSuggestions();
  fName.value     = chain ? chain.name : "";
  fEndShip.value  = chain ? chain.endShip : "";
  fEndPrice.value = chain ? chain.endPrice : "";
  delete fEndPrice.dataset.autoFilled;    // 4.3: nothing filled in by us yet (see autoFillPrice)
  showSpecHint();
  formErrors.innerHTML = "";
  chainDialog.showModal();                // show the pop-up
  fName.focus();
}

// Suggestions for the typed ship names: every ship in your CCUs, ships CSV and planned ships.
// Stage 4.3: plus every ship in prices.js and every end ship of your chains, so a friend
// who has no Arrastra CCU can still pick "Arrastra" as a goal.
function fillShipNameSuggestions() {
  // A Map keeps each ship only once. The key is the cleaned-up name (normalizeShip),
  // so "G12a" and "G12A" count as one; the first spelling found is the one shown.
  // Your own CSVs come first, so their spelling wins.
  const names = new Map();
  const add = function (name) {
    const key = normalizeShip(name);
    if (key && !names.has(key)) names.set(key, String(name).trim());
  };
  for (const c of ccus) { add(c.from); add(c.to); }
  for (const s of ships) add(s.name);
  for (const p of plannedShips) add(p.name);
  for (const ch of chains) add(ch.endShip);
  for (const name in SPEC_PRICES) add(name);        // NEW in 4.3: the ships in prices.js
  shipNames.innerHTML = "";
  // localeCompare = alphabetical order the way people expect (upper/lower case mixed)
  for (const name of [...names.values()].sort((a, b) => a.localeCompare(b))) {
    const option = document.createElement("option");
    option.value = name;
    shipNames.appendChild(option);
  }
}

// Concept end ship (in prices.js)? Say what the "Speculative prices*" box will use.
// The price box itself always holds today's store price.
function showSpecHint() {
  const entry = specEntry(fEndShip.value);
  fSpecHint.textContent = entry
    ? `${fEndShip.value.trim()} is a concept ship: with "Speculative prices*" ticked this row ends at $${entry.spec}* (prices.js).`
    : "";
}

// Stage 4.3: fill a price box from a ship name, but never overwrite a price you typed.
// It fills the box when the box is empty, OR when it still holds the price WE put
// there a moment ago (so picking Galaxy, then changing your mind to Arrastra, updates
// it). knownPrice() looks in your CCUs, your ships CSV, then prices.js (store price).
// The box stays a normal box: you can always change the number.
// Gives back true when it filled the box.
function autoFillPrice(nameBox, priceBox) {
  const price = knownPrice(nameBox.value.trim());
  if (price === null) return false;                          // we don't know this ship
  const untouched = priceBox.value === "" || priceBox.value === priceBox.dataset.autoFilled;
  if (!untouched) return false;                              // you typed your own price
  priceBox.value = price;
  priceBox.dataset.autoFilled = String(price);               // remember we filled it
  return true;
}

// Auto-fill the end price when an end ship is typed or picked from the suggestions.
// "input" fires on every key and when you pick a suggestion; "change" when you leave the box.
function onEndShipTyped() {
  autoFillPrice(fEndShip, fEndPrice);
  showSpecHint();
}
fEndShip.addEventListener("input", onEndShipTyped);
fEndShip.addEventListener("change", onEndShipTyped);

// Turn a text box into a number. An empty box gives NaN ("not a number").
function toNumber(text) {
  return String(text).trim() === "" ? NaN : Number(text);
}

// Read the form into a chain-shaped object
function readChainForm() {
  return {
    name:     fName.value.trim() || fEndShip.value.trim(),   // empty name = end ship's name
    endShip:  fEndShip.value.trim(),
    endPrice: toNumber(fEndPrice.value),
  };
}

chainForm.addEventListener("submit", function (event) {
  event.preventDefault();                 // don't reload the page (a form's default)
  const d = readChainForm();
  const problems = validateChain(d);
  formErrors.innerHTML = "";
  if (problems.length > 0) {              // show what's wrong and keep the form open
    for (const p of problems) formErrors.appendChild(makeSpan("form-error", "✗ " + p));
    return;
  }
  if (editingId) updateChain(editingId, d);
  else addChain(d);
  cleanLayout();                          // pieces (or a ship) that no longer fit an edited chain go back
  saveToStorage();
  chainDialog.close();
  drawAll();
});

formCancel.addEventListener("click", function () {
  chainDialog.close();
});


// =====================================================================
// 7b. NEW in Stage 4.2: THE "ADD STARTER SHIP" FORM (planned ships)
// =====================================================================

addShipButton.addEventListener("click", function () {
  fillShipNameSuggestions();
  sName.value = "";
  sPrice.value = "";
  delete sPrice.dataset.autoFilled;       // 4.3: nothing filled in by us yet
  shipErrors.innerHTML = "";
  shipDialog.showModal();
  sName.focus();
});

// Typed a ship we know? Fill in its price if the box is empty (you can change it).
// Same rules as the chain form (autoFillPrice, part 7).
sName.addEventListener("input",  function () { autoFillPrice(sName, sPrice); });
sName.addEventListener("change", function () { autoFillPrice(sName, sPrice); });

shipForm.addEventListener("submit", function (event) {
  event.preventDefault();
  const d = { name: sName.value.trim(), price: toNumber(sPrice.value) };
  const problems = validatePlannedShip(d);
  shipErrors.innerHTML = "";
  if (problems.length > 0) {              // show what's wrong and keep the form open
    for (const p of problems) shipErrors.appendChild(makeSpan("form-error", "✗ " + p));
    return;
  }
  addPlannedShip(d);                      // it appears in the stack, ready to drag
  saveToStorage();
  shipDialog.close();
  drawAll();
});

shipCancel.addEventListener("click", function () {
  shipDialog.close();
});


// =====================================================================
// 8. NEW in Stage 4.3: SAVE TO FILE / LOAD FROM FILE
// "Save to file" downloads everything as one .json file: your chains, where every
// ship and CCU sits, planned ships, the switches, AND the CCU + ships data from your
// CSVs, so a friend can open the file without your CSVs. Never your account name.
// "Load from file" reads such a file back. Nothing leaves your computer.
// =====================================================================

// Copy only the listed fields of an object (a "whitelist"). Anything not on the list,
// like an account column, is simply never copied.
function pick(obj, fields) {
  const out = {};
  for (const f of fields) out[f] = obj[f];
  return out;
}
const CHAIN_FIELDS   = ["id", "name", "endShip", "endPrice"];
const CCU_FIELDS     = ["id", "from", "to", "fromMsrp", "toMsrp", "paid", "buyback"];
const SHIP_FIELDS    = ["name", "insurance", "msrp", "paid", "place"];
const PLANNED_FIELDS = ["id", "name", "price"];
const WARBOND_FIELDS = ["id", "target", "from", "fromMsrp", "chain"];   // NEW in 4.4
const STANDARD_FIELDS = ["id", "from", "to", "fromMsrp", "toMsrp", "chain"];   // NEW in 4.5

// A date as "2026-09-29" (your computer's date, not UTC)
function dateText(d) {
  const two = n => String(n).padStart(2, "0");   // 9 -> "09"
  return d.getFullYear() + "-" + two(d.getMonth() + 1) + "-" + two(d.getDate());
}

function saveFileName(d) {
  return "my-ccu-chains-" + dateText(d) + ".json";
}

// Everything that goes in the file, as one object. The ORDER of the chains list is
// the order of your rows.
function buildSaveData(d) {
  return {
    app:           SAVE_FILE_APP,        // so we can tell our files from any other .json
    version:       SAVE_FILE_VERSION,
    savedOn:       dateText(d),
    chains:        chains.map(ch => pick(ch, CHAIN_FIELDS)),
    layout:        { ...layout },        // which CCU is in which chain
    shipLayout:    { ...shipLayout },    // which starter ship is in which chain
    plannedShips:  plannedShips.map(p => pick(p, PLANNED_FIELDS)),
    useSpecPrices: useSpecPrices,
    zoom:          PIXELS_PER_5_DOLLARS,
    ccus:          ccus.map(c => pick(c, CCU_FIELDS)),
    ships:         ships.map(s => pick(s, SHIP_FIELDS)),
    // NEW in 4.4 (at the end, so older files without it still load: see checkSaveText)
    warbondPieces: warbondPieces.map(p => pick(p, WARBOND_FIELDS)),
    // NEW in 4.5 (also at the end and optional, so Stage 4.3 / 4.4 files still load). The file
    // version stays 1: nothing old changed, there's just one more list.
    standardPieces: standardPieces.map(p => pick(p, STANDARD_FIELDS)),
  };
}

// Hand a text file to the browser as a download. A Blob is a "file in memory";
// URL.createObjectURL gives it a temporary address, and clicking an <a download>
// link to that address saves it. This works from file:// too (no server needed).
// (4.4: type = the kind of file; the save file is JSON, the shopping list is plain text)
function downloadText(fileName, text, type) {
  const blob = new Blob([text], { type: type || "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;              // the name it gets in your Downloads folder
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);   // free the memory afterwards
}

saveFileButton.addEventListener("click", function () {
  const now = new Date();
  // null, 2 = indent with 2 spaces, so the file is readable in a text editor
  downloadText(saveFileName(now), JSON.stringify(buildSaveData(now), null, 2));
  noteFileSaved(now);                        // NEW in 4.7: the "Saved to file" stamp (part 5b)
});

// Is this a plain object like { ... } (not a list, not null)?
function isPlainObject(x) {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}
function isNumber(x) {
  return typeof x === "number" && isFinite(x);
}
// A "which piece is in which chain" object: every value must be a chain id (text)
function isPlacementList(x) {
  return isPlainObject(x) && Object.values(x).every(v => typeof v === "string");
}

// Check a file's text. Gives back { data } (cleaned up, ready to use) when it's a good
// CCU Builder file, or { problem } with a friendly sentence when it isn't.
// It only READS: nothing on the page changes here.
function checkSaveText(text) {
  let d;
  try {
    d = JSON.parse(text);
  } catch (e) {
    // Not JSON at all. A CCU Game CSV starts with a line of "quoted" column names.
    if (/^\s*"(count|name)"/.test(String(text))) {
      return { problem: "that's a CSV file. CCU Game CSVs go in the blue \"Load CCU Game CSV\" and \"Load ships CSV\" buttons." };
    }
    return { problem: "it isn't a CCU Builder save file (it isn't JSON). Pick a file made with \"Save to file\", like " + saveFileName(new Date()) + "." };
  }
  if (!isPlainObject(d) || d.app !== SAVE_FILE_APP) {
    return { problem: "it's a .json file, but not one made by CCU Builder's \"Save to file\"." };
  }
  if (!isNumber(d.version)) return { problem: "it has no version number, so it can't be read safely." };
  if (d.version > SAVE_FILE_VERSION) {
    return { problem: `it was saved by a newer CCU Builder (file version ${d.version}; this page reads version ${SAVE_FILE_VERSION}). Use the newer page to open it.` };
  }
  // From here on: it IS our file, so anything wrong means it got damaged or hand-edited
  const damaged = what => ({ problem: "the file looks damaged: " + what + "." });

  if (!Array.isArray(d.chains)) return damaged("the chains list is missing");
  const ids = new Set();
  for (let i = 0; i < d.chains.length; i++) {
    const ch = d.chains[i];
    if (!isPlainObject(ch) || typeof ch.id !== "string" || !ch.id) return damaged(`chain ${i + 1} has no id`);
    if (ids.has(ch.id)) return damaged(`two chains have the id "${ch.id}"`);
    ids.add(ch.id);
    const problems = validateChain({ name: String(ch.name || ""), endShip: String(ch.endShip || ""), endPrice: ch.endPrice });
    if (problems.length > 0) return damaged(`chain ${i + 1} (${ch.name || ch.id}): ${problems[0]}`);
  }
  if (!Array.isArray(d.ccus)) return damaged("the CCU list is missing");
  for (let i = 0; i < d.ccus.length; i++) {
    const c = d.ccus[i];
    if (!isPlainObject(c) || typeof c.id !== "string" || typeof c.from !== "string" || typeof c.to !== "string" ||
        !isNumber(c.fromMsrp) || !isNumber(c.toMsrp)) {
      return damaged(`CCU ${i + 1} is missing its ships or prices`);
    }
  }
  if (!Array.isArray(d.ships)) return damaged("the ships list is missing");
  for (let i = 0; i < d.ships.length; i++) {
    const s = d.ships[i];
    if (!isPlainObject(s) || typeof s.name !== "string" || !isNumber(s.msrp)) return damaged(`ship ${i + 1} is missing its name or price`);
  }
  if (!Array.isArray(d.plannedShips)) return damaged("the planned ships list is missing");
  for (const p of d.plannedShips) {
    if (!isPlainObject(p) || typeof p.id !== "string" || validatePlannedShip(p).length > 0) return damaged("a planned ship has no name or price");
  }
  if (!isPlacementList(d.layout) || !isPlacementList(d.shipLayout)) return damaged("the piece placements are broken");
  // NEW in 4.4: the ★ likely warbond pieces. Files saved by Stage 4.3 don't have them: that's fine.
  const wbList = d.warbondPieces === undefined ? [] : d.warbondPieces;
  if (!Array.isArray(wbList) || !wbList.every(isWarbondPiece)) {
    return damaged("a suggested warbond piece is missing its ships, price or chain");
  }
  // NEW in 4.5: the planned standard CCUs. Files saved by Stage 4.3 / 4.4 don't have them: fine.
  const stdList = d.standardPieces === undefined ? [] : d.standardPieces;
  if (!Array.isArray(stdList) || !stdList.every(isStandardPiece)) {
    return damaged("a planned standard CCU is missing its ships, prices or chain");
  }

  // All good: copy only the fields we know (the whitelist again)
  return { data: {
    chains:        d.chains.map(ch => ({ id: ch.id, name: String(ch.name), endShip: String(ch.endShip), endPrice: ch.endPrice })),
    ccus:          d.ccus.map(c => ({ ...pick(c, CCU_FIELDS), paid: isNumber(c.paid) ? c.paid : 0, buyback: c.buyback === true })),
    ships:         d.ships.map(s => ({ name: s.name, insurance: String(s.insurance || ""), msrp: s.msrp,
                                       paid: isNumber(s.paid) ? s.paid : null, place: String(s.place || "") })),
    plannedShips:  d.plannedShips.map(p => pick(p, PLANNED_FIELDS)),
    layout:        { ...d.layout },
    shipLayout:    { ...d.shipLayout },
    useSpecPrices: d.useSpecPrices === true,
    zoom:          isNumber(d.zoom) && d.zoom >= 8 && d.zoom <= 30 ? d.zoom : 16,
    warbondPieces: wbList.map(p => pick(p, WARBOND_FIELDS)),
    standardPieces: stdList.map(p => pick(p, STANDARD_FIELDS)),
  } };
}

// Put checked file data into the page, then save it to localStorage exactly like
// normal saving does (saveToStorage), so F5 keeps it.
function applySaveData(data) {
  chains       = data.chains;
  ccus         = data.ccus;
  ships        = data.ships;
  plannedShips = data.plannedShips;
  layout       = data.layout;
  shipLayout   = data.shipLayout;
  useSpecPrices = data.useSpecPrices;
  PIXELS_PER_5_DOLLARS = data.zoom;
  warbondPieces = data.warbondPieces || [];   // NEW in 4.4
  standardPieces = data.standardPieces || []; // NEW in 4.5
  gapFilter = null;
  usingExampleData = false;  // a file counts as your own data (no orange example pill)
  cleanLayout();           // same safety check as on start-up: a piece that doesn't fit goes to the stack
  saveToStorage();
  showControls();          // the zoom slider and checkbox show the loaded values
  drawAll();
}

// Load a file's text: check it, ask first, then replace. Gives back true if it loaded.
// A bad file only shows a message; your current chains are not touched.
function loadSaveText(text, fileName) {
  const result = checkSaveText(text);
  if (result.problem) {
    alert(`Couldn't load ${fileName}: ${result.problem}\n\nNothing was changed.`);
    return false;
  }
  const d = result.data;
  const question = `Are you sure? This will replace your current chains, placed pieces, planned ships ` +
                   `and loaded CSV data with the ones in ${fileName} (${d.chains.length} chains, ` +
                   `${d.ccus.length} CCUs, ${d.ships.length + d.plannedShips.length} starter ships). ` +
                   `Tip: click "Save to file" first if you want to keep what you have now.`;
  if (!confirm(question)) return false;
  applySaveData(d);
  return true;
}

// The button opens the hidden file picker (<input type="file" hidden> in CCU-Builder.html)
loadFileButton.addEventListener("click", function () {
  jsonInput.click();
});
jsonInput.addEventListener("change", function () {
  const file = jsonInput.files[0];
  if (!file) return;
  readFile(jsonInput, text => loadSaveText(text, file.name));   // readFile: part 1
});


// =====================================================================
// 9. NEW in Stage 4.3: THE WELCOME POP-UP
// Shown when the page opens, until you tick "Don't show this again". "? Help" in the
// header always opens it. The tick is saved in localStorage, so clearing your browser
// data (or using another browser) brings the pop-up back.
// =====================================================================

function welcomeHidden() {
  try {
    return localStorage.getItem(SAVE_HIDE_WELCOME) === "yes";
  } catch (e) {
    return false;                          // storage blocked: just show it
  }
}

function saveWelcomeChoice() {
  try {
    localStorage.setItem(SAVE_HIDE_WELCOME, welcomeHide.checked ? "yes" : "no");
  } catch (e) {
    console.warn("Could not save:", e);
  }
}

function openWelcome() {
  welcomeHide.checked = welcomeHidden();   // the box shows what you chose last time
  if (!welcomeDialog.open) welcomeDialog.showModal();
}

// On start-up: show it unless you said not to
function maybeShowWelcome() {
  if (!welcomeHidden()) openWelcome();
}

helpButton.addEventListener("click", openWelcome);
welcomeHide.addEventListener("change", saveWelcomeChoice);
welcomeOk.addEventListener("click", function () {
  saveWelcomeChoice();
  welcomeDialog.close();
});
// Closed with the Esc key? Remember the checkbox too.
welcomeDialog.addEventListener("close", saveWelcomeChoice);


// =====================================================================
// 11. NEW in Stage 4.4: SUGGESTED WARBONDS ★ AND THE SHOPPING LIST
// (4.7: the box is called "Suggested warbonds ★ (not owned, past prices)"; it was "Likely
//  warbonds ★". A single teal ★ piece is still called a "likely warbond".)
// warbonds.js lists, for each TARGET ship, the last time it was sold as a warbond
// (a cash-only CCU sold cheaper during events) and at what sale price. RSI prices a
// warbond CCU as:   target's warbond sale price − the price of the ship you upgrade from
// So you can drop a teal ★ piece after almost any ship in a chain, and its cash cost is
// worked out from the ship it follows. These are GUESSES from past sales: never owned,
// never in value / paid / savings, and always double-check the real price on RSI.
// Sources: CCU Game price history and the TEST Squadron "WB CCU Watch" sale threads
// (see warbonds.js and the README).
// =====================================================================

// Is warbonds.js loaded? (The page still works without it; the section says it's missing.)
function hasWarbondData() {
  return typeof WARBONDS !== "undefined" && Array.isArray(WARBONDS);
}
function warbondList() {
  return hasWarbondData() ? WARBONDS : [];
}
function warbondUpdatedText() {
  const date = typeof WARBOND_DATA_UPDATED === "undefined" ? "?" : WARBOND_DATA_UPDATED;
  return `Prices last updated ${date}, always double-check on RSI`;
}

// Find a target ship in warbonds.js (same name matching as everywhere: case, hyphens, "(LTI)")
function findWarbond(ship) {
  return warbondList().find(w => sameShip(w.ship, ship));
}

// NEW in 4.7: a warbond target's normal price TODAY. warbonds.js has a "now" price, but
// your CSV wins when your export has that ship (storeNow, part 2f).
function warbondNow(entry) {
  return storeNow(entry.ship, entry.now);
}

// The cash a ★ piece costs when it starts from a ship that costs fromPrice today.
// If that ship now costs MORE than the old warbond sale price, RSI wouldn't sell it: null.
// Otherwise sale price − start price, but never less than RSI's $5 minimum.
// Example: Corsair last-seen WB $230, from Constellation Taurus $200 -> $30 cash.
function warbondCost(entry, fromPrice) {
  if (fromPrice > entry.wb) return null;
  return Math.max(WB_MIN_CASH, entry.wb - fromPrice);
}

// Is this a well-formed saved ★ piece? (used when reading localStorage and save files)
function isWarbondPiece(p) {
  return isPlainObject(p) && typeof p.id === "string" && typeof p.target === "string" &&
         typeof p.from === "string" && isNumber(p.fromMsrp) && typeof p.chain === "string";
}

// Turn a saved ★ piece into a CCU-shaped object, so the Stage 2/3 rules (slotFor,
// checkChain, findGaps ...) treat it exactly like one of your own CCUs.
// wb: true marks it as a likely warbond; paid is 0 because you haven't bought it.
// (4.7: the target's price today is your CSV's price when your export has that ship: part 2f)
function warbondCCU(p) {
  const entry = findWarbond(p.target);
  return { id: p.id, from: p.from, to: entry.ship, fromMsrp: p.fromMsrp, toMsrp: warbondNow(entry),
           paid: 0, buyback: false, wb: true, entry: entry, cost: warbondCost(entry, p.fromMsrp) };
}

// All ★ pieces in one row, with shown prices (optionally ignoring one: the one being dragged)
function warbondPiecesInChain(chainId, ignoreId) {
  return warbondPieces
    .filter(p => p.chain === chainId && p.id !== ignoreId && findWarbond(p.target))
    .map(p => shownCCU(warbondCCU(p)));
}

// Which ship would a ★ piece to a target at price toPrice start from in this row?
// The ship (or placed piece) that ENDS highest below toPrice. Gives back
// { name, price (shown), realPrice (today's store price) }, or null when the row has
// nothing below it yet (an empty row needs a starter ship first).
function warbondStart(chain, toPrice, ignoreId) {
  let best = null;
  if (chain.ship && chain.ship.price < toPrice) {
    best = { name: chain.ship.name, price: chain.ship.price, realPrice: chain.ship.storePrice };
  }
  for (const p of piecesInChain(chain.id, ignoreId)) {
    if (p.collides || p.toMsrp >= toPrice) continue;
    if (!best || p.toMsrp > best.price) best = { name: p.to, price: p.toMsrp, realPrice: p.storeTo };
  }
  return best;
}

// The heart of 4.4: where would a ★ piece to this target go in this row, and what would it cost?
// Returns the slotFor() answer (fits, overlap, left, width) plus:
//   from, fromPrice (shown), fromMsrp (store price) - the ship it would follow
//   cost     - the estimated cash (null if not possible)
//   possible - false when the start ship now costs more than the old warbond price
//   entry    - the warbonds.js line
function slotForWarbond(target, chain, ignoreId) {
  const entry = findWarbond(target);
  if (!entry) return { fits: false, overlap: false, possible: false, cost: null };
  const toPrice = shownPrice(entry.ship, warbondNow(entry));
  const start = warbondStart(chain, toPrice, ignoreId);
  if (!start) return { fits: false, overlap: false, possible: false, cost: null, entry: entry };
  const ccu = shownCCU(warbondCCU({ id: ignoreId || "wb:new", target: entry.ship, from: start.name, fromMsrp: start.realPrice }));
  const slot = slotFor(ccu, chain);                   // the SAME fit + overlap check as a CCU
  const cost = warbondCost(entry, start.realPrice);
  return { ...slot, from: start.name, fromPrice: start.price, fromMsrp: start.realPrice,
           cost: cost, possible: cost !== null, entry: entry };
}

function canDropWarbond(slot) {
  return slot.fits && !slot.overlap && slot.possible;
}

// A new unique id like "wb-k3f9x2" (same idea as makeChainId)
function makeWarbondId() {
  let id;
  do {
    id = "wb-" + Math.random().toString(36).slice(2, 8);
  } while (warbondPieces.some(p => p.id === id));
  return id;
}

// Put a ★ piece in a row (or move it there, if id is an existing piece).
// slot comes from slotForWarbond, so we remember the ship it follows right now.
// Gives back the piece.
function placeWarbond(target, chainId, slot, id) {
  let piece = id ? warbondPieces.find(p => p.id === id) : null;
  if (!piece) {
    piece = { id: makeWarbondId() };
    warbondPieces.push(piece);
  }
  piece.target = slot.entry.ship;
  piece.from = slot.from;
  piece.fromMsrp = slot.fromMsrp;
  piece.chain = chainId;
  return piece;
}

// Take a ★ piece off its chain. It's also gone from the shopping list.
function removeWarbondPiece(id) {
  warbondPieces = warbondPieces.filter(p => p.id !== id);
}

// The little tags on a likely warbond. Words, not only colors.
function warbondTags(entry) {
  const tags = [];
  if (entry.q === "C") {
    tags.push({ text: "unconfirmed", cls: "tag-unconfirmed",
      why: "last seen only in a video summary (grade C)" + (entry.lastConfirmed ? `; last confirmed ${entry.lastConfirmed}` : "") });
  }
  if (entry.basis === "derived") {
    tags.push({ text: "lower confidence", cls: "tag-lower",
      why: "the source gives only the target's warbond price, not which ships could upgrade into it (CIG sometimes limits that)" });
  }
  if (entry.std !== warbondNow(entry)) {
    tags.push({ text: "price changed since", cls: "tag-changed",
      why: `its normal price was $${entry.std} then and is $${warbondNow(entry)} now` });
  }
  return tags;
}

// "−$20 (8% off $250)": how far below the normal price the warbond was
function discountText(entry) {
  const off = entry.std - entry.wb;
  return `−$${off} (${Math.round(off / entry.std * 100)}% off $${entry.std})`;
}

// A short name for where a sighting came from, from its web address
function sourceName(url) {
  if (/testsquadron/.test(url)) return "TEST Squadron";
  if (/ccugame/.test(url)) return "CCU Game";
  if (/reddit/.test(url)) return "reddit";
  if (/starzen/.test(url)) return "video summary";
  return "source";
}

// ---- which chain / gap is the list about? ----

// The selected chain's id: the one you clicked, or else the first chain
function currentChainId() {
  if (chains.some(ch => ch.id === selectedChainId)) return selectedChainId;
  return chains.length > 0 ? chains[0].id : null;
}

function selectChain(id) {
  if (id !== selectedChainId) gapFilter = null;      // a new chain: forget the old gap
  selectedChainId = id;
  drawAll();
}

// Clicked a yellow gap: select its chain and list what fits that gap
function setGapFilter(chainId, gap) {
  selectedChainId = chainId;
  gapFilter = { chain: chainId, from: gap.from, to: gap.to };
  warbondBox.open = true;                            // open the section if it was closed
  drawAll();
  warbondListBox.scrollTop = 0;
  warbondBox.scrollTop = 0;                          // 4.7: the whole box scrolls now (style.css)
  // 4.7: the box sits at the BOTTOM of the left column, so scroll the left column until it's in view
  // ("nearest" = move as little as possible; nothing moves if it's already visible)
  if (warbondBox.scrollIntoView) warbondBox.scrollIntoView({ block: "nearest" });
  showGapListInBox();
}

// NEW in 4.7: when you click a gap, scroll the warbond box so the "Plan gap ..." bar sits at
// the top of the box, right under its title (the title stays put; see "position: sticky" in
// style.css). The notes above the bar scroll out of the way and the matching warbonds show.
// The three left boxes keep their normal sizes; only the warbond box's scroll position moves.
function showGapListInBox() {
  const bar = document.getElementById("warbondFilterBar");
  const title = warbondBox.querySelector ? warbondBox.querySelector("summary") : null;
  if (!bar || !title || !bar.getBoundingClientRect || !warbondBox.getBoundingClientRect) return;
  const boxTop = warbondBox.getBoundingClientRect().top;
  const barTop = bar.getBoundingClientRect().top - boxTop + warbondBox.scrollTop;
  warbondBox.scrollTop = Math.max(0, barTop - title.offsetHeight);
}

function clearGapFilter() {
  gapFilter = null;
  drawAll();
}

// After a change (a piece dropped into the gap, a chain edited ...) the clicked gap may have
// shrunk or gone. Keep the filter on the open gap that overlaps it, or drop the filter.
function refreshGapFilter(chain) {
  if (!gapFilter) return;
  if (!chain || gapFilter.chain !== chain.id) { gapFilter = null; return; }
  const open = rowTotals(chain, piecesInChain(chain.id)).openGaps;
  const same = open.find(g => g.from < gapFilter.to && gapFilter.from < g.to);
  gapFilter = same ? { chain: chain.id, from: same.from, to: same.to } : null;
}

// The ship the NEXT step needs at this price: the "from" of the piece starting there,
// or the row's end ship at its end price. "" when nothing is there yet.
function shipNeededAt(chain, price) {
  const next = piecesInChain(chain.id).find(p => p.fromMsrp === price);
  if (next) return next.from;
  if (price === chain.endPrice) return chain.endShip;
  return "";
}

// Read the "WB price $__ to $__" boxes. An empty box = no limit (null).
function readRange() {
  const min = toNumber(wbMin.value), max = toNumber(wbMax.value);
  return { min: isNumber(min) ? min : null, max: isNumber(max) ? max : null };
}

// The list for one chain (a pure function, easy to test). Gives back a list of items:
//   { entry, pastEnd } - no gap clicked: every target whose warbond price is between $0 and
//                the chain's end price (cheapest first)
//   { entry, slot, closes, linked, rank, ... } - a gap was clicked: only the WARBOND options
//                that fit inside it (Stage 4.5: worked out by gapWarbondOptions in part 12),
//                sorted by start price, then end price, with the "not possible" ones last.
//                closes = ends exactly at the gap end (on the ship needed there = linked).
// range = { min, max } filters by the warbond price (null = no limit).
function warbondItems(chain, gap, range) {
  let list = warbondList().filter(w => w.wb >= 0 && w.wb <= chain.endPrice);
  if (range && range.min !== null) list = list.filter(w => w.wb >= range.min);
  if (range && range.max !== null) list = list.filter(w => w.wb <= range.max);
  // (pastEnd = its normal price today is past this chain's end, so it can't be placed here)
  if (!gap) return list.map(w => ({ entry: w, pastEnd: shownPrice(w.ship, warbondNow(w)) > chain.endPrice }));
  // Stage 4.5: a gap was clicked. Part 12 does the work (it also builds the standard options).
  const wb = gapWarbondOptions(chain, gap, range);
  return wb.possible.concat(wb.notPossible);
}

// ---- drawing the section ----

// One teal ★ piece ON a chain (like makePiece, part 3)
function makeWarbondPiece(ccu, showNames) {
  const piece = document.createElement("div");
  piece.className = "piece wb" + (ccu.collides ? " collision" : "");
  piece.style.width = (ccu.collides ? priceToX(ccu.storeTo - ccu.storeFrom) : pieceWidth(ccu)) + "px";
  // Stage 4.5: "WB" is now a small badge (a pill) inside the piece, because a planned STANDARD
  // CCU looks the same but has no badge. The words still read "★ $10 WB C2 Hercules → Prowler".
  if (ccu.cost === null) {
    piece.appendChild(document.createTextNode("★ not possible "));
  } else {
    piece.appendChild(document.createTextNode(`★ $${ccu.cost} `));
  }
  piece.appendChild(makeWbBadge());
  if (showNames) piece.appendChild(document.createTextNode(" " + ccu.from + " → " + ccu.to));
  const e = ccu.entry;
  piece.title = `★ Suggested warbond, NOT owned: ${rangeText(ccu)} · ~$${ccu.cost} cash at the last-seen ` +
                `warbond price $${e.wb} (${e.event}, ${e.date}) · ` +
                warbondTags(e).map(t => t.text).concat(["double-check on RSI"]).join(" · ");
  piece.dataset.id = ccu.id;
  piece.dataset.kind = "wb";
  piece.dataset.target = e.ship;
  piece.addEventListener("pointerdown", startDrag);
  return piece;
}

// One line in the "Suggested warbonds ★" list: a small teal piece to drag, and the facts
function makeWarbondItem(item) {
  const e = item.entry;
  const box = document.createElement("div");
  box.className = "wb-item" + (item.slot && !item.slot.possible ? " not-possible" : "");

  const top = document.createElement("div");
  top.className = "wb-top";
  const chip = document.createElement("div");
  chip.className = "piece wb chip";
  chip.textContent = `★ $${e.wb}`;
  chip.appendChild(makeWbBadge());          // 4.5: the small "WB" pill
  chip.title = "Drag onto a chain. The cash is worked out from the ship it follows there.";
  chip.dataset.kind = "wb";
  chip.dataset.target = e.ship;
  chip.addEventListener("pointerdown", startDrag);
  top.appendChild(chip);
  top.appendChild(makeSpan("wb-ship", e.ship));
  // 4.7: today's price (your CSV's when it has the ship); hover to see where it comes from
  const nowSpan = makeSpan("wb-price", `now $${warbondNow(e)}`);
  nowSpan.title = `today's price from ${priceSourceText(e.ship, "warbonds.js")}`;
  top.appendChild(nowSpan);
  box.appendChild(top);

  // "last seen WB $230 · 2026-05-15 DefenseCon 2956 · −$20 (8% off $250)"
  const meta = makeSpan("wb-meta", `last seen WB $${e.wb} · ${e.date} ${e.event} · ${discountText(e)}`);
  meta.title = `Seen ${e.seen} time${e.seen === 1 ? "" : "s"}. Last sighting: grade ${e.q} (${sourceName(e.url)}), ` +
               `best grade of any sighting: ${e.best}. ${e.url}` +
               (e.examples ? `\nReal from → to sightings: ${e.examples.join("; ")}` : "");
  box.appendChild(meta);

  // In gap mode: what it would cost from the gap's start ship
  if (item.slot) {
    let costText;
    if (!item.slot.possible) {
      costText = `✗ not possible from ${item.slot.from}: it costs $${item.slot.fromMsrp} now, more than the old WB $${e.wb}`;
    } else {
      costText = `from ${item.slot.from}: ~$${item.slot.cost} cash` +
                 (item.linked ? " · ✓ closes the gap" : item.closes ? " · ends at the gap end (a different ship)" : " · partly fills the gap");
    }
    box.appendChild(makeSpan("wb-cost" + (item.slot.possible ? "" : " bad"), costText));
  }

  if (item.pastEnd) box.appendChild(makeSpan("wb-past-end", `ends at $${warbondNow(e)} today, past this chain's end`));

  const tags = warbondTags(e);
  if (tags.length > 0) {
    const tagLine = document.createElement("div");
    tagLine.className = "wb-tags";
    for (const t of tags) {
      const tag = makeSpan("wb-tag " + t.cls, t.text);
      tag.title = t.why;
      tagLine.appendChild(tag);
    }
    box.appendChild(tagLine);
  }
  return box;
}

function drawWarbonds() {
  warbondUpdated.textContent = warbondUpdatedText();
  warbondListBox.innerHTML = "";
  warbondFilterBar.innerHTML = "";
  warbondFilterBar.hidden = true;
  if (!hasWarbondData()) {
    warbondCount.textContent = "0";
    warbondFor.textContent = "warbonds.js is missing. Put it in the same folder as CCU-Builder.html / index.html.";
    return;
  }
  const id = currentChainId();
  const chain = id ? findChain(id) : null;
  refreshGapFilter(chain);
  if (!chain) {
    warbondCount.textContent = "0";
    warbondFor.textContent = "Add a chain first. Then click its name to see suggested warbonds for it.";
    return;
  }
  warbondFor.textContent = `For ${chain.name} ($0 to ${priceText(chain.endShip, chain.endPrice)}). ` +
                           "Click a chain's name to switch, or a yellow gap to plan it with warbond (WB) " +
                           "and standard CCUs. Drag a ★ onto a chain.";
  warbondBox.classList.toggle("gap-mode", gapFilter !== null);   // 4.5: a taller list in gap mode
  // Stage 4.5: a gap was clicked: the mixed warbond + standard planning list (part 12)
  if (gapFilter) {
    drawGapPlan(chain);
    return;
  }
  const items = warbondItems(chain, null, readRange());
  warbondCount.textContent = String(items.length);
  if (items.length === 0) {
    warbondListBox.appendChild(makeSpan("group-note", "No suggested warbonds found here. Try another gap or price range."));
  }
  for (const item of items) warbondListBox.appendChild(makeWarbondItem(item));
}

// The price boxes filter as you type
wbMin.addEventListener("input", drawWarbonds);
wbMax.addEventListener("input", drawWarbonds);
wbRangeClear.addEventListener("click", function () {
  wbMin.value = "";
  wbMax.value = "";
  drawWarbonds();
});

// ---- the shopping list ----

// Every ★ piece on a chain, in chain order, cheapest first. Each line:
// { kind, from, to, chain (name), cost, entry, tags }
// Stage 4.5: kind "wb" = a likely warbond (cash), kind "std" = a planned standard CCU
// (store credit, estimated; entry is null and fromMsrp / toMsrp are its store prices).
function shoppingList() {
  const list = [];
  chains.forEach(function (chain) {
    const lines = [];
    for (const p of warbondPieces.filter(p => p.chain === chain.id && findWarbond(p.target))) {
      const c = warbondCCU(p);
      lines.push({ id: p.id, kind: "wb", from: c.from, to: c.to, chain: chain.name, cost: c.cost,
                   entry: c.entry, tags: warbondTags(c.entry), start: p.fromMsrp });
    }
    for (const p of standardPieces.filter(p => p.chain === chain.id)) {
      lines.push({ id: p.id, kind: "std", from: p.from, to: p.to, chain: chain.name, cost: standardCost(p),
                   entry: null, tags: [ESTIMATED_TAG], start: p.fromMsrp, fromMsrp: p.fromMsrp, toMsrp: p.toMsrp });
    }
    lines.sort((a, b) => a.start - b.start);       // cheapest start first, like reading the row
    for (const line of lines) list.push(line);
  });
  return list;
}

// The CASH total: the likely warbonds only. (Stage 4.5: store credit is added up separately
// by shoppingCredit, because you pay for it differently.)
function shoppingTotal(list) {
  return list.filter(line => line.kind !== "std").reduce((sum, line) => sum + (line.cost || 0), 0);
}

// Stage 4.5: the STORE CREDIT total: the planned standard CCUs (estimated)
function shoppingCredit(list) {
  return list.filter(line => line.kind === "std").reduce((sum, line) => sum + (line.cost || 0), 0);
}

// NEW in 4.7: split the list into its two sections. Warbonds are paid in CASH, standard
// CCUs with STORE CREDIT, so each gets its own section and its own total.
// Gives back { wb: [...], std: [...] } (each keeps the chain order of shoppingList).
function shoppingSections(list) {
  return { wb: list.filter(line => line.kind !== "std"), std: list.filter(line => line.kind === "std") };
}

// The section titles and the note under the standard one (the same words on screen and in the text)
const SHOP_WB_TITLE  = "Warbond CCUs (cash)";
const SHOP_STD_TITLE = "Standard CCUs (store credit, estimated)";
const SHOP_STD_NOTE  = "Standard prices are estimates from today's store prices (the price difference " +
                       "between the two ships). CIG doesn't sell every pair, so check the real CCU on RSI.";

// The plain-text version, for Copy, Download .txt and the email.
// NEW in 4.7: two sections, each numbered from 1 with its own subtotal, then both totals.
// An empty section is left out. Example (one of each):
//   CCU shopping list
//   Warbond prices last updated: 2026-09-30, always double-check on RSI before you buy.
//
//   WARBOND CCUs (cash)
//   ...
//   1. C2 Hercules -> Prowler (Ironclad chain)
//      ~$10 cash at last-seen WB (Prowler $410, ...)
//   Cash total: ~$10 (1 CCU, at last-seen warbond prices)
//
//   STANDARD CCUs (store credit, estimated)
//   ...
//   TOTAL cash needed: ~$10
//   TOTAL store credit needed: ~$10 (estimated)
function shoppingText(list) {
  const { wb, std } = shoppingSections(list);
  const plural = n => `${n} CCU${n === 1 ? "" : "s"}`;
  const tagText = line => line.tags.length > 0 ? ` [${line.tags.map(t => t.text).join(", ")}]` : "";
  const lines = ["CCU shopping list"];
  if (wb.length > 0) {
    lines.push(warbondUpdatedText().replace("Prices last updated", "Warbond prices last updated:") + " before you buy.");
  }
  lines.push("");
  if (list.length === 0) {
    lines.push("(empty: drag a teal ★ CCU onto a chain)");
    return lines.join("\n");
  }
  if (wb.length > 0) {
    lines.push(SHOP_WB_TITLE.replace("Warbond", "WARBOND"));
    lines.push("Cash = the last-seen warbond sale price minus the ship you upgrade from. Past sales, not a promise.");
    wb.forEach(function (line, i) {
      const e = line.entry;
      lines.push(`${i + 1}. ${line.from} -> ${line.to} (${line.chain} chain)`);
      lines.push(`   ~$${line.cost} cash at last-seen WB (${e.ship} $${e.wb}, ${e.event}, ${e.date})${tagText(line)}`);
    });
    lines.push(`Cash total: ~$${shoppingTotal(list)} (${plural(wb.length)}, at last-seen warbond prices)`);
    lines.push("");
  }
  if (std.length > 0) {
    lines.push(SHOP_STD_TITLE.replace("Standard", "STANDARD"));
    lines.push(SHOP_STD_NOTE);
    std.forEach(function (line, i) {
      lines.push(`${i + 1}. ${line.from} -> ${line.to} (${line.chain} chain)`);
      lines.push(`   ~$${line.cost} store credit ($${line.toMsrp} - $${line.fromMsrp} store prices)`);
    });
    lines.push(`Store credit total: ~$${shoppingCredit(list)} (${plural(std.length)}, estimated)`);
    lines.push("");
  }
  if (wb.length > 0) lines.push(`TOTAL cash needed: ~$${shoppingTotal(list)}`);
  if (std.length > 0) lines.push(`TOTAL store credit needed: ~$${shoppingCredit(list)} (estimated)`);
  return lines.join("\n");
}

// A mailto: link: your own mail app opens with the subject and the list filled in.
// No address is filled in (the page never knows it): type your own and press send.
function shoppingMailto(text) {
  return "mailto:?subject=" + encodeURIComponent("CCU shopping list") + "&body=" + encodeURIComponent(text);
}

function shoppingFileName(d) {
  return "ccu-shopping-list-" + dateText(d) + ".txt";
}

// The 🛒 button text and the pop-up's contents (redrawn whenever the page redraws)
// NEW in 4.7: the pop-up has two sections, "Warbond CCUs (cash)" and "Standard CCUs (store
// credit, estimated)", each with a title and its lines. An empty section is left out.
function drawShoppingList() {
  const list = shoppingList();
  const { wb, std } = shoppingSections(list);
  const total = shoppingTotal(list);
  const credit = shoppingCredit(list);                       // 4.5: store credit (estimated)
  if (std.length > 0 && wb.length > 0) shopButton.textContent = `🛒 Shopping list (${list.length}, $${total} cash + $${credit} credit)`;
  else if (std.length > 0)             shopButton.textContent = `🛒 Shopping list (${list.length}, $${credit} credit)`;
  else                                 shopButton.textContent = `🛒 Shopping list (${list.length}, $${total})`;
  shopUpdated.textContent = warbondUpdatedText() + ".";
  shopLines.innerHTML = "";
  if (list.length === 0) {
    shopLines.appendChild(makeSpan("group-note", "Empty. Drag a teal ★ CCU (a suggested warbond, or a standard CCU from a yellow gap) onto a chain and it appears here."));
  }
  if (wb.length > 0) {
    shopLines.appendChild(makeShopSectionTitle("shop-section-wb", SHOP_WB_TITLE, `${wb.length} · ~$${total} cash`));
    for (const line of wb) shopLines.appendChild(makeShopLine(line));
  }
  if (std.length > 0) {
    shopLines.appendChild(makeShopSectionTitle("shop-section-std", SHOP_STD_TITLE, `${std.length} · ~$${credit} credit`));
    shopLines.appendChild(makeSpan("shop-section-note", SHOP_STD_NOTE));
    for (const line of std) shopLines.appendChild(makeShopLine(line));
  }
  // The totals stay below the list (it scrolls when long), one per section
  shopTotal.hidden = wb.length === 0;
  shopTotal.textContent = `TOTAL cash needed: ~$${total} (warbonds, at last-seen warbond prices)`;
  shopCredit.hidden = std.length === 0;
  shopCredit.textContent = `TOTAL store credit needed: ~$${credit} (standard CCUs, estimated)`;
  shopEmail.href = shoppingMailto(shoppingText(list));
}

// NEW in 4.7: a section title in the pop-up, e.g. "Warbond CCUs (cash)    2 · ~$55 cash"
function makeShopSectionTitle(className, title, count) {
  const head = document.createElement("div");
  head.className = "shop-section " + className;
  head.appendChild(makeSpan("shop-section-title", title));
  head.appendChild(makeSpan("shop-section-count", count));
  return head;
}

// One line of the pop-up: from → to, the price, the chain and where the price comes from, tags
function makeShopLine(line) {
  const e = line.entry;
  const row = document.createElement("div");
  row.className = "shop-line" + (line.kind === "std" ? " std-line" : "");
  // Stage 4.5: first column = the small "WB" badge for a warbond, empty for a standard CCU
  const kindCell = document.createElement("span");
  kindCell.className = "shop-kind";
  if (line.kind !== "std") kindCell.appendChild(makeWbBadge());
  row.appendChild(kindCell);
  row.appendChild(makeSpan("shop-ccu", `${line.from} → ${line.to}`));
  if (line.kind === "std") {
    row.appendChild(makeSpan("shop-cash shop-credit", `~$${line.cost} credit`));
    row.appendChild(makeSpan("shop-meta", `${line.chain} chain · standard CCU · ` +
                                          `$${line.toMsrp} − $${line.fromMsrp} at today's store prices`));
  } else {
    row.appendChild(makeSpan("shop-cash", `~$${line.cost}`));
    row.appendChild(makeSpan("shop-meta", `${line.chain} chain · last-seen WB $${e.wb} · ${e.date} ${e.event}`));
  }
  if (line.tags.length > 0) {
    const tagLine = document.createElement("div");
    tagLine.className = "wb-tags";
    for (const t of line.tags) {
      const tag = makeSpan("wb-tag " + t.cls, t.text);
      tag.title = t.why;
      tagLine.appendChild(tag);
    }
    row.appendChild(tagLine);
  }
  return row;
}

// Copy text to the clipboard. The modern way first; if the browser says no, the old way
// (select a hidden text box and "copy"). Gives back a Promise of true / false.
function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text).then(() => true, () => oldCopy(text));
  }
  return Promise.resolve(oldCopy(text));
}
function oldCopy(text) {
  const box = document.createElement("textarea");
  box.value = text;
  shopDialog.appendChild(box);           // inside the pop-up, or the browser won't select it
  box.select();
  let ok = false;
  try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
  box.remove();
  return ok;
}

shopButton.addEventListener("click", function () {
  drawShoppingList();
  shopStatus.textContent = "";
  shopDialog.showModal();
});
shopClose.addEventListener("click", function () {
  shopDialog.close();
});
shopCopy.addEventListener("click", function () {
  copyText(shoppingText(shoppingList())).then(function (ok) {
    shopStatus.textContent = ok ? "Copied. Paste it anywhere (Ctrl+V)." : "Couldn't copy here. Try Download .txt instead.";
  });
});
shopDownload.addEventListener("click", function () {
  downloadText(shoppingFileName(new Date()), shoppingText(shoppingList()), "text/plain");
  shopStatus.textContent = "Downloaded " + shoppingFileName(new Date()) + ".";
});


// =====================================================================
// 12. NEW in Stage 4.5: PLAN A GAP WITH WARBOND AND STANDARD CCUs
// Click a yellow gap and the "Suggested warbonds ★" list turns into a planning list: every CCU
// that fits INSIDE the gap (it starts at or after the gap start and ends at or before the gap
// end), warbond AND standard. 4.8: every warbond first, then every standard CCU, each group
// sorted by start price, then end price.
//   - A warbond option has a small "WB" badge and is paid in CASH (part 11 works out the cash).
//   - A standard option has no badge. It costs the difference between today's store prices,
//     paid with STORE CREDIT. That's an ESTIMATE: CIG doesn't sell every pair of ships
//     (especially concept ships), so check the real CCU on RSI.
// Both kinds are teal dashed ★ pieces you drag onto the chain. Both use the SAME fit, overlap
// and linking checks as your own CCUs, and neither ever counts as owned.
// By default only options that START at the gap's start ship or END at the gap's end ship are
// listed (they connect to what you already have). Tick "Show all" for everything in between.
// =====================================================================

// The small "WB" badge (a pill) that marks a warbond. No badge = a standard CCU.
function makeWbBadge() {
  const badge = makeSpan("wb-badge", "WB");
  badge.title = "warbond: a cash-only CCU sold cheaper during events";
  return badge;
}

// The "estimated" tag on a planned standard CCU (same look as the warbond tags)
const ESTIMATED_TAG = { text: "estimated", cls: "tag-est",
  why: "standard CCU price = the difference between today's store prices. CIG doesn't sell every pair " +
       "(especially concept ships), so check the real CCU on RSI." };

// ---- the planned standard pieces (like the warbond pieces in part 11) ----

// Is this a well-formed saved standard piece? (used for localStorage and save files)
function isStandardPiece(p) {
  return isPlainObject(p) && typeof p.id === "string" && typeof p.from === "string" && typeof p.to === "string" &&
         isNumber(p.fromMsrp) && isNumber(p.toMsrp) && p.fromMsrp > 0 && p.toMsrp > p.fromMsrp &&
         typeof p.chain === "string";
}

// What a standard CCU costs in store credit: target's store price − start ship's store price.
// Example: Constellation Taurus $200 -> Hurricane $210 = $10 store credit.
// (Always TODAY'S STORE prices, even with "Speculative prices*" ticked: that's what RSI charges.)
function standardCost(p) {
  return p.toMsrp - p.fromMsrp;
}

// Turn a planned standard piece into a CCU-shaped object (like warbondCCU in part 11), so the
// Stage 2/3 rules (slotFor, checkChain, findGaps ...) treat it exactly like one of your own CCUs.
// std: true marks it as a planned standard CCU; paid is 0 because you haven't bought it.
function standardCCU(p) {
  return { id: p.id, from: p.from, to: p.to, fromMsrp: p.fromMsrp, toMsrp: p.toMsrp,
           paid: 0, buyback: false, std: true, cost: standardCost(p) };
}

// The same, with SHOWN prices (part 2c). A piece still in the list has no id yet: "std:new".
function standardShownCCU(p) {
  return shownCCU(standardCCU({ ...p, id: p.id || "std:new" }));
}

// All planned standard pieces in one row, with shown prices (optionally ignoring one)
function standardPiecesInChain(chainId, ignoreId) {
  return standardPieces
    .filter(p => p.chain === chainId && p.id !== ignoreId)
    .map(standardShownCCU);
}

// A new unique id like "std-k3f9x2" (same idea as makeChainId)
function makeStandardId() {
  let id;
  do {
    id = "std-" + Math.random().toString(36).slice(2, 8);
  } while (standardPieces.some(p => p.id === id));
  return id;
}

// Put a planned standard CCU in a row (or move it there, if item.id is an existing piece).
// Gives back the piece. (Call canDrop() first: onDragEnd in part 4 does.)
function placeStandard(item, chainId) {
  let piece = item.id ? standardPieces.find(p => p.id === item.id) : null;
  if (!piece) {
    piece = { id: makeStandardId(), from: item.from, to: item.to, fromMsrp: item.fromMsrp, toMsrp: item.toMsrp };
    standardPieces.push(piece);
  }
  piece.chain = chainId;
  return piece;
}

// Take a planned standard CCU off its chain (it's gone from the shopping list too)
function removeStandardPiece(id) {
  standardPieces = standardPieces.filter(p => p.id !== id);
}

// What is being dragged? A placed piece (it has an id) or a chip from the list (no id yet:
// its ships and store prices are written on the chip as data-from, data-to ...).
function standardDragItem(el) {
  if (el.dataset.id) {
    const p = standardPieces.find(p => p.id === el.dataset.id);
    if (p) return { ...p };
  }
  return { id: null, from: el.dataset.from, to: el.dataset.to,
           fromMsrp: Number(el.dataset.fromMsrp), toMsrp: Number(el.dataset.toMsrp) };
}

// One teal ★ planned standard CCU ON a chain (like makeWarbondPiece, but no "WB" badge)
function makeStandardPiece(ccu, showNames) {
  const piece = document.createElement("div");
  piece.className = "piece wb std" + (ccu.collides ? " collision" : "");
  piece.style.width = (ccu.collides ? priceToX(ccu.storeTo - ccu.storeFrom) : pieceWidth(ccu)) + "px";
  let text = `★ $${ccu.cost} est.`;
  if (showNames) text += " " + ccu.from + " → " + ccu.to;
  piece.textContent = text;
  piece.title = `★ planned standard CCU, NOT owned: ${rangeText(ccu)} · ~$${ccu.cost} store credit, estimated ` +
                `(today's store prices $${ccu.storeTo} − $${ccu.storeFrom}; CIG doesn't sell every pair) · double-check on RSI`;
  piece.dataset.id = ccu.id;
  piece.dataset.kind = "std";
  piece.addEventListener("pointerdown", startDrag);
  return piece;
}

// ---- which ships can a gap use? ----

// The ship price list: every ship with a known STORE price in prices.js (concept ships) and
// warbonds.js ("now" = today's store price). Never a made-up price. A ship that is in both
// files takes its prices.js price. Not on sale (store null) and rumored Mk V ships are left out.
// NEW in 4.7: every ship in your loaded CSVs comes FIRST, at your CSV's price (part 2f), so
// your export wins over both files; they only fill in ships your export never mentions.
// Gives back a list of { name, store, source } (source = where the price comes from, in words).
function shipPriceList() {
  const list = [];
  const seen = new Set();          // a Set = a list where each value can only be once
  const add = function (name, store, source) {
    const key = normalizeShip(name);
    if (!key || seen.has(key) || !isNumber(store) || store <= 0 || RUMORED_SHIP.test(name)) return;
    seen.add(key);
    list.push({ name: name, store: store, source: source });
  };
  for (const c of ccus) { add(c.from, csvPrice(c.from), csvSourceName()); add(c.to, csvPrice(c.to), csvSourceName()); }
  for (const s of ships) add(s.name, csvPrice(s.name), csvSourceName());
  if (typeof SPEC_PRICES !== "undefined") {
    for (const name in SPEC_PRICES) add(name, SPEC_PRICES[name].store, "prices.js");
  }
  for (const w of warbondList()) add(w.ship, w.now, "warbonds.js");
  return list;
}

// The two ships at the edges of a gap, as { name, price (shown), store }, or null:
//   start - the ship you'll hold at the gap start (the row's starter ship, or the "to" ship of
//           the piece that ends there). null when the gap starts at $0 with no starter ship.
//   end   - the ship the next step needs at the gap end (the "from" of the piece starting
//           there, or the row's end ship at its end price).
function gapEdges(chain, gap) {
  const pieces = piecesInChain(chain.id).filter(p => !p.collides);
  let start = null, end = null;
  if (chain.ship && chain.ship.price === gap.from) {
    start = { name: chain.ship.name, price: chain.ship.price, store: chain.ship.storePrice };
  } else {
    const before = pieces.find(p => p.toMsrp === gap.from);
    if (before) start = { name: before.to, price: before.toMsrp, store: before.storeTo };
  }
  const after = pieces.find(p => p.fromMsrp === gap.to);
  if (after) end = { name: after.from, price: after.fromMsrp, store: after.storeFrom };
  else if (gap.to === chain.endPrice) end = { name: chain.endShip, price: chain.endPrice, store: chain.storeEndPrice };
  return { start: start, end: end };
}

// Every ship a CCU inside the gap can start from or go to, cheapest first:
// the two edge ships, plus every ship on the price list whose shown price lies strictly
// BETWEEN the gap start and end. (Another ship at exactly the gap start or end price is left
// out: it wouldn't link up with the ship you hold there, or the one the next piece needs.)
// Each one: { name, price (shown), store, edge: "start" / "end" / "" }
function gapShips(gap, edges) {
  const list = [];
  if (edges.start) list.push({ ...edges.start, edge: "start" });
  if (edges.end) list.push({ ...edges.end, edge: "end" });
  const edgeNames = list.map(s => s.name);
  for (const s of shipPriceList()) {
    if (edgeNames.some(n => sameShip(n, s.name))) continue;    // already an edge ship
    const price = shownPrice(s.name, s.store);                  // speculative price when ticked
    if (price > gap.from && price < gap.to) list.push({ name: s.name, price: price, store: s.store, edge: "" });
  }
  list.sort((a, b) => a.price - b.price);
  return list;
}

// Sort order of the planning list. NEW in 4.8: ALL warbond (WB) options come first, then ALL
// standard CCUs. Inside each group, as before: start price, then end price, then cheapest
// first, then by name.
function compareGapOptions(a, b) {
  return (a.kind === "wb" ? 0 : 1) - (b.kind === "wb" ? 0 : 1) ||
         a.fromPrice - b.fromPrice || a.toPrice - b.toPrice ||
         (a.cost || 0) - (b.cost || 0) || a.to.localeCompare(b.to);
}

// ---- the options ----

// WARBOND options in a gap. A warbond's price depends only on its TARGET, and when you drop it
// the start is always the ship it follows in the row (part 11). Inside an empty gap that is the
// gap's start ship, so each target is offered ONCE, from the gap start (not once per ship).
// To start a warbond from a ship in the middle of the gap, place a standard CCU up to that ship
// first, then click the leftover gap.
// A target is listed when its price today lands inside the gap (at the gap end only if it IS
// the ship needed there). Gives back { possible, notPossible }: "not possible" = the start ship
// now costs more than the old warbond price (shown faded at the end of the list).
// range = { min, max } filters by warbond sale price (it doesn't apply to standard CCUs).
function gapWarbondOptions(chain, gap, range) {
  const out = { possible: [], notPossible: [] };
  const edges = gapEdges(chain, gap);
  if (!edges.start) return out;                       // nothing to upgrade from yet
  let list = warbondList();
  if (range && range.min !== null) list = list.filter(w => w.wb >= range.min);
  if (range && range.max !== null) list = list.filter(w => w.wb <= range.max);
  for (const w of list) {
    const to = shownPrice(w.ship, warbondNow(w));        // 4.7: your CSV's price wins (part 2f)
    if (to <= gap.from || to > gap.to) continue;      // must land inside the gap
    if (to === gap.to && !(edges.end && sameShip(w.ship, edges.end.name))) continue;
    if (sameShip(w.ship, edges.start.name) || RUMORED_SHIP.test(w.ship)) continue;
    const slot = slotForWarbond(w.ship, chain, null); // the SAME slot + cash rules as dragging
    if (!slot.fits || slot.overlap || slot.fromPrice !== gap.from) continue;
    const endsAtGap = to === gap.to;
    const option = { kind: "wb", entry: w, slot: slot,
      from: slot.from, fromPrice: slot.fromPrice, fromStore: slot.fromMsrp,
      to: w.ship, toPrice: to, toStore: warbondNow(w), cost: slot.cost, possible: slot.possible,
      startsAtGap: true, endsAtGap: endsAtGap,
      closes: endsAtGap, linked: endsAtGap,             // (the 4.4 names, still used by part 11)
      rank: !slot.possible ? 3 : endsAtGap ? 0 : 2 };
    if (slot.possible) out.possible.push(option);
    else out.notPossible.push(option);
  }
  out.possible.sort(compareGapOptions);
  out.notPossible.sort(compareGapOptions);
  return out;
}

// STANDARD options in a gap: every pair of gap ships (gapShips) where the target costs more
// than the start, at the shown prices (so it fits on the ruler) AND at store prices (so RSI
// could sell it). Cost = store price difference (standardCost), estimated.
function gapStandardOptions(chain, gap) {
  const edges = gapEdges(chain, gap);
  if (!edges.start) return [];                        // nothing to upgrade from yet
  const ships = gapShips(gap, edges);
  const out = [];
  for (const a of ships) {
    if (a.edge === "end") continue;                   // a CCU can't start at the gap end
    for (const b of ships) {
      if (b.edge === "start" || b.price <= a.price || b.store <= a.store || sameShip(a.name, b.name)) continue;
      const item = { id: null, from: a.name, to: b.name, fromMsrp: a.store, toMsrp: b.store };
      const ccu = standardShownCCU(item);
      if (ccu.collides || ccu.fromMsrp < gap.from || ccu.toMsrp > gap.to) continue;
      if (!canDrop(ccu, chain)) continue;             // the SAME check as dropping it
      out.push({ kind: "std", entry: null, item: item,
        from: a.name, fromPrice: ccu.fromMsrp, fromStore: a.store,
        to: b.name, toPrice: ccu.toMsrp, toStore: b.store, cost: ccu.cost, possible: true,
        startsAtGap: a.edge === "start", endsAtGap: b.edge === "end",
        closes: b.edge === "end", linked: b.edge === "end", rank: b.edge === "end" ? 0 : 2 });
    }
  }
  return out.sort(compareGapOptions);
}

// The whole planning list for one gap (a pure function, easy to test). Gives back:
//   edges       - the gap's start and end ships (gapEdges)
//   all         - every warbond + standard option that fits inside the gap, sorted
//   shown       - what the list shows: all of them with "Show all", otherwise only the ones
//                 that start at the gap's start ship or end at the gap's end ship (or both)
//   notPossible - warbonds that land in the gap but can't start from the gap's start ship
function gapPlan(chain, gap, range, showAll) {
  const edges = gapEdges(chain, gap);
  const wb = gapWarbondOptions(chain, gap, range);
  const all = wb.possible.concat(gapStandardOptions(chain, gap)).sort(compareGapOptions);
  const shown = showAll ? all : all.filter(o => o.startsAtGap || o.endsAtGap);
  return { edges: edges, all: all, shown: shown, notPossible: wb.notPossible };
}

// ---- drawing the planning list ----

// How an option sits in the gap, in words
function gapFitText(o) {
  if (o.startsAtGap && o.endsAtGap) return "✓ closes the gap";
  if (o.startsAtGap) return "fills the start of the gap";
  if (o.endsAtGap) return "fills the end of the gap";
  return "middle of the gap (leaves a gap on each side)";
}

// One line in the planning list: a small teal ★ chip to drag (with a "WB" badge for a
// warbond), the target, what it costs from where, and its tags.
function makeGapItem(o) {
  const isStd = o.kind === "std";
  const box = document.createElement("div");
  box.className = "wb-item gap-item " + (isStd ? "std-item" : "wb-option");

  const top = document.createElement("div");
  top.className = "wb-top";
  const chip = document.createElement("div");
  chip.className = "piece wb chip" + (isStd ? " std" : "");
  chip.textContent = `★ $${o.cost}`;
  if (isStd) {
    chip.title = `Drag onto a chain: standard CCU ${o.from} → ${o.to}, ~$${o.cost} store credit (estimated).`;
    chip.dataset.kind = "std";
    chip.dataset.from = o.item.from;
    chip.dataset.to = o.item.to;
    chip.dataset.fromMsrp = String(o.item.fromMsrp);   // store prices (data-* values are always text)
    chip.dataset.toMsrp = String(o.item.toMsrp);
  } else {
    chip.appendChild(makeWbBadge());
    chip.title = "Drag onto a chain: warbond, paid in cash. The cash is worked out from the ship it follows there.";
    chip.dataset.kind = "wb";
    chip.dataset.target = o.entry.ship;
  }
  chip.addEventListener("pointerdown", startDrag);
  top.appendChild(chip);
  top.appendChild(makeSpan("wb-ship", o.to));
  top.appendChild(makeSpan("wb-price", priceText(o.to, o.toPrice)));
  box.appendChild(top);

  // "from Constellation Taurus $200: ~$30 cash · ✓ closes the gap"
  const costText = isStd ? `~$${o.cost} store credit` : `~$${o.cost} cash`;
  box.appendChild(makeSpan("wb-cost", `from ${o.from} ${priceText(o.from, o.fromPrice)}: ${costText} · ${gapFitText(o)}`));

  // Last line: where the price comes from, plus the tags
  const metaLine = document.createElement("div");
  metaLine.className = "wb-tags gap-meta";
  let tags;
  if (isStd) {
    const stdMeta = makeSpan("wb-meta", `standard CCU: $${o.toStore} − $${o.fromStore} store prices`);
    // NEW in 4.7: hover to see where each store price comes from (your CSV wins: part 2f)
    // (short source names here, plus the CCU Game note once at the end when a price is from your CSV)
    const shortSource = ship => csvPrice(ship) !== null ? csvSourceName() : storeFileName(ship);
    const fromCsv = !usingExampleData && (csvPrice(o.to) !== null || csvPrice(o.from) !== null);
    stdMeta.title = `${o.to} $${o.toStore} from ${shortSource(o.to)} · ` +
                    `${o.from} $${o.fromStore} from ${shortSource(o.from)}` +
                    (fromCsv ? ` (${CCU_GAME_SPEC_NOTE})` : "");
    metaLine.appendChild(stdMeta);
    tags = [ESTIMATED_TAG];
  } else {
    const e = o.entry;
    const meta = makeSpan("wb-meta", `last seen WB $${e.wb} · ${e.date} ${e.event}`);
    meta.title = `${discountText(e)}. Seen ${e.seen} time${e.seen === 1 ? "" : "s"}. ${e.url}`;
    metaLine.appendChild(meta);
    tags = warbondTags(e);
  }
  for (const t of tags) {
    const tag = makeSpan("wb-tag " + t.cls, t.text);
    tag.title = t.why;
    metaLine.appendChild(tag);
  }
  box.appendChild(metaLine);
  return box;
}

// Tick / untick "Show all"
function setGapShowAll(on) {
  gapShowAll = on;
  drawWarbonds();
}

// Draw the bar ("Plan gap $200–$250 on Galaxy  [ ] Show all  clear") and the list.
// Called by drawWarbonds (part 11) when a gap is selected.
function drawGapPlan(chain) {
  const gap = gapFilter;
  const plan = gapPlan(chain, gap, readRange(), gapShowAll);

  warbondFilterBar.hidden = false;
  warbondFilterBar.appendChild(makeSpan("wb-filter-text", `Plan gap $${gap.from}–$${gap.to} on ${chain.name}`));
  const label = document.createElement("label");
  label.className = "wb-show-all";
  label.title = "Off: only CCUs that start at the gap's start ship or end at its end ship. On: every CCU inside the gap.";
  const check = document.createElement("input");
  check.type = "checkbox";
  check.id = "gapShowAll";
  check.checked = gapShowAll;
  check.addEventListener("change", function () { setGapShowAll(check.checked); });
  label.appendChild(check);
  label.appendChild(document.createTextNode(` Show all (${plan.all.length})`));
  warbondFilterBar.appendChild(label);
  const clear = makeSmallButton("clear", "Show every suggested warbond for this chain again", false, clearGapFilter);
  clear.id = "wbGapClear";
  warbondFilterBar.appendChild(clear);

  if (!plan.edges.start) {
    warbondCount.textContent = "0";
    const why = gap.from === 0
      ? "This gap starts at $0. A CCU needs a ship to upgrade from: put a starter ship on this row first."
      : `Nothing ends at $${gap.from} yet, so there's no ship to upgrade from.`;
    warbondListBox.appendChild(makeSpan("group-note", why));
    return;
  }

  // A short note on what is listed (the default cap, or everything)
  const endName = plan.edges.end ? plan.edges.end.name : "the gap end";
  const capText = gapShowAll
    ? `All ${plan.all.length} CCUs that fit inside the gap.`
    : `Showing ${plan.shown.length} of ${plan.all.length}: CCUs that start at ${plan.edges.start.name} or end at ${endName}.`;
  const capNote = makeSpan("wb-cap-note", capText);
  capNote.title = "WB badge = warbond, paid in cash. No badge = standard CCU, paid with store credit (estimated).";
  warbondFilterBar.appendChild(capNote);

  const drawn = plan.shown.slice(0, MAX_GAP_ITEMS);
  for (const o of drawn) warbondListBox.appendChild(makeGapItem(o));
  if (plan.shown.length > drawn.length) {
    warbondListBox.appendChild(makeSpan("group-note", `… and ${plan.shown.length - drawn.length} more. ` +
      "Place a piece to split the gap, then click a smaller gap."));
  }
  // Warbonds that land in the gap but can't start from the gap's start ship: faded, at the end
  for (const o of plan.notPossible) warbondListBox.appendChild(makeWarbondItem(o));
  if (drawn.length === 0 && plan.notPossible.length === 0) {
    warbondListBox.appendChild(makeSpan("group-note", "No CCUs found for this gap. Try \"Show all\", another gap or price range."));
  }
  warbondCount.textContent = String(drawn.length + plan.notPossible.length);
}


// =====================================================================
// 10. START UP: restore what was saved last time and draw it
// =====================================================================

// Make the zoom slider and the checkbox show the current settings
function showControls() {
  zoomSlider.value = PIXELS_PER_5_DOLLARS;
  zoomValue.textContent = PIXELS_PER_5_DOLLARS + " px per $5";
  specToggle.checked = useSpecPrices;
}

checkStorage();             // NEW in 4.7: can the browser save? when did you last save to a file? (part 5b)
loadFromStorage();
showControls();
drawAll();
drawSaveStatus();
maybeShowWelcome();
