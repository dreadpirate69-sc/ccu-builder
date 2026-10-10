// prices.js: SPECULATIVE PRICES for ships that are not released yet. Plain data, safe to edit.
//
// When the "Speculative prices*" box in the header is ticked, every ship listed here
// uses its "spec" price instead of its real price, everywhere: piece ends and row ends.
// Ships NOT listed here always keep their real price.
//
//   store - the ship's price in the store today, as the sheet lists it (null = not on sale)
//   spec  - the community consensus: the MEDIAN (middle) guess. Not official!
//
// Source: community "Release Price Speculation" sheet, snapshot 28 Sep 2026.
// Only ships marked Concept or Production (= not released yet) are listed, plus
// Carrack as a released-price entry for the generic example chain.
// Names are spelled like CCU Game spells them, because that's how they are matched
// (upper/lower case, hyphens and "(LTI)" don't matter).
//
// Where your CCU Game export shows a DIFFERENT price than the sheet's store price,
// it says so in a comment. In speculative mode the spec price is used either way.
//
// Remember the comma after every line except the last one.

const SPEC_PRICES = {
  // ---- big concept / in-production ships (19 guesses each unless noted) ----
  "Galaxy":           { store: 380,  spec: 440  },  // standalone store $380 verified at starcitizen.tools; spec sheet guess $440
  "Kraken":           { store: 1650, spec: 1950 },
  "Ranger CV":        { store: 35,   spec: 40   },  // sheet: "Ranger CV/RC"
  "Ranger RC":        { store: 35,   spec: 40   },  // sheet: "Ranger CV/RC"
  "Ranger TR":        { store: 40,   spec: 45   },
  "G12":              { store: 60,   spec: 65   },  // sheet: "G12 / G12R". Store price not re-checked; a CCU Game export may show a different one
  "G12r":             { store: 60,   spec: 65   },  // sheet: "G12 / G12R"
  "G12a":             { store: 65,   spec: 70   },  // sheet: "G12 A". Store price not re-checked; a CCU Game export may show a different one
  "Legionnaire":      { store: 120,  spec: 150  },
  "E1 Spirit":        { store: 150,  spec: 175  },
  "Expanse":          { store: 150,  spec: 175  },
  "Zeus Mk II MR":    { store: 190,  spec: 220  },  // sheet: "Zeus MR"
  "Vulcan":           { store: 200,  spec: 240  },
  "Crucible":         { store: 350,  spec: 500  },
  "Endeavor":         { store: 350,  spec: 500  },
  "Genesis":          { store: 400,  spec: 500  },
  "Hull D":           { store: 550,  spec: 675  },
  "Arrastra":         { store: 575,  spec: 650  },
  "Liberator":        { store: 575,  spec: 675  },
  "Merchantman":      { store: 650,  spec: 975  },
  "Orion":            { store: 650,  spec: 900  },
  "Odyssey":          { store: 700,  spec: 800  },
  "Nautilus":         { store: 725,  spec: 825  },
  "Hull E":           { store: 750,  spec: 975  },
  "Pioneer":          { store: 925,  spec: 1050 },
  "Kraken Privateer": { store: 2000, spec: 2400 },
  "Javelin":          { store: 3000, spec: 3800 },
  "Odin":             { store: 5900, spec: 5000 },  // 18 guesses; median is BELOW the store price

  // ---- smaller "straight to flyable" concepts: not on sale, so store is null ----
  // Names as on the sheet (not checked
  // against CCU Game spelling). Few guesses = weak consensus.
  "Greycat MFC":       { store: null, spec: 50  },  // 10 guesses
  "Anvil HM6 Auxilia": { store: null, spec: 135 },  // 11 guesses
  "Forge":             { store: null, spec: 300 },  // 8 guesses
  "CSV-FM":            { store: null, spec: 75  },  // 9 guesses
  "Starlancer BLD":    { store: null, spec: 375 },  // 5 guesses
  "Zeus Mk II ST":     { store: null, spec: 220 },  // sheet: "Zeus ST", 6 guesses
  "Andromeda MKV":     { store: null, spec: 250 },  // only 1 guess
  "RSI Skylark":       { store: null, spec: 125 },  // only 1 guess
  "Drake Marauder":    { store: null, spec: 90  },  // only 1 guess
  "Gatac Hyūn":        { store: null, spec: 175 },  // only 1 guess

  // Released ship kept here so the generic Carrack example can auto-fill its price.
  "Carrack":           { store: 600,  spec: 600 }   // standalone store price verified at starcitizen.tools
  // Left out on purpose: Taurus MKV, Aquilla MKV, Phoenix MKV and M60. The sheet has a
  // single guess of $0 for each, which is not a real price.
};
