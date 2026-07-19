// Dev-only: embedded preview tabs can report document.hidden (sometimes
// flapping around load), which parks requestAnimationFrame — and hidden-tab
// setTimeout is throttled to uselessness. A Web Worker timer is exempt from
// visibility throttling, so race the native raf against a worker tick.
// Must be imported before gsap/react-three-fiber so they see the patched raf.
if (import.meta.env.DEV) {
  const native = window.requestAnimationFrame.bind(window)
  const nativeCancel = window.cancelAnimationFrame.bind(window)

  const workerSrc = `let running = false;
onmessage = () => {
  if (running) return; running = true;
  const tick = () => { postMessage(0); setTimeout(tick, 33); };
  tick();
};`
  const worker = new Worker(URL.createObjectURL(new Blob([workerSrc], { type: 'text/javascript' })))
  worker.postMessage(0)

  type Entry = { rafH: number; cb: FrameRequestCallback }
  const pending = new Map<number, Entry>()
  let nextId = 1_000_000_000

  worker.onmessage = () => {
    if (!pending.size) return
    const entries = [...pending.entries()]
    pending.clear()
    const now = performance.now()
    for (const [, e] of entries) {
      nativeCancel(e.rafH)
      e.cb(now)
    }
  }

  window.requestAnimationFrame = (cb: FrameRequestCallback): number => {
    const id = nextId++
    const entry: Entry = { rafH: 0, cb }
    entry.rafH = native((t) => {
      if (pending.delete(id)) cb(t)
    })
    pending.set(id, entry)
    return id
  }

  window.cancelAnimationFrame = (id: number) => {
    const entry = pending.get(id)
    if (entry) {
      pending.delete(id)
      nativeCancel(entry.rafH)
    } else {
      nativeCancel(id)
    }
  }
}

export {}
