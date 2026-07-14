# NOVERIS Architecture Reference

Project Genesis Studio owns the canonical NOVERIS Architecture Workspace. The Game repository consumes sanitized Studio runtime exports and must not create a competing architecture, copy the full Architecture Workspace, or expose internal decision records to players.

Current compatibility reference:

- architectureVersion: `1.0.0`
- runtimeVersion: `game-runtime-v1`
- contentVersion: `12`
- policy: `studio-wins`

Studio Architecture wins when implementation conflicts with local assumptions. Studio owns canonical gameplay, presentation definitions, runtime contracts, and cross-client architectural decisions. The Game must not invent systems already owned by Studio; changes requiring architectural decisions must be made in Studio first.

## Codex Workflow

Future Game Codex tasks should begin with: read and follow the canonical Project Genesis Studio Architecture Workspace. If a requested implementation conflicts with Architecture, stop, report the conflict, and request a Studio architecture decision or update before changing Game behavior.

## Conflict Reports

Use a lightweight conflict report when Game work needs a new canonical economy field, mobile behavior conflicts with a Studio profile, a save schema requires an architectural decision, or UI hierarchy contradicts Civilization Command rules.

Include:

- requested change
- conflicting architecture section
- affected clients
- recommended Studio decision

Do not automatically modify Studio from the Game project.
