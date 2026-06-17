import Image from "next/image";
import type { PublicPlantCase } from "@/lib/plants/get-public-plant-case";

type PublicPlantCaseViewProps = {
  plant: PublicPlantCase;
};

function plantTitle(plant: PublicPlantCase): string {
  if (plant.name?.trim()) return plant.name.trim();
  if (plant.species?.trim()) return plant.species.trim();
  return "Your plant";
}

export function PublicPlantCaseView({ plant }: PublicPlantCaseViewProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{plantTitle(plant)}</h1>
        {plant.name?.trim() && plant.species?.trim() ? (
          <p className="mt-1 text-base text-zinc-600">{plant.species}</p>
        ) : null}
      </div>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="relative aspect-[4/3] w-full bg-zinc-100">
          {plant.photoUrl ? (
            <Image
              src={plant.photoUrl}
              alt=""
              fill
              sizes="(max-width: 512px) 100vw, 32rem"
              className="object-cover"
              unoptimized
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-zinc-500">No photo</div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Status</p>
        <p className="mt-1 text-lg font-semibold text-zinc-900">{plant.statusLabel}</p>
        <p className="mt-2 text-sm leading-6 text-zinc-600">{plant.statusMessage}</p>
      </section>

      <p className="text-center text-xs text-zinc-500">
        Checked in{" "}
        {new Date(plant.checkedInAt).toLocaleString("en-GB", {
          dateStyle: "medium",
          timeStyle: "short",
        })}
      </p>
    </div>
  );
}
