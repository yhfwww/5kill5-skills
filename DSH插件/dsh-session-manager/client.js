/**
 * Browser half of the Session manager bundle.
 *
 * Contributes a first-class central panel (`main` key `session-manager`) and a
 * sidebar-foot action beside Settings that opens it. The panel lists every
 * visible stored session, opens one session's detail (metadata, log path,
 * children, recent messages) on click, and deletes a session only after a
 * second confirmation. Data comes from this package's authenticated Host routes
 * (`/api/session-manager.list|detail|delete`).
 */
window.__ModuleLoader__.load({
  id: '@local/dsh-session-manager',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const NS = 'dsh-session-manager'
    const LIST_URL = 'api/session-manager.list'
    const DETAIL_URL = 'api/session-manager.detail'
    const DELETE_URL = 'api/session-manager.delete'
    const PANEL_KEY = 'session-manager'
    const RECENT_LIMIT = 20

    const EN = {
      'nav.title': 'Session manager',
      'page.title': 'Session manager',
      'page.description': 'Browse every session stored on this machine, open one for details, and delete the ones you no longer need.',
      'actions.refresh': 'Refresh',
      'actions.refreshing': 'Refreshing…',
      'actions.back': 'Back to sessions',
      'actions.backToConversation': 'Back to conversation',
      'list.loading': 'Loading sessions…',
      'list.empty': 'No stored sessions yet.',
      'row.delete': 'Delete',
      'row.open': 'Open details',
      'row.live': 'Open now',
      'row.running': 'Running',
      'row.child': 'Sub-session',
      'row.blank': 'Empty',
      'row.liveHint': 'This session is open in the running app, so it cannot be deleted.',
      'meta.updated': 'updated',
      'meta.events': 'events',
      'meta.unknownCwd': 'no working directory',
      'detail.loading': 'Loading details…',
      'detail.error': 'Could not load details',
      'detail.id': 'Session id',
      'detail.cwd': 'Working directory',
      'detail.created': 'Created',
      'detail.updated': 'Last activity',
      'detail.path': 'Log file',
      'detail.pathMissing': 'not materialized on disk',
      'detail.events': 'Events',
      'detail.size': 'Size',
      'detail.parent': 'Parent session',
      'detail.children': 'Sub-sessions',
      'detail.noChildren': 'None',
      'detail.recent': 'Recent messages',
      'detail.noRecent': 'No readable messages in this session.',
      'detail.moreRecent': 'Earlier messages are not shown.',
      'detail.formatMigration': 'Needs format migration',
      'detail.delete': 'Delete this session',
      'role.user': 'You',
      'role.assistant': 'Assistant',
      'role.tool': 'Tool',
      'confirm.title': 'Delete this session?',
      'confirm.body': 'Its log file is removed from disk and cannot be restored.',
      'confirm.childrenPrefix': 'Its tree also holds ',
      'confirm.childrenSuffix': ' sub-session(s); they are deleted too.',
      'confirm.cancel': 'Cancel',
      'confirm.confirm': 'Delete permanently',
      'confirm.busy': 'Deleting…',
      'notice.deleted': 'Deleted',
      'notice.deletedTreePrefix': 'Deleted ',
      'notice.deletedTreeSuffix': ' sessions, including sub-sessions: ',
      'notice.staleSidebar': 'refresh the page if the sidebar still lists it',
      'error.load': 'Could not load sessions',
      'error.detail': 'Could not load details',
      'error.delete': 'Could not delete the session',
      'error.http': 'The request failed with status',
      'error.badPayload': 'The host returned an unexpected response.',
      'error.session-live': 'This session is open in the running app. Close or restart the app, then delete it again.',
      'error.session-not-found': 'The session no longer exists.',
      'error.session-not-materialized': 'The session has no file on disk yet.',
      'error.session-storage-unavailable': 'Session storage is not available in this deployment.',
      'error.session-unexpected-path': 'The session log is not in the expected layout, so nothing was deleted.',
      'error.session-shared-directory': 'Another session shares this directory, so nothing was deleted.',
      'error.session-directory-unexpected': 'The session directory holds unexpected entries, so nothing was deleted.',
      'error.session-busy': 'Background work still runs for this session, so nothing was deleted.',
      'error.bad-request': 'The request was rejected.',
      'error.internal': 'The host reported an internal error.',
      'error.unknown': 'The request could not be completed.',
    }

    const ZH = {
      'nav.title': '会话管理',
      'page.title': '会话管理',
      'page.description': '查看本机保存的全部会话，点开任意会话查看详情，并删除不再需要的会话。',
      'actions.refresh': '刷新',
      'actions.refreshing': '刷新中…',
      'actions.back': '返回会话列表',
      'actions.backToConversation': '返回对话',
      'list.loading': '正在加载会话…',
      'list.empty': '还没有已保存的会话。',
      'row.delete': '删除',
      'row.open': '查看详情',
      'row.live': '打开中',
      'row.running': '运行中',
      'row.child': '子会话',
      'row.blank': '空会话',
      'row.liveHint': '该会话正被当前应用打开，暂时无法删除。',
      'meta.updated': '更新于',
      'meta.events': '条记录',
      'meta.unknownCwd': '无工作目录',
      'detail.loading': '正在加载详情…',
      'detail.error': '加载详情失败',
      'detail.id': '会话 ID',
      'detail.cwd': '工作目录',
      'detail.created': '创建时间',
      'detail.updated': '最近活动',
      'detail.path': '日志文件',
      'detail.pathMissing': '尚未落盘',
      'detail.events': '事件数',
      'detail.size': '文件大小',
      'detail.parent': '上级会话',
      'detail.children': '子会话',
      'detail.noChildren': '无',
      'detail.recent': '最近消息',
      'detail.noRecent': '该会话没有可显示的消息。',
      'detail.moreRecent': '更早的消息未显示。',
      'detail.formatMigration': '需要格式迁移',
      'detail.delete': '删除该会话',
      'role.user': '你',
      'role.assistant': '助手',
      'role.tool': '工具',
      'confirm.title': '确定删除这个会话？',
      'confirm.body': '会话日志将从磁盘移除，且无法恢复。',
      'confirm.childrenPrefix': '该会话下还有 ',
      'confirm.childrenSuffix': ' 个子会话，将一并删除。',
      'confirm.cancel': '取消',
      'confirm.confirm': '确认永久删除',
      'confirm.busy': '删除中…',
      'notice.deleted': '已删除',
      'notice.deletedTreePrefix': '已删除 ',
      'notice.deletedTreeSuffix': ' 个会话（含子会话）：',
      'notice.staleSidebar': '侧边栏若仍显示该会话，刷新页面即可同步',
      'error.load': '加载会话失败',
      'error.detail': '加载详情失败',
      'error.delete': '删除会话失败',
      'error.http': '请求失败，状态码',
      'error.badPayload': 'Host 返回了无法识别的响应。',
      'error.session-live': '该会话正被当前应用打开，请先关闭或重启应用后再删除。',
      'error.session-not-found': '该会话已不存在。',
      'error.session-not-materialized': '该会话还没有落盘文件。',
      'error.session-storage-unavailable': '当前部署没有可用的会话存储。',
      'error.session-unexpected-path': '会话日志路径不符合预期，已放弃删除。',
      'error.session-shared-directory': '该目录被其他会话共用，已放弃删除。',
      'error.session-directory-unexpected': '会话目录包含未知文件，已放弃删除。',
      'error.session-busy': '该会话上仍有后台任务或子会话在运行，已放弃删除。',
      'error.bad-request': '请求被拒绝。',
      'error.internal': 'Host 内部错误。',
      'error.unknown': '请求未能完成。',
    }

    const CSS = `
.dsm-page { box-sizing: border-box; height: 100%; overflow-y: auto; padding: 22px 26px 44px; background: var(--dsw-alias-bg-base); }
.dsm-overlay { position: fixed; inset: 0; z-index: 60; background: var(--dsw-alias-bg-base); overflow: hidden; pointer-events: auto; }
.dsm-wrap { max-width: 960px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px; }
.dsm-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.dsm-heading { margin: 0; font-size: 16px; font-weight: 600; color: var(--dsw-alias-label-primary); }
.dsm-sub { margin: 5px 0 0; font-size: 12px; line-height: 1.55; color: var(--dsw-alias-label-secondary); }
.dsm-header-actions { display: flex; align-items: center; gap: 8px; flex: none; }
.dsm-button {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  height: 28px; padding: 0 12px; border-radius: 8px;
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font-size: 12px; font-family: inherit; cursor: pointer; white-space: nowrap;
}
.dsm-button:hover:not(:disabled) { background: var(--dsw-alias-bg-layer-2); }
.dsm-button:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
.dsm-button:disabled { opacity: .5; cursor: default; }
.dsm-button-quiet { border-color: transparent; background: transparent; color: var(--dsw-alias-label-secondary); }
.dsm-button-quiet:hover:not(:disabled) { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.dsm-button-danger { border-color: var(--dsw-alias-state-error-primary); color: var(--dsw-alias-state-error-primary); background: transparent; }
.dsm-button-danger:hover:not(:disabled) { background: var(--dsw-alias-state-error-primary); color: var(--dsw-alias-bg-base); }
.dsm-button-confirm { border-color: var(--dsw-alias-state-error-primary); background: var(--dsw-alias-state-error-primary); color: var(--dsw-alias-bg-base); }
.dsm-list { list-style: none; margin: 0; padding: 0; border: 1px solid var(--dsw-alias-border-l1); border-radius: 10px; overflow: hidden; background: var(--dsw-alias-bg-layer-1); }
.dsm-row { display: flex; align-items: stretch; gap: 4px; border-top: 1px solid var(--dsw-alias-border-l1); }
.dsm-row:first-child { border-top: none; }
.dsm-row:hover { background: var(--dsw-alias-bg-layer-2); }
.dsm-row-open {
  flex: 1; min-width: 0; display: block; text-align: left; cursor: pointer;
  padding: 10px 8px 10px 12px; border: 0; background: transparent; color: inherit; font-family: inherit;
}
.dsm-row-open:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: -2px; }
.dsm-title { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 500; color: var(--dsw-alias-label-primary); }
.dsm-title-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsm-meta { margin-top: 3px; font-size: 11px; line-height: 1.5; color: var(--dsw-alias-label-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsm-row-delete { flex: none; display: flex; align-items: center; padding-right: 10px; }
.dsm-badge { flex: none; font-size: 10px; line-height: 15px; padding: 0 6px; border-radius: 999px; border: 1px solid var(--dsw-alias-border-l1); color: var(--dsw-alias-label-secondary); font-weight: 400; }
.dsm-badge-warn { color: var(--dsw-alias-state-warn-primary); border-color: var(--dsw-alias-state-warn-primary); }
.dsm-badge-idle { color: var(--dsw-alias-state-idle-primary); border-color: var(--dsw-alias-state-idle-primary); }
.dsm-placeholder { margin: 0; padding: 18px 12px; text-align: center; font-size: 12px; line-height: 1.6; color: var(--dsw-alias-label-secondary); border: 1px dashed var(--dsw-alias-border-l1); border-radius: 10px; }
.dsm-error { margin: 0; padding: 8px 10px; font-size: 12px; line-height: 1.6; color: var(--dsw-alias-state-error-primary); border: 1px solid var(--dsw-alias-state-error-primary); border-radius: 8px; }
.dsm-notice { margin: 0; font-size: 12px; line-height: 1.6; color: var(--dsw-alias-state-success-primary); }
.dsm-modal-backdrop { position: fixed; inset: 0; z-index: 80; display: flex; align-items: center; justify-content: center; padding: 24px; background: rgba(0, 0, 0, .45); pointer-events: auto; }
.dsm-modal { box-sizing: border-box; width: min(440px, 100%); max-height: calc(100vh - 48px); overflow-y: auto; display: flex; flex-direction: column; gap: 10px; padding: 18px; border-radius: 12px; border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-1); box-shadow: 0 16px 40px rgba(0, 0, 0, .32); }
.dsm-hint { margin: 8px 0 0; font-size: 11px; line-height: 1.6; color: var(--dsw-alias-state-idle-primary); }
.dsm-confirm-title { margin: 0; font-size: 13px; font-weight: 600; color: var(--dsw-alias-label-primary); }
.dsm-confirm-session { margin: 0; font-size: 12px; font-weight: 500; color: var(--dsw-alias-label-primary); overflow-wrap: anywhere; }
.dsm-confirm-body { margin: 0; font-size: 12px; line-height: 1.6; color: var(--dsw-alias-label-secondary); }
.dsm-confirm-error { margin: 0; font-size: 12px; line-height: 1.6; color: var(--dsw-alias-state-error-primary); }
.dsm-confirm-actions { display: flex; justify-content: flex-end; gap: 8px; }
.dsm-detail { display: flex; flex-direction: column; gap: 16px; }
.dsm-detail-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.dsm-detail-title { margin: 0; font-size: 15px; font-weight: 600; color: var(--dsw-alias-label-primary); overflow-wrap: anywhere; }
.dsm-detail-badges { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.dsm-grid { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 8px 16px; padding: 14px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 10px; background: var(--dsw-alias-bg-layer-1); }
.dsm-grid-key { font-size: 12px; color: var(--dsw-alias-label-secondary); }
.dsm-grid-value { font-size: 12px; color: var(--dsw-alias-label-primary); overflow-wrap: anywhere; min-width: 0; }
.dsm-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 11px; }
.dsm-section-title { margin: 0 0 8px; font-size: 12px; font-weight: 600; color: var(--dsw-alias-label-secondary); text-transform: uppercase; letter-spacing: .04em; }
.dsm-children { display: flex; flex-wrap: wrap; gap: 6px; }
.dsm-chip { font-size: 11px; height: 24px; padding: 0 10px; border-radius: 999px; border: 1px solid var(--dsw-alias-border-l2); background: transparent; color: var(--dsw-alias-label-primary); cursor: pointer; font-family: inherit; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsm-chip:hover { background: var(--dsw-alias-bg-layer-2); }
.dsm-messages { display: flex; flex-direction: column; gap: 8px; }
.dsm-message { padding: 10px 12px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; background: var(--dsw-alias-bg-layer-1); }
.dsm-message-role { font-size: 10px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; color: var(--dsw-alias-label-secondary); }
.dsm-message-role-user { color: var(--dsw-alias-brand-primary); }
.dsm-message-text { margin: 4px 0 0; font-size: 12px; line-height: 1.65; color: var(--dsw-alias-label-primary); white-space: pre-wrap; overflow-wrap: anywhere; max-height: 220px; overflow: hidden; }
.dsm-action { display: inline-flex; align-items: center; gap: 8px; height: 30px; padding: 0 8px; border: 0; border-radius: 8px; background: transparent; color: var(--dsw-alias-label-secondary); font-family: inherit; font-size: 12px; cursor: pointer; max-width: 100%; }
.dsm-action:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.dsm-action:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
.dsm-action-narrow { width: 30px; padding: 0; justify-content: center; }
.dsm-action-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
`

    const styleText = (key) => (ZH[key] ?? EN[key] ?? key)

    function translateWith(t, key) {
      try {
        const text = t(key)
        if (typeof text === 'string' && text.length > 0 && text !== key) return text
      } catch {
        // Fall through to the built-in copy below.
      }
      // This plugin ships Chinese copy: it is the fallback for every locale.
      return ZH[key] ?? EN[key] ?? key
    }

    function errorText(t, code) {
      if (typeof code !== 'string' || code.length === 0) return translateWith(t, 'error.unknown')
      const key = `error.${code}`
      const text = translateWith(t, key)
      return text === key ? translateWith(t, 'error.unknown') : text
    }

    function formatTime(value) {
      if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null
      try {
        return new Date(value).toLocaleString()
      } catch {
        return null
      }
    }

    function formatSize(bytes) {
      if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes < 0) return null
      if (bytes < 1024) return `${bytes} B`
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    function useLocaleRevision(locale) {
      const [, bump] = React.useReducer((value) => value + 1, 0)
      React.useEffect(() => {
        if (!locale || typeof locale.subscribe !== 'function') return undefined
        return locale.subscribe(bump)
      }, [locale])
    }

    function metaLine(t, item) {
      const parts = []
      if (typeof item.cwd === 'string' && item.cwd.length > 0) parts.push(item.cwd)
      else parts.push(translateWith(t, 'meta.unknownCwd'))
      const updated = formatTime(item.updatedAt)
      if (updated) parts.push(`${translateWith(t, 'meta.updated')} ${updated}`)
      if (typeof item.eventCount === 'number') parts.push(`${item.eventCount} ${translateWith(t, 'meta.events')}`)
      const size = formatSize(item.sizeBytes)
      if (size) parts.push(size)
      return parts.join(' · ')
    }

    function titleOf(t, item) {
      if (item && typeof item.title === 'string' && item.title.trim().length > 0) return item.title.trim()
      return item?.sessionId ?? ''
    }

    /** Every session id under `rootId`, including the root itself. */
    function subtreeIds(items, rootId) {
      const ids = new Set([rootId])
      let grew = true
      while (grew) {
        grew = false
        for (const item of items) {
          if (!item || typeof item.sessionId !== 'string') continue
          if (ids.has(item.sessionId)) continue
          if (typeof item.parentSessionId !== 'string') continue
          if (!ids.has(item.parentSessionId)) continue
          ids.add(item.sessionId)
          grew = true
        }
      }
      return ids
    }

    function badgesOf(t, item) {
      const badges = []
      if (item.running) badges.push(h('span', { key: 'running', className: 'dsm-badge dsm-badge-warn' }, translateWith(t, 'row.running')))
      if (item.live) badges.push(h('span', { key: 'live', className: 'dsm-badge dsm-badge-idle' }, translateWith(t, 'row.live')))
      if (item.parentSessionId) badges.push(h('span', { key: 'child', className: 'dsm-badge' }, translateWith(t, 'row.child')))
      if (item.blank) badges.push(h('span', { key: 'blank', className: 'dsm-badge' }, translateWith(t, 'row.blank')))
      return badges
    }

    function StackIcon(props) {
      const size = typeof props?.size === 'number' && props.size > 0 ? props.size : 16
      return h('svg', { viewBox: '0 0 16 16', width: size, height: size, 'aria-hidden': true, focusable: false },
        h('rect', { x: 2.5, y: 2.5, width: 11, height: 2.6, rx: 1, fill: 'currentColor' }),
        h('rect', { x: 2.5, y: 6.7, width: 11, height: 2.6, rx: 1, fill: 'currentColor', opacity: 0.65 }),
        h('rect', { x: 2.5, y: 10.9, width: 6.4, height: 2.6, rx: 1, fill: 'currentColor', opacity: 0.4 })
      )
    }

    /** Tiny observable for the overlay fallback, owned by this module instance. */
    function createOverlayStore() {
      let open = false
      const listeners = new Set()
      return {
        get: () => open,
        setOpen(next) {
          if (open === next) return
          open = next
          for (const listener of listeners) {
            try {
              listener()
            } catch {
              // A broken subscriber must not block the others.
            }
          }
        },
        subscribe(listener) {
          listeners.add(listener)
          return () => listeners.delete(listener)
        },
      }
    }

    function useStoreValue(store) {
      const [value, setValue] = React.useState(store.get())
      React.useEffect(() => {
        setValue(store.get())
        return store.subscribe(() => setValue(store.get()))
      }, [store])
      return value
    }

    function SidebarAction(props) {
      const t = props.t
      const wide = props.wide !== false
      const open = () => {
        // `layout` may not exist when this plugin activates, so resolve it per click.
        const layout = typeof props.layoutOf === 'function' ? props.layoutOf() : null
        if (layout && typeof layout.selectPanel === 'function') {
          try {
            layout.selectPanel(PANEL_KEY)
            return
          } catch (error) {
            console.error('[session-manager] selectPanel failed, opening the overlay fallback', error)
          }
        } else {
          console.error('[session-manager] the layout service is unavailable, opening the overlay fallback')
        }
        props.overlay.setOpen(true)
      }
      const label = translateWith(t, 'nav.title')
      return h('button', {
        type: 'button',
        className: wide ? 'dsm-action' : 'dsm-action dsm-action-narrow',
        title: label,
        'aria-label': label,
        onClick: open,
      },
      h(StackIcon, { size: 16 }),
      wide ? h('span', { className: 'dsm-action-label' }, label) : null)
    }

    function SessionManagerPage(props) {
      const t = props.t
      const locale = props.locale
      const layoutOf = props.layoutOf
      const onClose = typeof props.onClose === 'function' ? props.onClose : null
      useLocaleRevision(locale)

      const [state, setState] = React.useState({ status: 'loading', items: [], error: null })
      const [selectedId, setSelectedId] = React.useState(null)
      const [detail, setDetail] = React.useState({ status: 'idle', id: null, item: null, data: null, error: null })
      const [pending, setPending] = React.useState(null)
      const [busy, setBusy] = React.useState(false)
      const [deleteError, setDeleteError] = React.useState(null)
      const [notice, setNotice] = React.useState(null)

      const requestFailure = (t, response, payload) => {
        const code = payload && typeof payload.code === 'string' ? payload.code : null
        const detailText = payload && typeof payload.detail === 'string' && payload.detail.length > 0
          ? payload.detail
          : null
        const known = typeof code === 'string' && translateWith(t, `error.${code}`) !== `error.${code}`
        const base = known ? errorText(t, code) : `${translateWith(t, 'error.http')} ${response.status}`
        return detailText ? `${base} (${detailText})` : base
      }

      const load = React.useCallback(async (signal) => {
        setState((previous) => ({ ...previous, status: previous.items.length > 0 ? 'ready' : 'loading', error: null }))
        try {
          const response = await fetch(LIST_URL, {
            method: 'GET',
            credentials: 'same-origin',
            headers: { accept: 'application/json' },
            signal,
          })
          const payload = await response.json().catch(() => null)
          if (!response.ok) {
            throw new Error(requestFailure(t, response, payload))
          }
          if (!payload || payload.ok !== true || !Array.isArray(payload.items)) {
            throw new Error(translateWith(t, 'error.badPayload'))
          }
          setState({ status: 'ready', items: payload.items, error: null })
        } catch (error) {
          if (error && error.name === 'AbortError') return
          const message = error instanceof Error ? error.message : String(error)
          setState((previous) => ({
            status: 'error',
            items: previous.items,
            error: `${translateWith(t, 'error.load')}: ${message}`,
          }))
        }
      }, [t])

      React.useEffect(() => {
        const controller = new AbortController()
        void load(controller.signal)
        return () => controller.abort()
      }, [load])

      React.useEffect(() => {
        if (typeof selectedId !== 'string') return undefined
        const controller = new AbortController()
        let live = true
        setDetail((previous) => ({
          status: 'loading',
          id: selectedId,
          item: previous && previous.id === selectedId ? previous.item : null,
          data: null,
          error: null,
        }))
          ; (async () => {
            try {
              const response = await fetch(`${DETAIL_URL}?id=${encodeURIComponent(selectedId)}&limit=${RECENT_LIMIT}`, {
                method: 'GET',
                credentials: 'same-origin',
                headers: { accept: 'application/json' },
                signal: controller.signal,
              })
              const payload = await response.json().catch(() => null)
              if (!response.ok) throw new Error(requestFailure(t, response, payload))
              if (!payload || payload.ok !== true || !payload.item) {
                throw new Error(translateWith(t, 'error.badPayload'))
              }
              if (live) {
                setDetail({ status: 'ready', id: selectedId, item: payload.item, data: payload.detail ?? null, error: null })
              }
            } catch (error) {
              if (controller.signal.aborted) return
              const message = error instanceof Error ? error.message : String(error)
              if (live) {
                setDetail((previous) => ({
                  status: 'error',
                  id: selectedId,
                  item: previous?.item ?? null,
                  data: null,
                  error: `${translateWith(t, 'error.detail')}: ${message}`,
                }))
              }
            }
          })()
        return () => {
          live = false
          controller.abort()
        }
      }, [selectedId, t])

      React.useEffect(() => {
        if (!pending) return undefined
        const onKeyDown = (event) => {
          if (event.key !== 'Escape') return
          event.stopPropagation()
          event.preventDefault()
          setPending(null)
          setDeleteError(null)
        }
        window.addEventListener('keydown', onKeyDown, true)
        return () => window.removeEventListener('keydown', onKeyDown, true)
      }, [pending])

      React.useEffect(() => {
        if (!onClose || pending) return undefined
        const onKeyDown = (event) => {
          if (event.key !== 'Escape') return
          event.stopPropagation()
          onClose()
        }
        window.addEventListener('keydown', onKeyDown, true)
        return () => window.removeEventListener('keydown', onKeyDown, true)
      }, [onClose, pending])

      const openSession = (item) => {
        setNotice(null)
        setDeleteError(null)
        setPending(null)
        setSelectedId(item.sessionId)
      }

      const closeDetail = () => {
        setSelectedId(null)
        setDetail({ status: 'idle', id: null, item: null, data: null, error: null })
        setPending(null)
        setDeleteError(null)
      }

      const askDelete = (item) => {
        setNotice(null)
        setDeleteError(null)
        setPending({
          id: item.sessionId,
          title: titleOf(t, item),
          childCount: subtreeIds(state.items, item.sessionId).size - 1,
        })
      }

      const cancelDelete = () => {
        if (busy) return
        setPending(null)
        setDeleteError(null)
      }

      const confirmDelete = async () => {
        if (!pending || busy) return
        setBusy(true)
        setDeleteError(null)
        try {
          const response = await fetch(DELETE_URL, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'content-type': 'application/json', accept: 'application/json' },
            body: JSON.stringify({ sessionId: pending.id }),
          })
          const payload = await response.json().catch(() => null)
          if (!response.ok || !payload || payload.ok !== true) {
            setDeleteError(`${translateWith(t, 'error.delete')}: ${requestFailure(t, response, payload)}`)
            return
          }
          const removed = Array.isArray(payload.deleted) && payload.deleted.length > 1
            ? payload.deleted.length
            : 0
          const stale = typeof payload.warning === 'string'
            ? ` ${translateWith(t, 'notice.staleSidebar')}`
            : ''
          setNotice((removed > 0
            ? `${translateWith(t, 'notice.deletedTreePrefix')}${removed}${translateWith(t, 'notice.deletedTreeSuffix')}${pending.title}`
            : `${translateWith(t, 'notice.deleted')}: ${pending.title}`) + stale)
          setPending(null)
          if (selectedId === pending.id) closeDetail()
          await load()
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          setDeleteError(`${translateWith(t, 'error.delete')}: ${message}`)
        } finally {
          setBusy(false)
        }
      }

      const backToConversation = () => {
        if (onClose) {
          onClose()
          return
        }
        const layout = typeof layoutOf === 'function' ? layoutOf() : null
        if (!layout || typeof layout.selectPanel !== 'function') return
        try {
          layout.selectPanel(null)
        } catch {
          // No conversation panel to return to.
        }
      }

      const confirmModal = pending
        ? h('div', {
          className: 'dsm-modal-backdrop',
          onClick: (event) => {
            if (event.target === event.currentTarget && !busy) cancelDelete()
          },
        },
        h('div', {
          className: 'dsm-modal',
          role: 'alertdialog',
          'aria-modal': 'true',
          'aria-labelledby': 'dsm-confirm-title',
          'aria-describedby': 'dsm-confirm-body',
        },
        h('h3', { id: 'dsm-confirm-title', className: 'dsm-confirm-title' }, translateWith(t, 'confirm.title')),
        h('p', { className: 'dsm-confirm-session' }, pending.title),
        h('p', { id: 'dsm-confirm-body', className: 'dsm-confirm-body' }, translateWith(t, 'confirm.body')),
        pending.childCount > 0
          ? h('p', { className: 'dsm-confirm-body' },
            `${translateWith(t, 'confirm.childrenPrefix')}${pending.childCount}${translateWith(t, 'confirm.childrenSuffix')}`)
          : null,
        deleteError ? h('p', { className: 'dsm-confirm-error', role: 'alert' }, deleteError) : null,
        h('div', { className: 'dsm-confirm-actions' },
          h('button', {
            type: 'button',
            className: 'dsm-button',
            disabled: busy,
            autoFocus: true,
            onClick: cancelDelete,
          }, translateWith(t, 'confirm.cancel')),
          h('button', {
            type: 'button',
            className: 'dsm-button dsm-button-confirm',
            disabled: busy,
            onClick: () => void confirmDelete(),
          }, busy ? translateWith(t, 'confirm.busy') : translateWith(t, 'confirm.confirm'))
        )
        )
        )
        : null

      const renderList = () => {
        if (state.status === 'loading') {
          return h('p', { className: 'dsm-placeholder' }, translateWith(t, 'list.loading'))
        }
        if (state.items.length === 0) {
          return state.status === 'error'
            ? h('p', { className: 'dsm-placeholder' }, state.error)
            : h('p', { className: 'dsm-placeholder' }, translateWith(t, 'list.empty'))
        }
        const rows = state.items.map((item) => h('li', { key: item.sessionId, className: 'dsm-row' },
          h('button', {
            type: 'button',
            className: 'dsm-row-open',
            title: `${translateWith(t, 'row.open')}: ${titleOf(t, item)}`,
            onClick: () => openSession(item),
          },
          h('span', { className: 'dsm-title' },
            h('span', { className: 'dsm-title-text' }, titleOf(t, item)),
            badgesOf(t, item)
          ),
          h('span', { className: 'dsm-meta', title: metaLine(t, item) }, metaLine(t, item))
          ),
          h('span', { className: 'dsm-row-delete' },
            h('button', {
              type: 'button',
              className: 'dsm-button dsm-button-quiet',
              disabled: Boolean(item.live) || busy,
              title: item.live ? translateWith(t, 'row.liveHint') : undefined,
              'aria-label': `${translateWith(t, 'row.delete')}: ${titleOf(t, item)}`,
              onClick: () => askDelete(item),
            }, translateWith(t, 'row.delete'))
          )
        ))
        return h('ul', { className: 'dsm-list' }, rows)
      }

      const renderDetail = () => {
        const item = detail.item
          ?? state.items.find((candidate) => candidate.sessionId === selectedId)
          ?? { sessionId: selectedId, title: null }
        const data = detail.data ?? {}
        const fields = []
        const pushField = (key, value, options = {}) => {
          if (value === null || value === undefined || value === '') return
          fields.push(h('div', { key: `k-${key}`, className: 'dsm-grid-key' }, translateWith(t, key)))
          fields.push(h('div', { key: `v-${key}`, className: options.mono ? 'dsm-grid-value dsm-mono' : 'dsm-grid-value' }, value))
        }
        pushField('detail.id', item.sessionId, { mono: true })
        pushField('detail.cwd', typeof item.cwd === 'string' && item.cwd.length > 0 ? item.cwd : translateWith(t, 'meta.unknownCwd'))
        pushField('detail.created', formatTime(item.createdAt))
        pushField('detail.updated', formatTime(item.updatedAt))
        pushField('detail.path', typeof data.path === 'string' && data.path.length > 0
          ? data.path
          : translateWith(t, 'detail.pathMissing'), { mono: typeof data.path === 'string' && data.path.length > 0 })
        pushField('detail.events', typeof item.eventCount === 'number' ? String(item.eventCount) : null)
        pushField('detail.size', formatSize(item.sizeBytes))

        const children = Array.isArray(data.children) ? data.children : []
        const recent = Array.isArray(data.recent) ? data.recent : []

        return h('div', { className: 'dsm-detail' },
          h('div', { className: 'dsm-detail-head' },
            h('div', null,
              h('h2', { className: 'dsm-detail-title' }, titleOf(t, item)),
              h('div', { className: 'dsm-detail-badges' }, badgesOf(t, item)),
              item.parentSessionId
                ? h('button', {
                  type: 'button',
                  className: 'dsm-chip',
                  style: { marginTop: '8px' },
                  onClick: () => openSession({ sessionId: item.parentSessionId, title: null, parentSessionId: null }),
                }, `${translateWith(t, 'detail.parent')}: ${item.parentSessionId}`)
                : null,
              item.live ? h('p', { className: 'dsm-hint' }, translateWith(t, 'row.liveHint')) : null
            ),
            h('div', { className: 'dsm-header-actions' },
              h('button', { type: 'button', className: 'dsm-button', onClick: closeDetail }, translateWith(t, 'actions.back')),
              h('button', {
                type: 'button',
                className: 'dsm-button dsm-button-danger',
                disabled: Boolean(item.live) || busy,
                title: item.live ? translateWith(t, 'row.liveHint') : undefined,
                onClick: () => askDelete(item),
              }, translateWith(t, 'detail.delete'))
            )
          ),
          detail.status === 'loading' ? h('p', { className: 'dsm-placeholder' }, translateWith(t, 'detail.loading')) : null,
          detail.status === 'error' ? h('p', { className: 'dsm-error', role: 'alert' }, detail.error) : null,
          data.formatStatus === 'migration-required'
            ? h('span', { className: 'dsm-badge dsm-badge-warn' }, translateWith(t, 'detail.formatMigration'))
            : null,
          fields.length > 0 ? h('div', { className: 'dsm-grid' }, fields) : null,
          h('section', null,
            h('h3', { className: 'dsm-section-title' }, translateWith(t, 'detail.children')),
            children.length === 0
              ? h('p', { className: 'dsm-sub' }, translateWith(t, 'detail.noChildren'))
              : h('div', { className: 'dsm-children' }, children.map((child) => h('button', {
                key: child.sessionId,
                type: 'button',
                className: 'dsm-chip',
                title: child.sessionId,
                onClick: () => openSession({ sessionId: child.sessionId, title: child.title ?? null }),
              }, child.title || child.sessionId)))
          ),
          h('section', null,
            h('h3', { className: 'dsm-section-title' }, translateWith(t, 'detail.recent')),
            recent.length === 0
              ? h('p', { className: 'dsm-sub' }, translateWith(t, 'detail.noRecent'))
              : h('div', { className: 'dsm-messages' }, recent.map((message, index) => h('div', {
                key: `${message.seq ?? index}`,
                className: 'dsm-message',
              },
              h('div', {
                className: message.role === 'user' ? 'dsm-message-role dsm-message-role-user' : 'dsm-message-role',
              }, translateWith(t, `role.${message.role}`) || message.role),
              h('p', { className: 'dsm-message-text' }, message.text)
              ))),
            data.hasMore ? h('p', { className: 'dsm-sub' }, translateWith(t, 'detail.moreRecent')) : null
          )
        )
      }

      return h('div', { className: 'dsm-page' },
        h('style', { key: 'styles' }, CSS),
        h('div', { className: 'dsm-wrap' },
          h('header', { className: 'dsm-header' },
            h('div', null,
              h('h1', { className: 'dsm-heading' }, translateWith(t, 'page.title')),
              h('p', { className: 'dsm-sub' }, translateWith(t, 'page.description'))
            ),
            h('div', { className: 'dsm-header-actions' },
              h('button', {
                type: 'button',
                className: 'dsm-button',
                onClick: () => void load(),
                disabled: state.status === 'loading' || busy,
              }, state.status === 'loading' ? translateWith(t, 'actions.refreshing') : translateWith(t, 'actions.refresh')),
              h('button', { type: 'button', className: 'dsm-button dsm-button-quiet', onClick: backToConversation },
                translateWith(t, 'actions.backToConversation'))
            )
          ),
          state.status === 'error' && state.items.length > 0
            ? h('p', { className: 'dsm-error', role: 'alert' }, state.error)
            : null,
          notice ? h('p', { className: 'dsm-notice', role: 'status' }, notice) : null,
          selectedId ? renderDetail() : renderList(),
          confirmModal
        )
      )
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        const locale = ctx.get('locale')
        const overlay = createOverlayStore()
        // `layout` can arrive after this plugin activates; resolve it per use.
        const layoutOf = () => ctx.get('layout')
        let t = styleText
        if (locale && typeof locale.bind === 'function') {
          const disposers = []
          try {
            // Chinese copy is the delivered language: registering only `zh` keeps
            // the Chinese dictionary as the answer under every active locale.
            disposers.push(locale.register(NS, 'zh', ZH))
          } catch {
            // A duplicate namespace keeps the dictionary already installed.
          }
          if (disposers.length > 0) {
            ctx.effect(() => () => {
              for (const dispose of disposers) {
                try {
                  dispose()
                } catch {
                  // Idempotent disposal; nothing to recover here.
                }
              }
            })
          }
          t = locale.bind(NS)
        }

        const translate = (key) => translateWith(t, key)
        const Page = () => h(SessionManagerPage, { t, locale, layoutOf })
        const Action = (props) => h(SidebarAction, { t, layoutOf, overlay, wide: props?.wide !== false })
        const Overlay = () => {
          const open = useStoreValue(overlay)
          if (!open) return null
          return h('div', { className: 'dsm-overlay', role: 'dialog', 'aria-modal': 'true' },
            h(SessionManagerPage, {
              t,
              locale,
              layoutOf,
              onClose: () => overlay.setOpen(false),
            })
          )
        }

        ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main',
          key: PANEL_KEY,
        }, Page))

        ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
          name: 'sidebar.footer.action',
          id: PANEL_KEY,
          order: 30,
          label: () => translate('nav.title'),
        }, Action))

        // Fallback surface: shown only when the main-panel selection cannot happen.
        ctx.slots.inject('shell.overlay', () => ctx.slots.register({
          name: 'shell.overlay',
          id: PANEL_KEY,
          order: 40,
        }, Overlay))
      },
    }
  },
})
