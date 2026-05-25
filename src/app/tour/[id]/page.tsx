import { notFound } from "next/navigation";
import { getPublicListingTour } from "@/lib/listings/public";
import { PublicTour } from "@/components/public-tour";

export default async function TourPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tour = await getPublicListingTour(id);
  if (!tour) notFound();

  return (
    <PublicTour
      listing={tour.listing}
      rooms={tour.rooms}
      jobs={tour.jobs}
    />
  );
}
