// example.js: a MADE-UP hangar for the "Try example data" button.
//
// None of this is anybody's real account. It lets someone without a CCU Game account
// (or without their CSVs at hand) click "Try example data" and play with the page.
//
// The two blocks below are written EXACTLY like the CSV files CCU Game exports, so
// app.js reads them with the same code as a real file (parseCSV -> rowsToCCUs /
// rowsToShips). A real export has more columns (dates, gift flags, account ...);
// app.js only reads the ones listed here, so the rest are left out.
//
// Ship prices are real RSI pledge-store standalone prices, checked 2026-09-29 on the
// Star Citizen Wiki ship pages (starcitizen.tools). What was "paid" is invented: a bit
// under the price difference, like a warbond (cash-only, cheaper) CCU.
//
// The CCUs step up toward the 5 example chains in chains.js (Galaxy, Asgard, Ironclad,
// Ironclad Assault, Carrack). There are two gaps on purpose (Constellation Taurus $200 ->
// Corsair $250, and C2 Hercules $400 -> M2 Hercules $520), so the yellow "missing"
// blocks show up. isBuyback true = the CCU sits in the buyback pile, not the hangar.
//
// Editing tips: keep every line flush left (no spaces before it), wrap names in "quotes",
// and keep the first line (the column names) as it is.

// The CCUs, like CCU Game's CCUs export.
// count = how many copies you own (2 = two identical pieces)
// pledge = what you paid for the CCU, in $
const EXAMPLE_CCUS_CSV = `"count","from","to","fromMsrp","toMsrp","pledge","isBuyback"
1,"Avenger Titan","Cutlass Black",60,110,45,false
1,"Cutlass Black","Freelancer MAX",110,150,35,false
1,"Freelancer MAX","Constellation Taurus",150,200,40,true
1,"Corsair","Redeemer",250,330,70,false
1,"Redeemer","Galaxy",330,380,40,false
1,"Mustang Alpha","Nomad",30,80,45,false
1,"Nomad","C1 Spirit",80,125,40,false
1,"C1 Spirit","Vulture",125,175,45,true
1,"Vulture","Constellation Andromeda",175,240,55,false
1,"Constellation Andromeda","Vanguard Warden",240,260,15,false
1,"Vanguard Warden","Asgard",260,350,80,true
1,"Constellation Andromeda","Mercury Star Runner",240,260,15,false
1,"Mercury Star Runner","Caterpillar",260,330,60,false
1,"Caterpillar","C2 Hercules",330,400,60,false
1,"M2 Hercules","Ironclad",520,600,70,true
2,"Cutlass Black","Cutlass Red",110,135,20,false
1,"Cutlass Red","Retaliator",135,175,35,false
1,"Retaliator","Starfarer",175,300,110,false
1,"Starfarer","600i Explorer",300,475,155,false
1,"Ironclad","Ironclad Assault",600,650,40,false
1,"Aurora Mk II","Reliant Kore",45,65,15,false
1,"Reliant Kore","Prospector",65,155,80,false
1,"Valkyrie","Carrack",375,600,200,true
`;

// The starter ships, like CCU Game's ships export.
// msrp = today's store price, pledge = what you paid, place = hangar or buyback
const EXAMPLE_SHIPS_CSV = `"name","insurance","msrp","pledge","place"
"Mustang Alpha","LTI",30,30,"hangar"
"Aurora Mk II","6 Months",45,40,"hangar"
"Avenger Titan","LTI",60,50,"hangar"
"Nomad","6 Months",80,70,"hangar"
"Cutlass Black","LTI",110,100,"hangar"
"Constellation Andromeda","LTI",240,225,"hangar"
`;

// A few pieces placed for you, so the chains aren't empty. Same format as the page's
// own layout: piece id -> chain id (the ids in chains.js). Piece ids are built by
// app.js from the CSV: "ship:<name> #1" for a ship, "<from> → <to> #1" for a CCU.
// A row that doesn't exist (you deleted it) or a piece that doesn't fit is skipped.
// Asgard ends up complete; Galaxy has a gap from $200 to $250 (click it to see which
// likely warbonds fit). Stage 4.4: the Ironclad row gets a start too, and its gap from
// C2 Hercules $400 to M2 Hercules $520 is filled with two teal ★ likely warbonds.
// The rest is up to you.
const EXAMPLE_LAYOUT = {
  ships: {
    "ship:Avenger Titan #1": "galaxy",
    "ship:Mustang Alpha #1": "asgard",
    "ship:Constellation Andromeda #1": "ironclad-1"
  },
  ccus: {
    "Avenger Titan → Cutlass Black #1":             "galaxy",
    "Cutlass Black → Freelancer MAX #1":            "galaxy",
    "Freelancer MAX → Constellation Taurus #1":     "galaxy",
    "Corsair → Redeemer #1":                        "galaxy",
    "Redeemer → Galaxy #1":                         "galaxy",
    "Mustang Alpha → Nomad #1":                     "asgard",
    "Nomad → C1 Spirit #1":                         "asgard",
    "C1 Spirit → Vulture #1":                       "asgard",
    "Vulture → Constellation Andromeda #1":         "asgard",
    "Constellation Andromeda → Vanguard Warden #1": "asgard",
    "Vanguard Warden → Asgard #1":                  "asgard",
    "Constellation Andromeda → Mercury Star Runner #1": "ironclad-1",
    "Mercury Star Runner → Caterpillar #1":         "ironclad-1",
    "Caterpillar → C2 Hercules #1":                 "ironclad-1",
    "M2 Hercules → Ironclad #1":                    "ironclad-1"
  },
  // NEW in Stage 4.4: teal ★ likely warbond pieces (never owned). Only the TARGET comes from
  // warbonds.js (real past sales); from / fromMsrp = the ship each one follows in the row:
  //   C2 Hercules $400 -> Prowler:     Prowler last-seen WB $410  ->  $410 - $400 = $10 cash
  //   Prowler $440 -> M2 Hercules:     M2 Hercules last-seen WB $485  ->  $485 - $440 = $45 cash
  // (A direct C2 Hercules -> M2 Hercules warbond would be $485 - $400 = $85.)
  warbonds: [
    { id: "wb-example-1", target: "Prowler",     from: "C2 Hercules", fromMsrp: 400, chain: "ironclad-1" },
    { id: "wb-example-2", target: "M2 Hercules", from: "Prowler",     fromMsrp: 440, chain: "ironclad-1" }
  ]
};
