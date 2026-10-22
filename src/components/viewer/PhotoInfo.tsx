import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { originalUrl } from '@/config/images'
import { photoFileName } from '@/lib/album/files'
import {
  MAX_SELECTION,
  toggleSelected,
  useSelection,
} from '@/lib/album/selection'
import { dayOf, formatShootTime, hourOf } from '@/lib/album/time'
import type { Photo, Photographer } from '@/lib/album/types'
import { formatBytes, formatNumber, setName } from '@/lib/i18n'
import { m } from '@/paraglide/messages.js'
import { getLocale } from '@/paraglide/runtime.js'
import { cn } from '@/utils/cn'

const Row = ({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) => (
  <div>
    <dt className="text-xs text-white/50">{label}</dt>
    <dd className="mt-0.5">{children}</dd>
  </div>
)

const DownloadIcon = () => (
  <svg
    className="size-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M12 15V3" />
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="m7 10 5 5 5-5" />
  </svg>
)

export const PhotoInfo = ({
  photo,
  photographer,
}: {
  photo: Photo
  photographer: Photographer
}) => {
  const locale = getLocale()
  const [copied, setCopied] = useState(false)
  const selection = useSelection()
  const selected = selection.has(photo.id)
  const selectionFull = !selected && selection.ids.length >= MAX_SELECTION
  const day = dayOf(photo.t)
  const cam = photo.cam
  const exposure = [
    cam?.focal,
    cam?.aperture,
    cam?.exposure,
    cam?.iso && `ISO ${cam.iso}`,
  ].filter(Boolean)

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  const copyLink = async () => {
    // Without the gallery filters: the link is for the photo itself
    const url = window.location.origin + window.location.pathname
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      window.prompt(m.viewer_copy_link(), url)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <a
          href={originalUrl(photo)}
          download={photoFileName(photo)}
          className="btn btn-primary"
        >
          <DownloadIcon />
          {m.viewer_download()}
          <span className="font-normal opacity-70">
            {formatBytes(photo.size, locale)}
          </span>
        </a>
        <div className="grid grid-cols-2 gap-2">
          {/* Adds to the same selection the gallery downloads from */}
          <button
            type="button"
            aria-pressed={selected}
            disabled={selectionFull}
            title={
              selectionFull
                ? m.selection_full({ max: MAX_SELECTION })
                : undefined
            }
            className={cn(
              'btn btn-sm font-normal',
              selected ? 'btn-primary btn-outline' : 'btn-ghost',
            )}
            onClick={() => toggleSelected(photo.id)}
          >
            {selected ? `✓ ${m.viewer_selected()}` : m.viewer_select()}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm font-normal"
            onClick={copyLink}
            aria-live="polite"
          >
            {copied ? m.viewer_link_copied() : m.viewer_copy_link()}
          </button>
        </div>
      </div>

      <dl className="flex flex-col gap-4 text-sm">
        <Row label={m.info_photographer()}>
          <Link
            to="/photos"
            search={{ by: photographer.id }}
            className="link link-hover"
            title={m.info_more_by({ photographer: photographer.name })}
          >
            {photographer.name}
          </Link>
        </Row>
        <Row label={m.info_taken()}>
          <span className="tabular-nums">
            {formatShootTime(photo.t, locale)}
          </span>
          {photo.tq !== 'camera' && (
            <p className="mt-1 text-xs text-warning/90">
              {photo.tq === 'edited'
                ? m.time_edited_note()
                : m.time_upload_note()}
            </p>
          )}
          <Link
            to="/photos"
            search={
              day === 'other'
                ? { set: photo.set, day }
                : { set: photo.set, day, hour: hourOf(photo.t) }
            }
            className="link link-hover mt-1 block text-xs text-white/60"
          >
            {m.info_same_hour()} →
          </Link>
        </Row>
        <Row label={m.info_set()}>
          <Link
            to="/photos"
            search={{ set: photo.set }}
            className="link link-hover"
          >
            {setName(photo.set)}
          </Link>
        </Row>
        {cam?.body && <Row label={m.info_camera()}>{cam.body}</Row>}
        {cam?.lens && <Row label={m.info_lens()}>{cam.lens}</Row>}
        {exposure.length > 0 && (
          <Row label={m.info_exposure()}>
            <span className="tabular-nums">{exposure.join(' · ')}</span>
          </Row>
        )}
        <Row label={m.info_dimensions()}>
          <span className="tabular-nums">
            {formatNumber(photo.w, locale)} × {formatNumber(photo.h, locale)}
          </span>
        </Row>
        <Row label={m.info_file()}>
          <span className="break-all font-mono text-xs">{photo.name}</span>
        </Row>
      </dl>
    </div>
  )
}
