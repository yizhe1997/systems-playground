import { unstable_rethrow } from "next/navigation";
import { notFound } from "next/navigation";
import { ApiFailure } from "@/lib/api";
import { getAccounts, getSettings, getTrade, getTradeImages } from "@/lib/data";
import { zoneName } from "@/lib/format";
import { CouldNotLoad } from "@/components/Notice";
import { TradeForm } from "@/components/TradeForm";

export const dynamic = "force-dynamic";

export default async function EditTradePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  // after a new trade was saved but some images were not stored: how many (the form says so)
  const notAdded = Math.max(0, Number.parseInt(Array.isArray(sp.notadded) ? sp.notadded[0] : (sp.notadded ?? ""), 10) || 0);
  let trade, accounts, settings, images;
  try {
    [trade, accounts, settings, images] = await Promise.all([getTrade(id), getAccounts(true), getSettings(), getTradeImages(id)]);
  } catch (e) {
    unstable_rethrow(e);
    if (e instanceof ApiFailure && e.status === 404) notFound();
    return <CouldNotLoad />;
  }
  // the account chooser lists active accounts, and the trade's own account even when it is archived
  const choices = accounts.filter((a) => !a.archived || a.id === trade.accountId);
  // keyed on the version so "Reload" after a conflict starts the form again from the latest copy
  return <TradeForm key={trade.updatedAt} accounts={choices} zone={settings.timeZone} zoneLabel={zoneName(settings.timeZone)} trade={trade} images={images} notAdded={notAdded || undefined} />;
}
