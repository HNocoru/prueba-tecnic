interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = "Cargando contactos…" }: LoadingStateProps) {
  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card p-8">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
