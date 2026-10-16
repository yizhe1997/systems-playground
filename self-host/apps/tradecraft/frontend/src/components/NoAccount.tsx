import Link from "next/link";

export function NoAccount({ title }: { title: string }) {
  return (
    <>
      <div className="page-head">
        <h1 className="title">{title}</h1>
      </div>
      <div className="card empty">
        <h2 className="section">Create an account first.</h2>
        <p>Every review belongs to an account.</p>
        <Link className="btn" href="/accounts?new=1">New account</Link>
      </div>
    </>
  );
}
