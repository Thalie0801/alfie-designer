import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-muted/30 px-6 py-12 text-center">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Bienvenue sur Alfie Designer</h1>
        <p className="text-muted-foreground">
          Lancez le générateur pour créer vos assets visuels personnalisés.
        </p>
      </div>
      <Link
        href="/generator"
        className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90"
      >
        Accéder au générateur
      </Link>
    </main>
  );
}
