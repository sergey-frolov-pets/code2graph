/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<object, object, unknown>;
  export default component;
}
