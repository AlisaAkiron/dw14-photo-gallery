import { thumbUrl } from '@/config/images'
import type { GridPhoto } from '@/lib/album/types'
import { cn } from '@/utils/cn'

/**
 * Marks an image loaded (data-loaded, styled in index.css) — also when it
 * finished before hydration, when onLoad never fires. Set on the DOM node,
 * not through React state, so it can't re-render the grid.
 */
export const markLoaded = (img: HTMLImageElement | null) => {
  if (img?.complete && img.naturalWidth) img.dataset.loaded = ''
}

/**
 * Chrome keeps downloading an image after its element is removed. In the
 * virtualized grid that means rows scrolled past keep their thumbnails in
 * the request queue, ahead of the ones now on screen — so a still-loading
 * image drops its src once it's gone, which cancels the request.
 *
 * Checked after the commit, and only for elements really out of the
 * document: StrictMode (dev) runs a mount → cleanup → mount cycle on live
 * elements, and React wouldn't restore a src it thinks is unchanged.
 */
const thumbRef = (img: HTMLImageElement | null) => {
  if (!img) return
  markLoaded(img)
  return () => {
    queueMicrotask(() => {
      if (!img.isConnected && !img.complete) img.removeAttribute('src')
    })
  }
}

type PhotoThumbProps = {
  photo: GridPhoto
  alt: string
  className?: string
  loading?: 'lazy' | 'eager'
  /**
   * false: placeholder only, no request yet (the grid holds back thumbnails
   * the visitor is flinging past)
   */
  load?: boolean
}

/**
 * Thumbnail over its dominant-colour placeholder, fading in once decoded
 * (styles in index.css). Fills its container — size the wrapper.
 */
export const PhotoThumb = ({
  photo,
  alt,
  className,
  loading = 'lazy',
  load = true,
}: PhotoThumbProps) => {
  return (
    <span
      className={cn('photo-thumb block overflow-hidden', className)}
      style={{ backgroundColor: photo.c ?? 'var(--color-base-300)' }}
    >
      <img
        key={photo.id}
        ref={thumbRef}
        src={load ? thumbUrl(photo.id) : undefined}
        alt={alt}
        width={photo.w}
        height={photo.h}
        loading={loading}
        decoding="async"
        draggable={false}
        onLoad={e => {
          e.currentTarget.dataset.loaded = ''
        }}
        className="size-full object-cover"
      />
    </span>
  )
}
