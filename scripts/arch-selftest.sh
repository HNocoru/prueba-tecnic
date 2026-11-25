#!/usr/bin/env bash
# Comprueba que cada regla de .dependency-cruiser.cjs detecta su violación deliberada.
# Crea fixtures temporales bajo apps/web/modules/__fixtures__ y apps/web/app/__fixtures__,
# espera que `pnpm arch` falle nombrando la regla, y los borra al terminar.
set -uo pipefail
cd "$(dirname "$0")/.."
M=apps/web/modules
A=apps/web/app/__fixtures__
trap 'rm -rf "$M/zz_a" "$M/zz_b" "$M/channels/zz_c" "$A"; rmdir "$M/channels" 2>/dev/null; true' EXIT

mk() { mkdir -p "$(dirname "$1")"; printf '%s\n' "$2" > "$1"; }
mk "$M/zz_a/index.ts" "export const a = 1;"
mk "$M/zz_a/domain/e.ts" "export const e = 1;"
mk "$M/zz_a/application/uc.ts" "export const uc = 1;"
mk "$M/zz_a/infrastructure/adapter.ts" "export const ad = 1;"
mk "$M/zz_b/index.ts" "export const b = 1;"
mk "$M/channels/zz_c/index.ts" "export const c = 1;"

check() { # <rule> <file> <content>
  mk "$2" "$3"
  out=$(pnpm -s arch 2>&1 || true)
  rm -f "$2"
  if grep -q "$1" <<<"$out"; then echo "ok   $1"; else echo "FAIL $1 no se detectó"; fail=1; fi
}

fail=0
if ! pnpm -s arch >/dev/null 2>&1; then echo "FAIL base: arch debe pasar sin violaciones"; exit 1; fi
check 1-domain-is-pure "$M/zz_a/domain/bad.ts" 'import { ad } from "../infrastructure/adapter"; export const x = ad;'
check 1b-domain-no-npm "$M/zz_a/domain/bad.ts" 'import { z } from "zod"; export const x = z;'
check 2-application-no-infrastructure "$M/zz_a/application/bad.ts" 'import { ad } from "../infrastructure/adapter"; export const x = ad;'
check 3-app-no-module-infrastructure "$A/page.ts" 'import { ad } from "@/modules/zz_a/infrastructure/adapter"; export const x = ad;'
check 4-modules-only-via-index "$M/zz_b/bad.ts" 'import { e } from "../zz_a/domain/e"; export const x = e;'
check 4a-grouped-modules-only-via-index "$M/channels/zz_c/bad.ts" 'import { e } from "../../zz_a/domain/e"; export const x = e;'
check 4b-app-only-via-index "$A/page.ts" 'import { uc } from "@/modules/zz_a/application/uc"; export const x = uc;'
check 5-provider-libs-only-in-infrastructure "$M/zz_a/application/bad.ts" 'import { createClient } from "@supabase/supabase-js"; export const x = createClient;'

if [ "$fail" = 1 ]; then exit 1; fi
if pnpm -s arch >/dev/null 2>&1; then echo "ok   sin violaciones tras limpiar fixtures"; else echo "FAIL limpieza"; exit 1; fi
