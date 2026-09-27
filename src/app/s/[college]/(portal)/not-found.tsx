import Link from "next/link";

export default function PortalNotFound() {
  return (
    <div className="page-width max-w-xl py-16">
      <h1 className="hd-1">Page not found</h1>
      <p className="lede mt-3">This notice or page may have expired or been removed by the college.</p>
      <Link href="/" className="btn-secondary mt-6">Back to the portal</Link>
    </div>
  );
}
