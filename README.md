# Cartogram MCP server

> **Status: early-stage, active development.** Issues and PRs are welcome.

Remote MCP server (Streamable HTTP + OAuth 2.1/PKCE) that lets an
MCP-compatible AI agent (e.g. Claude Code) read and write a user's
Cartogram projects and diagrams, subject to the same per-project
access grants and read/write/admin scopes the user controls from
`/settings/integrations` in the web app.

Production instance: `https://mcp.cartogram.andrewpg.me` — point any
MCP-compatible client at that URL, it self-registers via Dynamic Client
Registration (RFC 7591) and walks the OAuth consent screen from there.

## Local development

Requires the Supabase backend running — see the sibling
[`cartogram-supabase`](https://github.com/Andrewdpg/cartogram-supabase) repo:

    supabase start   # from the cartogram-supabase repo

Then, from this repo:

    cp .env.example .env
    # fill in SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
    # from `supabase start`'s output, a random MCP_JWT_SIGNING_SECRET, and
    # MCP_FRONTEND_URL (where the frontend's OAuth consent screen lives)
    npm install
    npm run dev

## Testing

    npm test

## Tools exposed

| Tool | Scope | Notes |
|---|---|---|
| `list_projects` | read | |
| `list_diagrams` | read | returns diagrams no other diagram's `childDiagram` reaches — the ones a picker/agent needs a direct slug for |
| `get_diagram` | read | |
| `create_project` | write | auto-grants MCP access to the created project; seeds an empty `deployment` diagram |
| `create_diagram` | write | |
| `update_diagram` | write | optimistic-locking: pass the `version` from a prior `get_diagram` call; a mismatch returns `{ conflict: true }` |
| `validate_diagram` | none | dry-run shape validation, no DB write |
| `invite_collaborator` | admin | |

## Known limitations

- `delete_project` and `remove_collaborator` are intentionally not exposed
  (destructive, low-value for the "document a repo" flow this is built
  around — add later if there's real demand).
- `childDiagram` slugs are not validated against existing diagrams at write
  time — a typo creates a dangling reference instead of failing fast.
