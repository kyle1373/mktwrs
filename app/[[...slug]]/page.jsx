import Archive from "../archive";
import { archive, routeData } from "../../lib/data.mjs";
import { notFound } from "next/navigation";
export const dynamicParams = false;
export function generateStaticParams() {
  const a = archive();
  return [
    { slug: [] },
    { slug: ["players"] },
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
    tours: "Time Trial Tour Calendar",
    archive: "Archive Coverage",
  };
  return {
    title: titles[view] || data?.name + " — Mario Kart Tour World Records",
  };
}
export default async function Page({ params }) {
  const { slug = [] } = await params;
  const props = routeData(slug);
  if (!props.data) notFound();
  return <Archive {...props} />;
}
