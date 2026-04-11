type Plan = {
  id: string;
  instrument: string;
  bias: 'long' | 'short' | 'neutral';
  entryRange: string;
  status: 'active' | 'closed' | 'invalidated';
};

type RecentPlansProps = {
  plans: Plan[];
};

export function RecentPlans({ plans }: RecentPlansProps) {
  const getBiasColor = (bias: Plan['bias']) => {
    switch (bias) {
      case 'long': return 'text-long';
      case 'short': return 'text-short';
      case 'neutral': return 'text-neutral-bias';
    }
  };

  const getStatusClass = (status: Plan['status']) => {
    switch (status) {
      case 'active': return 'active';
      case 'closed': return 'closed';
      case 'invalidated': return 'invalidated';
    }
  };

  return (
    <div className="space-y-0">
      {plans.map((plan, index) => (
        <div key={plan.id}>
          <div className="flex items-center gap-4 md:gap-8 py-4 font-mono text-sm">
            {/* Number */}
            <span className="text-secondary w-8">{plan.id}.</span>
            
            {/* Instrument */}
            <span className="text-primary w-12">{plan.instrument}</span>
            
            {/* Bias */}
            <span className={`w-20 uppercase tracking-wider ${getBiasColor(plan.bias)}`}>
              {plan.bias}
            </span>
            
            {/* Entry Range */}
            <span className="flex-1 text-secondary tracking-wide">
              {plan.entryRange}
            </span>
            
            {/* Status */}
            <div className="flex items-center gap-2">
              <span className={`status-dot ${getStatusClass(plan.status)}`} />
              <span className="text-xs uppercase tracking-widest text-secondary">
                {plan.status}
              </span>
            </div>
          </div>
          
          {/* Hairline divider */}
          {index < plans.length - 1 && <div className="hairline-h" />}
        </div>
      ))}

      {plans.length === 0 && (
        <p className="font-mono text-secondary text-center py-12 tracking-wider">
          NO RECENT PLANS
        </p>
      )}
    </div>
  );
}
