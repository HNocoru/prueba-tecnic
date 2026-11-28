/**
 * Limpia un secreto que viaja en un encabezado HTTP (Authorization: Bearer ...).
 * Quita espacios y saltos de línea de los extremos y rechaza lo que no sea ASCII imprimible:
 * un carácter raro (comillas curvas, "…", espacios invisibles) hace que fetch lance un
 * TypeError ilegible. El error nombra la VARIABLE y la posición, nunca el valor.
 */
export function cleanSecret(variableName: string, raw: string): string {
  const value = raw.trim();
  const bad = value.search(/[^\x21-\x7e]/);
  if (bad >= 0) {
    throw new Error(
      `${variableName} tiene un carácter no válido en la posición ${bad + 1} (revisa los archivos de entorno: comillas curvas, espacios o "…")`,
    );
  }
  return value;
}
