interface PagePlaceholderProps {
  title: string;
  /** Fase da SPEC (§11) em que esta tela será implementada. */
  phase: number;
}

export function PagePlaceholder({ title, phase }: PagePlaceholderProps) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-2 p-6 text-center">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">
        Em construção — chega na Fase {phase} da SPEC.
      </p>
    </main>
  );
}
