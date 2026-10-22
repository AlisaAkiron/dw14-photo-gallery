import { useSyncExternalStore } from 'react'

/**
 * Photos picked for download, kept across filter changes, the viewer,
 * reloads and later visits (localStorage), and synced between tabs. Order
 * is selection order. The server always renders an empty selection; the
 * stored one appears right after hydration.
 */
export type Selection = {
  /** In selection order */
  ids: readonly number[]
  has: (id: number) => boolean
}

const STORAGE_KEY = 'dw14-selection'

/** Most photos one selection may hold */
export const MAX_SELECTION = 20

const makeSelection = (ids: readonly number[]): Selection => {
  const set = new Set(ids)
  return { ids, has: id => set.has(id) }
}

const EMPTY = makeSelection([])

const read = (): Selection => {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(value)
      ? makeSelection(
          // Selections stored before the limit existed keep their first picks
          value.filter(id => Number.isInteger(id)).slice(0, MAX_SELECTION),
        )
      : EMPTY
  } catch {
    return EMPTY
  }
}

let current: Selection | undefined
const listeners = new Set<() => void>()

const getSnapshot = () => (current ??= read())

const commit = (ids: readonly number[]) => {
  current = makeSelection(ids)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  } catch {
    // Private mode / quota: the selection still works for this page
  }
  for (const listener of listeners) listener()
}

const onStorage = (e: StorageEvent) => {
  if (e.key !== STORAGE_KEY) return
  current = read()
  for (const listener of listeners) listener()
}

const subscribe = (listener: () => void) => {
  if (!listeners.size) window.addEventListener('storage', onStorage)
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
    if (!listeners.size) window.removeEventListener('storage', onStorage)
  }
}

export const useSelection = () =>
  useSyncExternalStore(subscribe, getSnapshot, () => EMPTY)

/** Selects or deselects; selecting does nothing once the selection is full */
export const toggleSelected = (id: number) => {
  const { ids, has } = getSnapshot()
  if (has(id)) commit(ids.filter(x => x !== id))
  else if (ids.length < MAX_SELECTION) commit([...ids, id])
}

/** Adds in the given order, as many as still fit */
export const addSelected = (add: readonly number[]) => {
  const { ids, has } = getSnapshot()
  const fresh = add
    .filter(id => !has(id))
    .slice(0, Math.max(0, MAX_SELECTION - ids.length))
  if (fresh.length) commit([...ids, ...fresh])
}

export const removeSelected = (remove: readonly number[]) => {
  const drop = new Set(remove)
  commit(getSnapshot().ids.filter(id => !drop.has(id)))
}

export const clearSelected = () => commit([])
