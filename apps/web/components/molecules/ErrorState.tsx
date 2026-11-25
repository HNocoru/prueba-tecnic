interface ErrorStateProps {
  message: string;
}

export function ErrorState({ message }: ErrorStateProps) {
  return (
    <div className="flex w-full flex-1 items-center justify-center rounded-lg border border-border bg-card p-8 text-center">
      <p className="text-sm text-destructive">{message}</p>
    </div>
  );
}
