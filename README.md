# architecture-map MCP server

Remote MCP server (Streamable HTTP + OAuth 2.1/PKCE) that lets an
MCP-compatible AI agent (e.g. Claude Code) read and write a user's
architecture-map projects and diagrams, subject to the same per-project
access grants and read/write/admin scopes the user controls from
`/settings/integrations` in the web app.

## Local development

Requires the Supabase backend running — see the sibling
`architecture-map-supabase` repo:

    supabase start   # from the architecture-map-supabase repo

Then, from this repo:

    cp .env.example .env
    # fill in SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
    # from `supabase start`'s output, a random MCP_JWT_SIGNING_SECRET, and
    # MCP_OAUTH_ALLOWED_REDIRECT_URIS (the exact redirect_uri your MCP
    # client will use — required, /oauth/authorize rejects anything else)
    npm install
    npm run dev

## Testing

    npm test

## Tools exposed

| Tool | Scope | Notes |
|---|---|---|
| `list_projects` | read | |
| `get_diagram` | read | |
| `create_project` | write | auto-grants MCP access to the created project |
| `create_diagram` | write | |
| `update_diagram` | write | optimistic-locking: pass the `version` from a prior `get_diagram` call; a mismatch returns `{ conflict: true }` |
| `validate_diagram` | none | dry-run shape validation, no DB write |
| `invite_collaborator` | admin | |

## Known limitations

- `/oauth/authorize`'s session check is a placeholder — wiring it to a real
  Supabase session via the web app's login flow is a deployment-integration
  step not yet implemented. See
  `docs/superpowers/plans/2026-07-12-mcp-server.md` in the
  `architecture-map-front` repo (Task 4's follow-up note) for the original
  design context.
- `delete_project` and `remove_collaborator` are intentionally not exposed
  (destructive, low-value for the "document a repo" flow this is built
  around — add later if there's real demand).
