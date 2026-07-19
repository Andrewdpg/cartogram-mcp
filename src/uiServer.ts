import express, { type Express } from 'express'
import { join } from 'node:path'
import { readRegistry } from './registry.js'
import { listArtifactsTool } from './tools/listArtifacts.js'
import { getArtifactTool } from './tools/getArtifact.js'
import { listRepos } from './tools/listRepos.js'

function resolveRegisteredRepoDir(registryPath: string, repoId: string): string | null {
  const registry = readRegistry(registryPath)
  const entry = registry[repoId]
  if (!entry) return null
  return join(entry.path, '.waycairn')
}

export function createUiServer(cwd: string, registryPath: string, staticDir: string): Express {
  const app = express()

  app.get('/api/repos', (_req, res) => {
    res.json({ local: listRepos(cwd), registered: readRegistry(registryPath) })
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

  app.use(express.static(staticDir))

  return app
}
