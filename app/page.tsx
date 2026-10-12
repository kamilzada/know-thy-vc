export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 py-28 md:py-44">
      <p className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-1 font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        Live investor intel
      </p>
      <h1 className="font-display text-[2.75rem] leading-[1.05] md:text-6xl lg:text-[5.25rem]">
        Walk into every pitch <span className="gradient-text">prepared.</span>
      </h1>
      <p className="mt-6 max-w-xl text-lg text-muted-foreground">
        Name and firm in. A sourced investor brief out, in under two minutes.
      </p>
      <p className="mt-10 font-mono text-sm text-muted-foreground">Know Thy VC · coming online</p>
    </main>
  );
}
