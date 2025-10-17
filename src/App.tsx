import { Link } from 'react-router-dom';

export default function App() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-gradient-to-br from-blue-50 via-white to-purple-50 px-6 py-16 text-center">
      <div className="space-y-4 max-w-2xl">
        <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-100/60 px-4 py-1 text-sm font-medium text-blue-700 shadow-sm">
          Alfie Designer • Studio créatif intelligent
        </span>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Votre assistant IA pour créer des visuels cohérents et captivants
        </h1>
        <p className="text-base text-slate-600 sm:text-lg">
          Lancez le générateur en un clic et explorez l&apos;interface complète de la plateforme Alfie Designer.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Link
          to="/generator"
          className="inline-flex items-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:bg-blue-500"
        >
          Accéder au générateur
        </Link>
        <Link
          to="/landing"
          className="inline-flex items-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        >
          Explorer l&apos;app complète
        </Link>
      </div>
    </main>
  );
}
