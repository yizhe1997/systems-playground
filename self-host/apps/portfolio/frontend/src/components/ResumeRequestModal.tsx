'use client';

import { createContext, useContext, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const pushBtn =
  'transition-transform duration-200 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:translate-x-1 hover:translate-y-1';

const dsInput =
  'w-full px-3 py-2.5 bg-white border-2 border-black rounded-[0.5rem] text-[var(--ds-charcoal)] placeholder:text-[var(--ds-charcoal)]/40 focus:outline-none focus:shadow-[3px_3px_0px_0px_#000] transition-shadow';

const ResumeRequestModalContext = createContext<{ open: () => void } | null>(null);

export function useResumeRequest() {
  const ctx = useContext(ResumeRequestModalContext);
  if (!ctx) throw new Error('useResumeRequest must be used within ResumeRequestProvider');
  return ctx;
}

export function ResumeRequestProvider({ children }: { children: React.ReactNode }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', company: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085';
      const res = await fetch(`${url}/api/resume/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const { id } = await res.json();
        setModalOpen(false);
        setForm({ name: '', email: '', company: '', reason: '' });
        router.push(`/resume/status/${id}`);
      } else {
        toast({ title: "Couldn't send that", description: 'Try again in a moment.', variant: 'destructive' });
      }
    } catch (err) {
      console.error(err);
      toast({ title: 'Network error', description: 'Check your connection and try again.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ResumeRequestModalContext.Provider value={{ open: () => setModalOpen(true) }}>
      {children}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent
          className="sm:max-w-md bg-white border-2 border-black text-[var(--ds-charcoal)] ring-0"
          style={{ fontFamily: 'var(--ds-font-body)', borderRadius: '0.75rem', boxShadow: '8px 8px 0px 0px #000' }}
        >
          <DialogHeader>
            <DialogTitle className="text-2xl text-black" style={{ fontFamily: 'var(--ds-font-display)', fontWeight: 800 }}>
              Request resume
            </DialogTitle>
            <DialogDescription className="text-[var(--ds-charcoal)]/70 mt-2 text-sm">
              The full resume isn&apos;t publicly exposed. Fill this in and an expiring link gets emailed once approved.
            </DialogDescription>
          </DialogHeader>

          <p className="text-xs text-[var(--ds-charcoal)]/60 -mt-2">
            Already sent a request? Check the confirmation email for a link to track its status.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2 text-sm">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider">Name</label>
              <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className={dsInput} placeholder="Jane Doe" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider">Company</label>
              <input required value={form.company} onChange={e => setForm({...form, company: e.target.value})} className={dsInput} placeholder="Acme, Inc." />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider">Email</label>
              <input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className={dsInput} placeholder="jane@acme.com" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider">Reason (optional)</label>
              <textarea value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} className={`${dsInput} resize-none`} placeholder="Hiring for a backend role..." rows={3} />
            </div>
            <div className="pt-3 flex justify-end gap-3">
              <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm font-bold text-[var(--ds-charcoal)]/60 hover:text-black transition-colors">
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={`inline-flex items-center gap-2 px-5 py-2.5 bg-black text-white font-bold border-2 border-black shadow-[4px_4px_0px_0px_#000] hover:shadow-none disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-[4px_4px_0px_0px_#000] disabled:hover:translate-x-0 disabled:hover:translate-y-0 ${pushBtn} focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2`}
                style={{ borderRadius: '0.75rem' }}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <ArrowRight className="w-4 h-4" aria-hidden="true" />}
                Submit
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </ResumeRequestModalContext.Provider>
  );
}
