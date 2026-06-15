'use client'

import { useEffect, useRef, useState } from 'react'

interface LogLine {
  id: number
  level: 'log' | 'info' | 'warn' | 'error'
  text: string
}

/**
 * Build the sandboxed document that runs the compiled JS.
 *
 * Security: the iframe uses `sandbox="allow-scripts"` (no `allow-same-origin`,
 * so it's a unique opaque origin with no access to the parent, cookies, or
 * storage), and a CSP of `default-src 'none'` blocks all network. console.* is
 * piped to the parent via postMessage. We only ever run the *compiled output*
 * of the user's own code — never the compiler, never eval on the main thread.
 */
function buildSrcDoc(code: string): string {
  // Prevent the code from breaking out of the inline <script>.
  const safe = code.replace(/<\/(script)/gi, '<\\/$1')
  return `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'"></head><body><script>
(function(){
  function fmt(a){ try { return typeof a === 'string' ? a : JSON.stringify(a); } catch (e) { return String(a); } }
  function send(level, args){ parent.postMessage({ __sjsConsole: true, level: level, text: Array.prototype.map.call(args, fmt).join(' ') }, '*'); }
  ['log','info','warn','error'].forEach(function(l){ console[l] = function(){ send(l, arguments); }; });
  window.onerror = function(m){ send('error', [m]); return true; };
  try { ${safe}
  } catch (e) { send('error', [String(e && e.stack ? e.stack : e)]); }
  parent.postMessage({ __sjsConsole: true, done: true }, '*');
})();
</script></body></html>`
}

const COLOR: Record<LogLine['level'], string> = {
  log: 'text-text-secondary',
  info: 'text-[#60a5fa]',
  warn: 'text-amber-300',
  error: 'text-red-400',
}

/** Runs `code` in a sandboxed iframe each time `runToken` changes; shows console output. */
export function ConsolePanel({ code, runToken }: { code: string; runToken: number }) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [logs, setLogs] = useState<LogLine[]>([])
  const [done, setDone] = useState(false)

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== iframeRef.current?.contentWindow) return
      const d = e.data as { __sjsConsole?: boolean; level?: LogLine['level']; text?: string; done?: boolean }
      if (!d || !d.__sjsConsole) return
      if (d.done) setDone(true)
      else if (d.level) setLogs((prev) => [...prev, { id: prev.length, level: d.level!, text: d.text ?? '' }])
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  useEffect(() => {
    if (runToken === 0) return
    setLogs([])
    setDone(false)
    if (iframeRef.current) iframeRef.current.srcdoc = buildSrcDoc(code)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runToken])

  return (
    <div className="flex h-full flex-col overflow-auto p-4 font-mono text-sm">
      {runToken === 0 ? (
        <p className="text-text-muted">Press Run to execute the compiled JavaScript.</p>
      ) : logs.length === 0 && done ? (
        <p className="text-text-muted">(no console output)</p>
      ) : (
        <div className="space-y-1">
          {logs.map((l) => (
            <div key={l.id} className={`whitespace-pre-wrap ${COLOR[l.level]}`}>
              {l.text}
            </div>
          ))}
        </div>
      )}
      <iframe ref={iframeRef} sandbox="allow-scripts" title="Super.js sandbox runner" className="hidden" />
    </div>
  )
}
