# waycairn

> **Status: early-stage, active development.** Issues and PRs are welcome.

A local-first MCP server for documenting a codebase as you work in it —
architecture diagrams and notes stored inside the repo itself
(`.waycairn/`), versioned in git, no cloud backend, no auth. An AI agent
(Claude Code, Codex CLI, opencode) reads and writes documentation as part
of its normal workflow, nudged to keep it current.

## Install

    npm install -g waycairn   # not yet published — for now, clone + npm install + npm link

Inside a repo you want to document:

    waycairn init

This computes the repo's identity from its git `origin` remote, registers
it in a global `~/.waycairn/registry.json`, ensures `.waycairn/index.sqlite`
is gitignored, and installs the MCP server + (where supported) a
documentation Skill and a session-end nudge for every AI agent detected on
the machine (Claude Code, Codex CLI, opencode).

## How it stores documentation

Every artifact is a JSON file under `.waycairn/<kind>/<id>.json` — the
versioned source of truth, small enough that two people documenting
different things on different branches rarely conflict. A derived,
gitignored SQLite index (`.waycairn/index.sqlite`) gives the MCP server
fast reads; it's rebuilt lazily from the `.json` files whenever it's stale
(a `git pull`, a branch switch, a manual edit), never the thing you're
supposed to merge.

The only kind implemented today is `"diagram"` — a C4/UML-ish node/edge
graph — but the storage layer is kind-agnostic: adding a new kind (session
notes, ADRs, ...) is a new validator plus one registry entry, not a
rewrite.

## Tools exposed (all local, no auth, no scopes)

| Tool | Notes |
|---|---|
| `list_artifacts` | lists every artifact of a `kind` in a repo |
| `get_artifact` | fetch one artifact by `kind` + `id` |
| `upsert_artifact` | the only write path — validates before writing; scoped to the repo the agent is actually in, never a different one |
| `validate_artifact` | dry-run validation, no write |
| `list_repos` | discovers repos: "local" (siblings under the session's working directory) and "registered" (anywhere on the machine, via `waycairn init`) |

`list_artifacts`/`get_artifact` take either `repoPath` (relative to the
session's working directory — the common case, and the only option when
the session is a parent folder of several sibling repos) or `repoId` (a
registered repo's global id, reaching it independent of where the current
session happens to be open). `upsert_artifact` only takes `repoPath` — an
agent documents the repo it's in, not some other repo it doesn't have
open.

A diagram node can reference another repo's artifact via
`externalRef: { repo: "<repoId>", artifactId: "<id>" }` — validated for
shape only when written (same as `childDiagram`'s existing behavior: a
typo creates a dangling reference instead of failing fast), resolved later
by whoever reads it, via `get_artifact`'s `repoId` parameter.

## CLI

    waycairn init   # register this repo, install agent integrations
    waycairn mcp    # start the stdio MCP server (what an agent's config actually launches)

## Testing

    npm test

## Known limitations

- Not yet published to npm — install from source.
- Codex's session-end hook only fires once the user has marked the project
  trusted in Codex itself; `waycairn init` can't detect or control that.
- A registry entry whose `path` has moved or been deleted isn't cleaned up
  automatically — re-run `waycairn init` from the new location.
- `externalRef`/`childDiagram` aren't validated against what they point at
  when written — a typo is only visible when something tries to resolve
  the reference later.
- No visual UI yet — diagrams are read/written as JSON via the MCP tools.
