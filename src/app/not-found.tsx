import Link from "next/link";
import { LogoMark } from "@/components/ui/Logo";
import { platformUrl } from "@/lib/tenant";

export default function NotFound() {
  return (
    <main className="page-width flex min-h-dvh max-w-xl flex-col justify-center py-16">
      <LogoMark size={32} />
      <h1 className="hd-1 mt-6">Nothing at this address</h1>
      <p className="lede mt-3">
        There is no page here. If you typed a college address, check the spelling. College portals look like <strong>yourcollege.notifyhub.in</strong>.
      </p>
      <Link href={platformUrl("/")} className="btn-secondary mt-6 self-start">Go to NotifyHub</Link>
    </main>
  );
}
