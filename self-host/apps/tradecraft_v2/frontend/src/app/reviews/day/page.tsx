import { notFound } from "next/navigation";
import { ApiFailure } from "@/lib/api";
import { getAccounts, getDay, getReviewsMonth, getSettings } from "@/lib/data";
import { one, resolveAccount } from "@/lib/reviewsContext";
import { count, dateTime, dayLabel, longDay, zoneName } from "@/lib/format";
import { AccountSwitcher } from "@/components/AccountSwitcher";
import { CouldNotLoad } from "@/components/Notice";
import { DayNav } from "@/components/DayNav";
import { DayTradesTable } from "@/components/DayTradesTable";
import { FocusCard } from "@/components/FocusCard";
import { NoAccount } from "@/components/NoAccount";
import { NumbersStrip } from "@/components/NumbersStrip";
import { ReviewForm } from "@/components/ReviewForm";
import { StatusChip } from "@/components/StatusChip";

export const dynamic = "force-dynamic";

export default async function DailyReviewPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  let accounts, settings;
  try {
    [accounts, settings] = await Promise.all([getAccounts(true), getSettings()]);
  } catch {
    return <CouldNotLoad />;
  }
  const account = resolveAccount(accounts, one(sp.account));
  if (!account) return <NoAccount title="Daily review" />;

  let date = one(sp.date);
  let review;
  try {
    if (!date) date = (await getReviewsMonth(account.id)).today;
    review = await getDay(account.id, date);
  } catch (e) {
    if (e instanceof ApiFailure && (e.status === 404 || e.status === 422)) notFound();
    return <CouldNotLoad />;
  }
  const zone = settings.timeZone;
  const unjudged = review.stats.planFollowed.notJudged;
  const state = review.state ?? undefined;

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="title">Daily review</h1>
          <p className="subtitle">
            {longDay(review.date)} · {review.accountName}
            {review.reviewedAt && ` · Reviewed ${dateTime(review.reviewedAt, zone)}`}
            {review.editedAt && ` · Edited ${dateTime(review.editedAt, zone)}`}
          </p>
        </div>
        <div className="bar-group">
          <AccountSwitcher accounts={accounts} current={account.id} />
          <StatusChip state={state} />
        </div>
      </div>
      <div className="bar">
        <DayNav account={account.id} date={review.date} previousDate={review.previousDate} nextDate={review.nextDate} today={review.today} />
      </div>

      {review.tradesChangedAfterReview > 0 && review.reviewedAt && (
        <div className="banner" role="status">
          <span className="banner-title">
            ! {count(review.tradesChangedAfterReview, "trade")} changed after you marked this review as reviewed on {dateTime(review.reviewedAt, zone)}. Check your answers still fit. They stay editable.
          </span>
        </div>
      )}
      {unjudged > 0 && (
        <div className="banner" role="status">
          <span className="banner-title">! {unjudged === 1 ? "1 trade is not judged yet." : `${unjudged} trades are not judged yet.`}</span>
        </div>
      )}

      <FocusCard review={review} />
      <NumbersStrip stats={review.stats} />

      {review.trades.length > 0 ? (
        <DayTradesTable trades={review.trades} stats={review.stats} zone={zone} zoneLabel={zoneName(zone)} />
      ) : (
        <div className="card empty section-card">
          <h2 className="section">No trades on {dayLabel(review.date, false)} for {review.accountName}.</h2>
          <p>You can still write what you will focus on next session. Trades logged later appear here.</p>
          <a className="btn" href="/trades/new">Add a trade</a>
        </div>
      )}

      <ReviewForm key={review.updatedAt ?? "new"} review={review} zone={zone} />
    </>
  );
}
