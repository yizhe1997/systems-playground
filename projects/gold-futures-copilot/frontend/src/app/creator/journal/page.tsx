import { JournalForm } from '../../../components/tradingcopilot/JournalForm';

export default function CreatorJournalPage() {
  return (
    <main className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Creator Journal</h1>
      <p className="text-sm text-slate-600">Submit closed trade outcomes and generate deterministic retrospective feedback.</p>
      <JournalForm />
    </main>
  );
}
