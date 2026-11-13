/// <reference types="vite/client" />
interface ImportMetaEnv {
  /** The Medusa backend: live, staging or http://localhost:9000. */
  readonly VITE_MEDUSA_BACKEND_URL?: string
  /** The website this app manages, for "See it on the website" links. */
  readonly VITE_STOREFRONT_URL?: string
  /** "staging" shows a banner so a test change is never mistaken for live. */
  readonly VITE_TARGET?: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}
