/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUB_APP_NAME_VUE_ENTRY: string
  readonly VITE_SUB_APP_NAME_REACT_ENTRY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
