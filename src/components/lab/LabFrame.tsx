import { Link } from "@tanstack/react-router";

/**
 * The wrapper every laboratory page wears.
 *
 * The banner is not decoration and it is not a disclaimer bolted on at the end.
 * A fixture card and a real card are the same shape by construction — that is
 * deliberate, because the laboratory would be worthless if it could show states
 * the engine cannot actually produce — and the consequence is that the only
 * thing distinguishing this page from the product is what it says about itself.
 *
 * So it says it on every page, above the content, in the same place each time.
 * Not once on entry: someone deep-links to a specimen, screenshots it, and the
 * screenshot has to carry the label too.
 */
export function LabFrame({
  title,
  lede,
  back,
  children,
}: {
  title: string;
  lede: string;
  back?: { label: string; to: string };
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-14 sm:px-6">
      <div
        role="note"
        className="flex flex-col gap-2 rounded-lg border border-accent/40 bg-accent/5 p-4"
      >
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
          Fixture laboratory — development only
        </p>
        <p className="max-w-[62ch] text-[14px] leading-relaxed text-text-s">
          Nothing on these pages was retrieved from a real source. Every opportunity here was built
          from handwritten HTML and put through the same engine the live product uses, so the states
          are real states — but the opportunities are not real opportunities, and none of this is
          evidence that anything exists.
        </p>
        <p className="max-w-[62ch] text-[14px] leading-relaxed text-text-s">
          Positions you take here are genuinely recorded and genuinely read back, which is what
          makes the walk worth doing. They live in the development server&rsquo;s memory and are
          gone when it restarts. Nothing is written to a database and no account is involved.
        </p>
      </div>

      <header className="flex flex-col gap-3">
        {back ? (
          <Link
            to={back.to}
            className="w-fit font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-text-s transition-colors duration-[120ms] hover:text-accent"
          >
            &larr; {back.label}
          </Link>
        ) : null}
        <h1 className="text-3xl font-black leading-[1.1] tracking-tighter text-foreground sm:text-4xl">
          {title}
        </h1>
        <p className="max-w-[62ch] text-[15px] leading-relaxed text-text-s">{lede}</p>
      </header>

      {children}
    </div>
  );
}
