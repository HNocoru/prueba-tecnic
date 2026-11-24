/**
 * Reglas de arquitectura (docs/02-architecture.md §4). Se ejecuta con `pnpm arch`.
 * Regla 6 (cada tabla pertenece a un solo módulo) no es de imports: se revisa en las
 * migraciones y en el code review.
 */
const OWN_INDEX = "^apps/web/modules/(?:channels/|agents/)?[^/]+/index\\.ts$";
const NPM = ["npm", "npm-dev", "npm-peer", "npm-optional", "npm-unknown", "npm-no-pkg"];
const NOT_TEST = "\\.(test|spec)\\.tsx?$";

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "1-domain-is-pure",
      comment: "domain/ no importa application, infraestructura ni app/",
      severity: "error",
      from: { path: "^apps/web/modules/.+/domain/", pathNot: NOT_TEST },
      to: { path: ["^apps/web/modules/.+/(infrastructure|application)/", "^apps/web/app/"] },
    },
    {
      name: "1b-domain-no-npm",
      comment: "domain/ no importa paquetes npm externos",
      severity: "error",
      from: { path: "^apps/web/modules/.+/domain/", pathNot: NOT_TEST },
      to: { dependencyTypes: NPM },
    },
    {
      name: "2-application-no-infrastructure",
      comment: "application/ solo conoce puertos, nunca adaptadores",
      severity: "error",
      from: { path: "^apps/web/modules/.+/application/", pathNot: NOT_TEST },
      to: { path: "^apps/web/modules/.+/infrastructure/" },
    },
    {
      name: "3-app-no-module-infrastructure",
      comment: "app/ (entradas delgadas) no importa modules/*/infrastructure",
      severity: "error",
      from: { path: "^apps/web/app/" },
      to: { path: "^apps/web/modules/.+/infrastructure/" },
    },
    {
      name: "4-modules-only-via-index",
      comment: "un módulo (carpeta plana) solo importa a otro por su index.ts",
      severity: "error",
      from: { path: "^apps/web/modules/([^/]+)/", pathNot: "^apps/web/modules/(channels|agents)/" },
      to: {
        path: "^apps/web/modules/.+",
        pathNot: ["^apps/web/modules/$1/", OWN_INDEX],
      },
    },
    {
      name: "4a-grouped-modules-only-via-index",
      comment: "un módulo agrupado (channels/*, agents/*) solo importa a otro por su index.ts",
      severity: "error",
      from: { path: "^apps/web/modules/((?:channels|agents)/[^/]+)/" },
      to: {
        path: "^apps/web/modules/.+",
        pathNot: ["^apps/web/modules/$1/", OWN_INDEX],
      },
    },
    {
      name: "4b-app-only-via-index",
      comment: "app/ importa un módulo solo por su index.ts",
      severity: "error",
      from: { path: "^apps/web/app/" },
      to: {
        path: "^apps/web/modules/.+",
        pathNot: "^apps/web/modules/(?:channels/|agents/)?[^/]+/(index|composition)\\.ts$",
      },
    },
    {
      name: "5-provider-libs-only-in-infrastructure",
      comment: "@supabase/* y los SDK de modelos solo en infrastructure/ o packages/ai",
      severity: "error",
      from: {
        path: "^apps/web/(app|modules)/",
        pathNot: ["^apps/web/modules/.+/infrastructure/", NOT_TEST],
      },
      to: { path: "node_modules/(@supabase/|@ai-sdk/|ai/)" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: { path: "(^|/)(\\.next|coverage)/" },
    tsConfig: { fileName: "apps/web/tsconfig.json" },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
    },
  },
};
