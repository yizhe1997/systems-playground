import { GradeReviewPanel } from '../../../components/tradingcopilot/GradeReviewPanel';

export default function CreatorReviewPage() {
  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Review & Grade</h1>
      <GradeReviewPanel tradePlanId="" />
    </main>
  );
}
