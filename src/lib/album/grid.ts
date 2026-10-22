import type { GridPhoto, Photo } from './types'

/** Strips a photo down to what the grid renders (keeps loader data small) */
export const toGridPhoto = ({ id, set, by, t, w, h, c }: Photo): GridPhoto =>
  c ? { id, set, by, t, w, h, c } : { id, set, by, t, w, h }
