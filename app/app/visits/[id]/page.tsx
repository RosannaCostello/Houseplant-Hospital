import { notFound } from "next/navigation";
import { VisitDetailView } from "@/components/visits/visit-detail-view";
import { getVisitDetail } from "@/lib/visits/get-visit-detail";

type VisitDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function VisitDetailPage({ params }: VisitDetailPageProps) {
  const { id } = await params;
  const visit = await getVisitDetail(id);

  if (!visit) {
    notFound();
  }

  return <VisitDetailView visit={visit} />;
}
