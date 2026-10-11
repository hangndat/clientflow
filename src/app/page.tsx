import Link from "next/link";

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-50">
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(45,212,191,0.28),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(59,130,246,0.22),transparent_30%),linear-gradient(160deg,#020617_0%,#0f172a_55%,#134e4a_100%)]"
      />
      <div
        aria-hidden
        className="absolute inset-y-0 right-0 w-full max-w-3xl bg-[url('data:image/svg+xml,%3Csvg width=\\'160\\' height=\\'160\\' viewBox=\\'0 0 160 160\\' xmlns=\\'http://www.w3.org/2000/svg\\'%3E%3Cg fill=\\'none\\' stroke=\\'%2394a3b8\\' stroke-opacity=\\'0.12\\'%3E%3Cpath d=\\'M0 40h160M0 80h160M0 120h160M40 0v160M80 0v160M120 0v160\\'/%3E%3C/g%3E%3C/svg%3E')] opacity-70"
      />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-16">
        <p className="mb-4 font-[family-name:var(--font-fraunces)] text-5xl font-semibold tracking-tight text-teal-200 sm:text-6xl">
          ClientFlow
        </p>
        <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          A tenant-safe client portal foundation for freelance delivery.
        </h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-slate-300">
          Sign in, create an organization, and manage clients with PostgreSQL
          Row Level Security as the hard boundary between tenants.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/signup"
            className="rounded-md bg-teal-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-teal-300"
          >
            Create account
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-slate-500/70 bg-slate-900/40 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800/70"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
