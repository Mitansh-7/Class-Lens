import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

// Minimal hash router (#/path?query). Hash URLs work on any static host, and a
// browser refresh always reopens the same screen.

const RouterContext = createContext(null);

export function parseHash(hash) {
  const raw = String(hash || '').replace(/^#/, '') || '/dashboard';
  const [pathPart, queryPart = ''] = raw.split('?');
  const segments = pathPart.split('/').filter(Boolean).map(decodeURIComponent);
  const query = Object.fromEntries(new URLSearchParams(queryPart));
  return { path: `/${segments.join('/')}`, segments, query, hash: `#${raw}` };
}

const currentHash = () => (window.location.hash && window.location.hash !== '#' ? window.location.hash : '#/dashboard');

export function RouterProvider({ children }) {
  const [route, setRoute] = useState(() => parseHash(currentHash()));
  const [pending, setPending] = useState(null); // { hash, guard }
  const shownHash = useRef(currentHash());
  const approvedHash = useRef(null); // a destination the teacher already confirmed
  const keepScroll = useRef(false);
  const guards = useRef(new Map());

  const activeGuard = () => {
    for (const g of guards.current.values()) if (g.active) return g;
    return null;
  };

  const commit = useCallback((hash) => {
    shownHash.current = hash;
    approvedHash.current = null;
    setRoute(parseHash(hash));
    if (!keepScroll.current) window.scrollTo({ top: 0 });
    keepScroll.current = false;
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      const next = currentHash();
      if (next === shownHash.current) return;
      const guard = next === approvedHash.current ? null : activeGuard();
      if (guard) {
        // Put the address back and ask first (covers the browser Back button).
        window.history.replaceState(window.history.state, '', shownHash.current);
        setPending({ hash: next, guard });
        return;
      }
      commit(next);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [commit]);

  // Warn before closing or refreshing the tab when work would be lost.
  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (activeGuard()) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  const go = useCallback(
    (hash, keepPosition = false) => {
      approvedHash.current = hash;
      keepScroll.current = keepPosition;
      if (window.location.hash === hash) commit(hash);
      else window.location.hash = hash;
    },
    [commit],
  );

  /** options: force — skip the unsaved-changes check; keepScroll — stay at the same scroll position. */
  const navigate = useCallback(
    (to, { force = false, keepScroll: keepPosition = false } = {}) => {
      const hash = `#${to}`;
      if (hash === shownHash.current) return;
      const guard = activeGuard();
      if (guard && !force) {
        setPending({ hash, guard });
        return;
      }
      go(hash, keepPosition);
    },
    [go],
  );

  const resolvePending = useCallback(
    async (choice) => {
      const p = pending;
      setPending(null);
      if (!p || choice === 'stay') return;
      if (choice === 'save' && p.guard.onSave) {
        const ok = await p.guard.onSave();
        if (!ok) return;
      }
      go(p.hash);
    },
    [pending, go],
  );

  const value = useMemo(
    () => ({ route, navigate, pending, resolvePending, guards }),
    [route, navigate, pending, resolvePending],
  );
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter() {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used inside RouterProvider');
  return ctx;
}

/**
 * Ask before leaving the current screen while `active` is true.
 * options: { title, message, onSave (returns true if saved), saveLabel, leaveLabel }
 */
export function useLeaveGuard(active, options) {
  const { guards } = useRouter();
  const idRef = useRef(Math.random().toString(36).slice(2));
  useEffect(() => {
    const id = idRef.current;
    guards.current.set(id, { ...options, active });
  });
  useEffect(() => {
    const id = idRef.current;
    const map = guards.current;
    return () => map.delete(id);
  }, [guards]);
}
