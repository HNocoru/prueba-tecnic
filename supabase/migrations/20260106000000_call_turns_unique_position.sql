-- Idempotencia de turnos de llamada: un (call_id, position) no se repite.
-- Primero se eliminan duplicados existentes conservando la fila más antigua; ctid desempata
-- (call_turns no tiene created_at). Segura sobre datos existentes y repetible.
DELETE FROM public.call_turns t
USING (
    SELECT ctid AS row_id,
           row_number() OVER (PARTITION BY call_id, position ORDER BY ctid) AS rn
      FROM public.call_turns
) d
WHERE t.ctid = d.row_id AND d.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS ux_call_turns_call_position ON public.call_turns (call_id, position);
