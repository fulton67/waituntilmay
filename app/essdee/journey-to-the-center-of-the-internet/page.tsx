import JourneyPlayer from "@/components/JourneyPlayer";

// A static segment, so it takes priority over app/essdee/[name], which treats
// its segment as a person's name and logs a link_open event to KV. Without
// this route every visit here wrote a junk analytics event and rendered the
// download page instead of the piece.
export const metadata = {
  title: "journey to the center of the internet — waituntilmay",
  description: "a copy with no original",
};

export default function EssdeeJourneyToTheCenterOfTheInternet() {
  return <JourneyPlayer />;
}
