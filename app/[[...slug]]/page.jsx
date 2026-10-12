import Archive from "../archive";
import { publicationArchive, routeData } from "../../lib/data.mjs";
import { notFound } from "next/navigation";
export const dynamicParams = false;
export function generateStaticParams() {
  const a = publicationArchive();
  return [
    { slug: [] },
    { slug: ["players"] },
    { slug: ["rankings"] },
    { slug: ["tours"] },
    { slug: ["archive"] },
    ...a.courses.map((c) => ({ slug: ["course", c.id] })),
    ...a.players.map((p) => ({ slug: ["player", p.id] })),
  ];
}
export async function generateMetadata({ params }) {
  const { slug = [] } = await params;
  const { view, data } = routeData(slug);
  const titles = {
    home: "Mario Kart Tour World Records",
    players: "Player Profiles",
    rankings: "Player Rankings",
    tours: "Time Trial Tour Calendar",
    archive: "Archive Coverage",
  };
  const title = view === "home" ? "Mario Kart Tour Time Trial World Records"
    : view === "course" ? `${data?.name} — Time Trial WR History`
    : view === "player" ? `${data?.name} — World Record History` : titles[view];
  const description = view === "course"
    ? `${data?.name} Mario Kart Tour Time Trial world records: historical times, players, submission dates, lap splits, proof and tour-adjusted record durations.`
    : view === "player"
      ? `${data?.name}'s Mario Kart Tour Time Trial world records, current records, historical times, lap splits and total playable days held.`
      : "Mario Kart Tour Time Trial world records and history, player rankings, lap times, video and image proof, and playable tour durations.";
  const url = "/" + slug.join("/");
  return { title, description, alternates: { canonical: url },
    openGraph: { title, description, url, siteName: "Mario Kart Tour World Records", type: "website", images: [{ url: "/social-card.png", width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: ["/social-card.png"] },
  };
}
export default async function Page({ params }) {
  const { slug = [] } = await params;
  const props = routeData(slug);
  if (!props.data) notFound();
  return <Archive {...props} />;
}
