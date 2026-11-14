/**
 * Host half of the Session manager bundle.
 *
 * Contributes two authenticated JSON routes to Connection:
 *   GET  /api/session-manager.list   — every visible stored session, newest first
 *   POST /api/session-manager.delete — remove one session-owned log directory
 *
 * DSH has no session-deletion API (the persistence seam is append-only), so the
 * delete route removes the session-owned directory the JSONL backend reports for
 * that exact session. Every safety check runs before the first filesystem write:
 * a live Session is refused, the log must sit in its own directory that holds
 * nothing but session log files, and no other stored session may share it.
 */
import { readdir, rm, rmdir } from 'node:fs/promises'
import { basename, dirname, isAbsolute } from 'node:path'

const LIST_PATH = '/api/session-manager.list'
const DETAIL_PATH = '/api/session-manager.detail'
const DELETE_PATH = '/api/session-manager.delete'

/** Canonical JSONL log file names: session.jsonl, session.v3.jsonl.zstd, … */
const LOG_FILE = /^session(?:\.v\d+)?\.jsonl(?:\.zstd)?$/
/** The backend's per-session lock artifact is the only tolerated extra entry. */
const LOCK_FILE = 'session.lock'
const SESSION_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/

export const inject = ['connection', 'sessionController', 'sessionQuery']

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

function failure(status, code, message) {
  return jsonResponse({ ok: false, code, message }, status)
}

/** Every session id in the subtree rooted at `rootId`, the root first. */
function collectTree(rootId, snapshots) {
  const ids = [rootId]
  const seen = new Set(ids)
  let grew = true
  while (grew) {
    grew = false
    for (const snapshot of snapshots) {
      const id = snapshot.header.id
      const parent = snapshot.header.parentSession
      if (seen.has(id) || typeof parent !== 'string' || !seen.has(parent)) continue
      seen.add(id)
      ids.push(id)
      grew = true
    }
  }
  return ids
}

/** Concatenate the human-readable blocks of one message payload. */
function blockText(content) {
  if (!Array.isArray(content)) return ''
  const parts = []
  for (const block of content) {
    if (!block || typeof block !== 'object') continue
    if (block.type === 'text' && typeof block.text === 'string') parts.push(block.text)
    else if (block.type === 'image') parts.push('[image]')
    else if (block.type === 'file') parts.push(`[file${block.attachment?.name ? ` ${block.attachment.name}` : ''}]`)
    else if (block.type === 'tool-call') parts.push(`[tool${block.name ? ` ${block.name}` : ''}]`)
  }
  return parts.join('\n').trim()
}

/** Turn one stored history record into a compact chat row, or null when unseen. */
function readMessage(record) {
  const event = record?.event ?? record
  if (!event || typeof event.type !== 'string' || !event.data) return null
  let role = null
  let text = ''
  if (event.type === 'user/message') {
    // Injected user-role context is not something the user typed.
    if (event.data.source?.kind !== 'user') return null
    role = 'user'
    text = blockText(event.data.content)
  } else if (event.type === 'assistant/message') {
    role = 'assistant'
    text = blockText(event.data.message?.content)
  } else if (event.type === 'tool/result') {
    role = 'tool'
    text = blockText(event.data.message?.content)
  }
  if (role === null || text.length === 0) return null
  return {
    seq: typeof event.seq === 'number' ? event.seq : null,
    role,
    time: typeof event.time === 'number' ? event.time : null,
    text: text.length > 1200 ? `${text.slice(0, 1200)}…` : text,
  }
}

export function apply(ctx) {
  const persistence = () => ctx.get('sessionPersistence')

  const liveSessionIds = () => {
    const store = ctx.get('sessions')
    return new Set((store?.list() ?? []).map((session) => session.id))
  }

  const readSnapshots = async (signal) => {
    const service = persistence()
    if (!service) return new Map()
    const snapshots = await service.list({ signal }).catch(() => [])
    const rows = Array.isArray(snapshots) ? snapshots : []
    return new Map(
      rows
        .filter((snapshot) => typeof snapshot?.header?.id === 'string')
        .map((snapshot) => [snapshot.header.id, snapshot]),
    )
  }

  const readTitles = async (ids, signal) => {
    const titles = new Map()
    if (ids.length === 0) return titles
    const observations = await ctx.sessionQuery.readTitleSnapshots(ids, signal).catch(() => [])
    for (const result of Array.isArray(observations) ? observations : []) {
      if (result.status !== 'fulfilled') continue
      const title = result.value?.title?.title
      if (typeof title === 'string' && title.length > 0) titles.set(result.sessionId, title)
    }
    return titles
  }

  const summarize = async (signal) => {
    try {
      // `sessionController.list` answers `{ items }` (SessionListValue).
      const value = await ctx.sessionController.list({}, signal)
      const items = Array.isArray(value) ? value : value?.items
      if (Array.isArray(items)) return items
    } catch {
      // The controller is the app's own list; fall back to the raw corpus below.
    }
    const records = await ctx.sessionQuery.listSessions(signal).catch(() => [])
    return (Array.isArray(records) ? records : []).map((record) => ({
      sessionId: record?.header?.id,
      updatedAt: record?.header?.createdAt,
      running: false,
      blank: false,
      cwd: record?.header?.cwd,
      parentSessionId: record?.header?.parentSession,
      origin: record?.header?.origin,
    })).filter((summary) => typeof summary.sessionId === 'string')
  }

  const toItem = (summary, snapshot, title, isLive) => ({
    sessionId: summary.sessionId,
    title: title ?? null,
    cwd: summary.cwd ?? snapshot?.header.cwd ?? null,
    updatedAt: summary.updatedAt ?? snapshot?.header.createdAt ?? 0,
    createdAt: snapshot?.header.createdAt ?? null,
    running: Boolean(summary.running),
    live: Boolean(isLive),
    blank: Boolean(summary.blank),
    origin: summary.origin ?? null,
    parentSessionId: summary.parentSessionId ?? null,
    eventCount: typeof snapshot?.eventCount === 'number' ? snapshot.eventCount : null,
    sizeBytes: typeof snapshot?.sizeBytes === 'number' ? snapshot.sizeBytes : null,
    onDisk: Boolean(snapshot?.location),
  })

  const listSessions = async (request) => {
    const signal = request.signal
    const summaries = await summarize(signal)
    const ids = summaries.map((summary) => summary.sessionId)
    const [snapshots, titles] = await Promise.all([
      readSnapshots(signal),
      readTitles(ids, signal),
    ])
    const live = liveSessionIds()

    const items = summaries.map((summary) => toItem(
      summary,
      snapshots.get(summary.sessionId),
      titles.get(summary.sessionId),
      live.has(summary.sessionId),
    ))
    items.sort((a, b) => b.updatedAt - a.updatedAt)
    return jsonResponse({ ok: true, items })
  }

  const detailSession = async (request) => {
    const url = new URL(request.url)
    const sessionId = url.searchParams.get('id')
    if (typeof sessionId !== 'string' || !SESSION_ID.test(sessionId)) {
      return failure(400, 'bad-request', 'A valid session id is required.')
    }
    const requestedLimit = Number.parseInt(url.searchParams.get('limit') ?? '', 10)
    const maxMessages = Number.isFinite(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, 50)
      : 20

    const service = persistence()
    if (!service) {
      return failure(503, 'session-storage-unavailable', 'No session persistence backend is mounted.')
    }
    const snapshot = await service.stat(sessionId, { signal: request.signal })
    if (!snapshot) {
      return failure(404, 'session-not-found', 'The session has no storage record.')
    }

    const signal = request.signal
    const summaries = await summarize(signal)
    const summary = summaries.find((entry) => entry.sessionId === sessionId) ?? {
      sessionId,
      updatedAt: snapshot.header?.createdAt ?? 0,
      running: false,
      blank: false,
      cwd: snapshot.header?.cwd,
      parentSessionId: snapshot.header?.parentSession,
    }
    const children = summaries.filter((entry) => entry.parentSessionId === sessionId)
    const [titles, childTitles] = await Promise.all([
      readTitles([sessionId], signal),
      readTitles(children.map((child) => child.sessionId), signal),
    ])
    const live = liveSessionIds()
    const item = toItem(summary, snapshot, titles.get(sessionId), live.has(sessionId))

    let recent = []
    let hasMore = false
    try {
      const page = await ctx.sessionController.events({
        address: { kind: 'session', sessionId },
        maxMessages,
      }, signal)
      const records = Array.isArray(page?.records) ? page.records : []
      hasMore = Boolean(page?.hasMore)
      recent = records.map((record) => readMessage(record)).filter(Boolean)
    } catch {
      // A cold or damaged log still yields the metadata above.
    }

    return jsonResponse({
      ok: true,
      item,
      detail: {
        path: typeof snapshot.location?.path === 'string' ? snapshot.location.path : null,
        formatStatus: snapshot.formatStatus ?? null,
        children: children.map((child) => ({
          sessionId: child.sessionId,
          title: childTitles.get(child.sessionId) ?? null,
          updatedAt: child.updatedAt ?? null,
        })),
        recent,
        hasMore,
      },
    })
  }

  const deleteSession = async (request) => {
    let body
    try {
      body = await request.json()
    } catch {
      return failure(400, 'bad-request', 'Request body is not valid JSON.')
    }
    const sessionId = body?.sessionId
    if (typeof sessionId !== 'string' || !SESSION_ID.test(sessionId)) {
      return failure(400, 'bad-request', 'A valid session id is required.')
    }

    const service = persistence()
    if (!service) {
      return failure(503, 'session-storage-unavailable', 'No session persistence backend is mounted.')
    }
    if (liveSessionIds().has(sessionId)) {
      return failure(409, 'session-live', 'The session is open in the running app; close it first.')
    }
    const snapshot = await service.stat(sessionId, { signal: request.signal })
    if (!snapshot) {
      return failure(404, 'session-not-found', 'The session has no storage record.')
    }

    const listed = await service.list({ signal: request.signal }).catch(() => [])
    const snapshots = Array.isArray(listed) ? listed : []
    const byId = new Map(snapshots.map((entry) => [entry.header.id, entry]))
    const targets = collectTree(sessionId, snapshots)
    const targetSet = new Set(targets)
    const live = liveSessionIds()

    // Phase one: validate every session in the tree before deleting anything.
    if (targets.some((id) => live.has(id))) {
      return failure(409, 'session-live', 'A session in this tree is open in the running app; close it first.')
    }

    const directories = new Map()
    for (const id of targets) {
      const record = byId.get(id)
      if (!record) {
        return failure(409, 'session-not-materialized', `The session ${id} has no storage record.`)
      }
      const location = record.location
      if (
        !location
        || location.kind !== 'jsonl'
        || typeof location.path !== 'string'
        || !isAbsolute(location.path)
      ) {
        return failure(409, 'session-not-materialized', `The session ${id} has no materialized log file.`)
      }
      if (!LOG_FILE.test(basename(location.path))) {
        return failure(409, 'session-unexpected-path', `The session ${id} does not point at a canonical log file.`)
      }
      const directory = dirname(location.path)
      const owner = directories.get(directory)
      if (owner !== undefined && owner !== id) {
        return failure(409, 'session-shared-directory', 'Two sessions share one directory.')
      }
      directories.set(directory, id)
    }

    const shared = snapshots.some((other) => {
      if (targetSet.has(other.header.id)) return false
      const otherLocation = other.location
      return Boolean(otherLocation?.path) && directories.has(dirname(otherLocation.path))
    })
    if (shared) {
      return failure(409, 'session-shared-directory', 'Another session outside this tree shares a directory.')
    }

    for (const directory of directories.keys()) {
      let entries
      try {
        entries = await readdir(directory, { withFileTypes: true })
      } catch (error) {
        if (error && error.code === 'ENOENT') continue
        throw error
      }
      const unexpected = entries.filter(
        (entry) => !entry.isFile() || (!LOG_FILE.test(entry.name) && entry.name !== LOCK_FILE),
      )
      if (unexpected.length > 0) {
        return failure(409, 'session-directory-unexpected', 'A session directory holds unexpected entries.')
      }
    }

    // Phase two: take the sessions out of the app's own workspace state first, so
    // the sidebar drops them through the normal archive channel instead of keeping
    // a stale row that can only fail to open. They are unarchived once their files
    // are gone; the registry then filters the now-invalid ids out on read.
    const registry = ctx.get('workspaceRegistry')
    const canArchive = Boolean(registry)
      && typeof registry.archiveSession === 'function'
      && typeof registry.unarchiveSession === 'function'
    const archivedIds = []
    let warning = null

    const releaseArchived = async () => {
      if (!canArchive) return
      for (const id of archivedIds.splice(0, archivedIds.length)) {
        try {
          await registry.unarchiveSession(id)
        } catch {
          warning = warning ?? 'workspace-unarchive-failed'
        }
      }
    }

    if (canArchive) {
      for (const id of targets) {
        try {
          await registry.archiveSession(id)
          archivedIds.push(id)
        } catch (error) {
          const busy = error?.name === 'WorkspaceActiveSessionError'
            || (Array.isArray(error?.activity) && error.activity.length > 0)
          await releaseArchived()
          if (busy) {
            return failure(409, 'session-busy', 'Background work still runs for this session, so nothing was deleted.')
          }
          warning = 'workspace-archive-failed'
          break
        }
      }
    } else {
      warning = 'workspace-registry-unavailable'
    }

    // Phase three: remove every validated session directory, then tidy empty projects.
    let removedFiles = 0
    try {
      for (const directory of directories.keys()) {
        try {
          const entries = await readdir(directory, { withFileTypes: true })
          await rm(directory, { recursive: true, force: true })
          removedFiles += entries.length
        } catch (error) {
          if (error && error.code === 'ENOENT') continue
          throw error
        }
        const projectDirectory = dirname(directory)
        try {
          const rest = await readdir(projectDirectory)
          if (rest.length === 0) await rmdir(projectDirectory)
        } catch {
          // A missing or non-empty project directory needs no cleanup.
        }
      }
    } catch (error) {
      await releaseArchived()
      throw error
    }

    await releaseArchived()

    return jsonResponse({
      ok: true,
      sessionId,
      deleted: targets,
      removedFiles,
      ...(warning === null ? {} : { warning }),
    })
  }

  const guarded = (handler) => async (request) => {
    try {
      return await handler(request)
    } catch (error) {
      if (error && (error.name === 'AbortError' || error.code === 'ABORT_ERR')) {
        return failure(499, 'cancelled', 'The request was cancelled.')
      }
      return jsonResponse({
        ok: false,
        code: 'internal',
        message: 'The host failed to complete the request.',
        detail: error instanceof Error ? error.message : String(error),
      }, 500)
    }
  }

  ctx.effect(() => {
    const disposeList = ctx.connection.fetch.register({
      path: LIST_PATH,
      methods: ['GET'],
      requestBody: 'buffered',
      fetch: guarded(listSessions),
    })
    const disposeDetail = ctx.connection.fetch.register({
      path: DETAIL_PATH,
      methods: ['GET'],
      requestBody: 'buffered',
      fetch: guarded(detailSession),
    })
    const disposeDelete = ctx.connection.fetch.register({
      path: DELETE_PATH,
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: guarded(deleteSession),
    })
    return () => {
      void disposeList()
      void disposeDetail()
      void disposeDelete()
    }
  })
}
