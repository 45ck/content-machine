# Codex Reddit Story Empty Project v1

Blackbox reproduction test for the shipped Reddit story lane.

Goal:

- start from a fresh project folder
- install the local package as a dependency
- materialize `.content-machine/`
- ask Codex CLI to make a similar Reddit split-screen short
- keep the work inside this experiment folder
- run the project commands under Node `20.x`, not the host shell's
  older default runtime

Target style:

- Reddit screenshot-style opener card
- story-related moving footage on the top half after the opener
- Subway Surfers gameplay on the bottom half
- midpoint overlay captions with active-word emphasis

Key paths:

- `project/` - isolated empty-project workspace
- `project/.content-machine/` - installed skill pack
- `project/assets/` - local video assets available to Codex
- `project/reference/` - exact local request artifacts and lane guidance
- `logs/` - Codex CLI logs
- `prompt.md` - exact Codex instructions
- `report.md` - what the run actually produced
