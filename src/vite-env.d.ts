/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Base URL of the photo bucket (thumb/ and view/ keys): the R2 public
   * custom domain in production, /__local-images in dev
   */
  readonly VITE_IMAGE_BASE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** React Scan in dev, empty in builds (vite/react-scan.ts) */
declare module 'virtual:react-scan' {}
