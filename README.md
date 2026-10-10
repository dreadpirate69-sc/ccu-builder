# CCU Builder 1.0

**Try it online:** https://dreadpirate69-sc.github.io/ccu-builder/

Plan your Star Citizen CCU upgrade chains on a price ruler, using the CSV exports from CCU Game.
Everything runs in your browser, on your own computer. No account, no install, no internet needed
(except for the links).

Built by Dreadpirate69. Free, non-commercial fan tool.

Credits: CCU and ship data come from your exports from CCU Game (https://ccugame.app/).
Community price estimates come from the Release Price Speculation tab of the community's
Star Citizen Stuff sheet (https://docs.google.com/spreadsheets/d/1TqVcGcfSZBX4CZaqt4JxyUGZcByutNwo1pRBW29zzpE/edit?gid=2139030025#gid=2139030025).
Past warbond sale prices (warbonds.js) come from CCU Game's CCU price history
(https://ccugame.app/) and the TEST Squadron "WB CCU Watch" sale threads
(https://testsquadron.com/), plus a few reddit sale posts.
Thanks to all of them. This app wouldn't exist without them.

## Setup (one time)
**Online:** open https://dreadpirate69-sc.github.io/ccu-builder/ in your browser. Nothing to install.

**Offline (on your own computer):**
1. Download the files (on GitHub: the green **Code** button, then **Download ZIP**) and unzip
   them anywhere you like (for example Documents\ccu-builder). Keep all the files together in
   one folder: index.html, CCU-Builder.html, app.js, chains.js, prices.js, example.js,
   warbonds.js, style.css, logo.png (the round picture next to the title), community.png
   (CIG's "Made by the Community" logo, top right), README.md and LICENSE.
2. Double-click **CCU-Builder.html** (or **index.html**, it's the same page). It opens in your
   browser. That's it.

## Getting your data
- In CCU Game, export your **CCUs** and your **ships** as CSV files.
- Click **Load CCU Game CSV** and pick the CCUs file. Click **Load ships CSV** and pick the
  ships file. (Mixed them up? The page tells you.)
- Only the columns the app needs are kept. Your account name is never kept or shown.
- Prices come from your CCU Game export. If you set speculative prices in CCU Game, those are
  what the app uses.
- No CSV yet? Click **Try example data** to play with a made-up hangar (none of it is real).
  Loading your own CSV later replaces the example.
- **? Help** shows the short welcome steps again at any time.

## Quick tour
**Chains (right side).** Each row is one chain toward a goal ship, drawn on a price ruler from $0.
- **+ Add chain** to add a goal, Edit / Delete / ↑ ↓ on each row. **Clear all chains** removes
  the example chains; **Load example chains** brings them back.
- Drag a gray **starter ship** onto a row's **$0** slot, then drag **CCUs** from
  **Your CCUs (owned)** (left column, under Your ships) after it. A white box shows the one spot where
  a piece fits.
- Red ✗ means a piece doesn't link up (wrong ship). Striped "BB" pieces are in your buyback.
- **+ Add starter ship** adds a ship you don't own yet ("planned"); its price counts as missing.
- **Your ships** (top of the left column) lists every ship from your ships CSV. Long lists scroll
  inside the box; click the title to fold it away if you want more room.
- Ships with lifetime insurance get a red **LTI** tag. A chain whose starter ship isn't LTI gets
  a small **no LTI** tag: a CCU keeps the insurance of the ship you start from.

**Gaps.** A yellow block is a stretch of a chain you don't have a CCU for yet.
- Click a gap and the **Suggested warbonds ★** box (left column, below your CCUs)
  lists CCUs that fit in it, all warbonds first, then all standard CCUs:
  - with a teal **WB** badge = warbond CCU, paid in **cash**, at its last-seen sale price;
  - no badge = standard CCU, paid with **store credit**, marked **estimated**.
- You see the ones that connect first; tick **Show all** for everything in between.
- Drop one in the middle of a gap and you get two smaller gaps to plan.

**Suggested warbonds ★ (not owned, past prices).** Click a chain's name and this box (left
column, below your CCUs) lists past warbond sales that could fill it. Drag a teal ★ piece onto a chain to plan it.
- The prices come from warbonds.js (last updated 2026-09-30). They are **past sale prices,
  not a promise** the sale comes back. Always double-check on RSI before you buy.
- Tags: **unconfirmed** (weaker source), **lower confidence** (only the sale price is known),
  **price changed since** (the ship costs something else now).
- Teal pieces are plans, not owned: they never count as paid, and their stretch still counts
  as missing.

**🛒 Shopping list.** Every teal piece you place is added by itself, in two sections:
**Warbond CCUs** (paid in cash) and **Standard CCUs** (paid with store credit, estimated from
today's store prices), each with its own total.
- **Copy** (paste it anywhere), **Download .txt**, or **Email to myself** (opens your own mail
  app; you type your address and press send).
- Email is best for short lists: long lists can get cut off by mail apps. Use Copy or
  Download .txt for those.

**Totals (top bar).** Value, paid, savings and missing for all chains. Planned warbonds are
added up as **cash** ("Planned at last-seen WB"), planned standard CCUs as **store credit**
("Planned credit (est.)").

**Speculative prices.** Tick the "Speculative prices*" box to show concept ships at the community's
guessed release price instead of today's store price. Untick it to go back; nothing gets moved. An orange ⚠
means two guesses contradict each other (not your mistake).

## Saving your work
- The page saves by itself in your browser, so closing and reopening usually keeps everything.
  Next to the buttons it shows when it last saved, and an orange warning if your browser won't
  let it save.
- But browsers can lose that for pages opened from a file (cleanup tools, clearing history,
  another browser or PC). So click **Save to file** now and then: it downloads one .json file
  with your chains, pieces and CSV data. Your account name is not in it.
- After your first CSV load, a small tip suggests **Save to file**. Click **Not now** and it
  won't come back.
- **Load from file** brings a saved file back (it asks before replacing what you have).

## Tips and limits
- Your CSV's ship prices win: once you load an export, its prices are used for those ships, and
  prices.js / warbonds.js only fill in ships your export doesn't have.
- Small spelling differences in ship names are ignored ("G12 R" = "G12r", "Mercury" = "Mercury Star Runner").
- Prices for concept ships are community estimates, not official.
- Warbond prices are what ships sold for in the past. They change and come and go.
- Warbonds under $100 have become rare. Past sales below that may not come back.
- Feedback and bug reports are very welcome (on GitHub: the **Issues** tab).

## Notices
This is an unofficial Star Citizen fan site, not affiliated with the Cloud Imperium group of companies. All content on this site not authored by its host or users are property of their respective owners.

This site is not endorsed by or affiliated with the Cloud Imperium or Roberts Space Industries group of companies. All game content and materials are copyright Cloud Imperium Rights LLC and Cloud Imperium Rights Ltd. Star Citizen®, Squadron 42®, Roberts Space Industries®, and Cloud Imperium® are registered trademarks of Cloud Imperium Rights LLC. All rights reserved.

Official Star Citizen site: https://robertsspaceindustries.com/

Not affiliated with CCU Game either.

The "Made by the Community" logo (`community.png`, white version) is Cloud Imperium's
official fan kit asset. It is used here unaltered (no recolor, filter or other change, only
shown at a smaller size), under the Star Citizen Fankit Agreement.

**If you ever host this online:** the web address (domain) must not contain "Star Citizen",
"Roberts Space Industries", "Cloud Imperium", "Turbulent", "Squadron 42" or the name of a ship
manufacturer (for example Anvil, Aegis, Drake or Origin). Section 2(k) of the Fankit Agreement
also asks you to send the site's URL to legal_notices@cloudimperiumgames.com. Keep the notices
above and the logo on the page, and keep it free and non-commercial.

## License
The app's code is free to use under the MIT License (see LICENSE), copyright dreadpirate69-sc. That covers only
Dreadpirate69's own code and text. Star Citizen names, ship names and the "Made by the
Community" logo belong to Cloud Imperium and are used under the Fankit Agreement, not under
the MIT License.
