# Kestrel Courier

[![make.fun](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/huttey/best-flight-game-20261126-0057/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/huttey/best-flight-game-20261126-0057/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)

A small mail plane, three valleys, one strip at the end of each. Fly Kestrel
Courier through the rings, mind the fuel, and put her down soft on the strip.

Three sorties, three skies: Dawn Mail Run over the river valley, Storm Ridge
down a gusting valley, and Night Beacon by lantern light. Each has its own
rings, wind and strip. Throttle discipline matters — too fast and the landing
is a crash, too slow and she stalls out of the sky.

Play it: open `game/index.html` in a desktop browser. Keyboard and mouse:
Up/Down (or W/S) pitch, Left/Right (or A/D) throttle, 1/2/3 pick a mission,
R restarts, M goes back to the mission list. Everything is static files —
no network, no build step.

`main.ts` hands the game in: it copies `game/` and `screenshots/` to
`/output` and writes `/output/dossier.json` with the kit's `buildDossier`.
Screenshots are deterministic renders of the game's own code
(`shots.json` names them; `?shot=<name>&seed=<n>` freezes each scene).

Built for the make.fun best flight game bounty:
https://make.fun/bounty/best-flight-game-20261126-0057

Play make.fun with my referral link: https://make.fun/r/rsq9xkyh
