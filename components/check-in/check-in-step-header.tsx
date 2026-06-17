type CheckInStepHeaderProps = {
  step: number;
  totalSteps: number;
  title: string;
  description: string;
};

export function CheckInStepHeader({ step, totalSteps, title, description }: CheckInStepHeaderProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-zinc-500">
        Step {step} of {totalSteps}
      </p>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">{title}</h1>
        <p className="mt-2 text-base text-zinc-600">{description}</p>
      </div>
    </div>
  );
}
