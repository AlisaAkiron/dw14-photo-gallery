/**
 * Hand-off from the viewer back to the gallery: the photo the visitor was
 * last looking at. Arrowing through photos replaces history entries, so
 * the gallery's restored scroll position is where the visitor *entered*
 * the viewer — the grid uses this to bring the last viewed photo into view
 * if it's elsewhere.
 */
let pendingFocus: number | undefined

export const setViewerFocus = (id: number) => {
  pendingFocus = id
}

export const takeViewerFocus = () => {
  const id = pendingFocus
  pendingFocus = undefined
  return id
}
