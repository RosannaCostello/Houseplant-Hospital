type CheckInStepHeaderProps = {
  step: number;
  totalSteps: number;
  title: string;
  description: string;
};

export function CheckInStepHeader({ step, totalSteps, title, description }: CheckInStepHeaderProps) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-hilda-text-muted">
        Step {step} of {totalSteps}
      </p>
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-hilda-heading">{title}</h1>
        <p className="mt-1 text-sm leading-snug text-hilda-text">{description}</p>
      </div>
    </div>
  );
}
