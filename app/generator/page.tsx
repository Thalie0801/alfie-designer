import Link from 'next/link';

export default function GeneratorPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Asset Generator</h1>
        <p className="text-muted-foreground">
          Cette page Next.js servira de point d&apos;entrée pour brancher l&apos;expérience générateur existante.
          Reportez-vous aux composants sous <code className="font-mono">src/components</code> pour réutiliser
          l&apos;interface actuelle.
        </p>
      </header>
      <section className="rounded-lg border bg-card p-6 shadow-sm">
        <p className="mb-4 text-sm text-muted-foreground">
          TODO: connecter la logique de génération en s&apos;appuyant sur les API exposées ci-dessous. Le hook client{' '}
          <code className="font-mono">generateImages</code> de <code className="font-mono">lib/api.ts</code> peut être
          utilisé directement depuis le composant React existant.
        </p>
        <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs">
{`// Exemple d'intégration côté client :
// import { generateImages } from '@/lib/api';
//
// async function onGenerate() {
//   const result = await generateImages({
//     projectId: currentProjectId,
//     prompt: userPrompt,
//     aspect: '1:1',
//     count: 2,
//   });
//
//   console.log(result.assets);
// }
`}
        </pre>
        <p className="mt-4 text-sm">
          <span className="font-semibold">Astuce :</span> utilisez la page{' '}
          <Link className="underline" href="/">d&apos;accueil existante</Link> pour tester l&apos;UI actuelle tant que la
          migration Next.js est en cours.
        </p>
      </section>
    </div>
  );
}
