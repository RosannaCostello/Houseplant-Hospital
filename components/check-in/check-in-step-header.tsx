type CheckInStepHeaderProps = {
  step: number;
  totalSteps: number;
  title: string;
  description: string;
};

export function CheckInStepHeader({ step, totalSteps, title, description }: CheckInStepHeaderProps) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        Step {step} of {totalSteps}
      </p>
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900">{title}</h1>
        <p className="mt-1 text-sm leading-snug text-zinc-600">{description}</p>
      </div>
    </div>
  );
}
