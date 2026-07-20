import express, { type Express } from 'express'
import { join, resolve } from 'node:path'
import { spawn as nodeSpawn } from 'node:child_process'
import { readRegistry, type Registry } from './registry.js'
import { listArtifactsTool } from './tools/listArtifacts.js'
import { getArtifactTool } from './tools/getArtifact.js'
import { listRepos } from './tools/listRepos.js'
import { buildRepoGraph } from './artifacts/repoGraph.js'
import type { SourceRef } from './validateDiagramShape.js'

function resolveRegisteredRepoDir(registryPath: string, repoId: string): string | null {
  const registry = readRegistry(registryPath)
  const entry = registry[repoId]
  if (!entry) return null
  return join(entry.path, '.waycairn')
}

// listRepos(cwd) is a plain directory scan — it has no idea which of those
// siblings are also registered, and MCP's list_repos tool wants it that
// way (an agent can target ANY local sibling via repoPath, registered or
// not). The UI's "local" section is presented as "not yet registered"
// though, so here — and only here — local entries already covered by a
// registered path are dropped, or every registered repo would show up
// twice: once as a clickable "registered" entry, once as a non-clickable
// "not registered" one.
function localOnly(cwd: string, registry: Registry): string[] {
  const registeredPaths = new Set(Object.values(registry).map((entry) => resolve(entry.path)))
  return listRepos(cwd).filter((name) => !registeredPaths.has(resolve(cwd, name)))
}

export type SpawnEditor = (cmd: string, args: string[]) => void

const defaultSpawnEditor: SpawnEditor = (cmd, args) => {
  nodeSpawn(cmd, args, { detached: true, stdio: 'ignore' }).unref()
}

// path:line or path:line-line (the range form already produced when nodes
// are documented) -> [relativePath, firstLineNumber | undefined]. Only the
// first number matters — editors jump to a line, not a range.
function splitRefPath(path: string): { relativePath: string; line?: string } {
  const match = path.match(/^(.*):(\d+)(?:-\d+)?$/)
  if (!match) return { relativePath: path }
  return { relativePath: match[1], line: match[2] }
}

export interface CreateUiServerOptions {
  spawnEditor?: SpawnEditor
}

export function createUiServer(
  cwd: string,
  registryPath: string,
  staticDir: string,
  options: CreateUiServerOptions = {}
): Express {
  const spawnEditor = options.spawnEditor ?? defaultSpawnEditor
  const app = express()
  app.use(express.json())

  app.get('/api/repos', (_req, res) => {
    const registered = readRegistry(registryPath)
    res.json({ local: localOnly(cwd, registered), registered })
  })

  app.get('/api/repo-graph', (_req, res) => {
    const registry = readRegistry(registryPath)
    const graph = buildRepoGraph(registryPath)
    const seen = new Set<string>()
    const groups: string[][] = []
    for (const repoId of Object.keys(registry)) {
      if (seen.has(repoId)) continue
      const component = [...graph.componentOf(repoId)].filter((id) => id in registry).sort()
      for (const id of component) seen.add(id)
      groups.push(component)
    }
    res.json({ groups })
  })

  app.get('/api/repos/:repoId/artifacts', (req, res) => {
    const waycairnDir = resolveRegisteredRepoDir(registryPath, req.params.repoId)
    if (!waycairnDir) {
      res.status(404).json({ error: `repoId ${JSON.stringify(req.params.repoId)} is not registered` })
      return
    }
    const kind = typeof req.query.kind === 'string' ? req.query.kind : 'diagram'
    res.json(listArtifactsTool(waycairnDir, kind))
  })

  app.get('/api/repos/:repoId/artifacts/:id', (req, res) => {
    const waycairnDir = resolveRegisteredRepoDir(registryPath, req.params.repoId)
    if (!waycairnDir) {
      res.status(404).json({ error: `repoId ${JSON.stringify(req.params.repoId)} is not registered` })
      return
    }
    const kind = typeof req.query.kind === 'string' ? req.query.kind : 'diagram'
    const record = getArtifactTool(waycairnDir, kind, req.params.id)
    if (!record) {
      res.status(404).json({ error: `artifact ${JSON.stringify(req.params.id)} not found` })
      return
    }
    res.json(record)
  })

  app.post('/api/open-file', (req, res) => {
    const body = req.body as { repoId?: string; ref?: string | SourceRef }
    const ref = body.ref
    const effectiveRepoId = typeof ref === 'object' && ref !== null ? ref.repo : body.repoId
    if (!effectiveRepoId) {
      res.status(400).json({ error: 'missing repoId' })
      return
    }
    const registry = readRegistry(registryPath)
    const entry = registry[effectiveRepoId]
    if (!entry) {
      res.status(404).json({ error: `repoId ${JSON.stringify(effectiveRepoId)} is not registered` })
      return
    }
    const rawPath = typeof ref === 'object' && ref !== null ? ref.path : ref
    if (!rawPath) {
      res.status(400).json({ error: 'missing ref path' })
      return
    }
    const { relativePath, line } = splitRefPath(rawPath)
    const absPath = join(entry.path, relativePath)
    const target = line !== undefined ? `${absPath}:${line}` : absPath
    const editorCmd = process.env.EDITOR ?? 'code'
    const useGotoLine = line !== undefined && !process.env.EDITOR
    try {
      spawnEditor(editorCmd, useGotoLine ? ['-g', target] : [target])
      res.status(200).json({})
    } catch (err) {
      res.status(500).json({ error: `could not launch editor '${editorCmd}', is it on PATH? (${(err as Error).message})` })
    }
  })

  app.use(express.static(staticDir))

  // React Router routes (/repos/:repoId, /repos/:repoId/diagrams/:diagramId,
  // ...) exist only client-side — the server has no matching file or route
  // for them. Without this, a direct load or refresh on one of those URLs
  // 404s instead of booting the SPA, which then takes over routing itself.
  // Scoped to non-/api paths so a genuinely unmatched API route still 404s
  // as itself rather than silently returning HTML.
  app.get(/^(?!\/api\/).*/, (_req, res) => {
    // `root` matters here beyond convention: res.sendFile(absolutePath) with
    // no root makes the `send` package's dotfile-security check inspect
    // every segment of the FULL absolute path — a global npm prefix like
    // ~/.npm-global (a real, common setup) has a dot-prefixed segment and
    // gets rejected as a "dotfile" access, 404ing a file that genuinely
    // exists. Passing root scopes that check to the path relative to it.
    res.sendFile('index.html', { root: staticDir })
  })

  return app
}
