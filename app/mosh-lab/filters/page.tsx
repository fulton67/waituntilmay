import FilterBook from "@/components/mosh-lab/FilterBook";

export const metadata = {
  title: "mosh lab · filters — waituntilmay",
  description:
    "every ffmpeg video filter in plain English, grouped by what it does to "
    + "the picture, with a before/after for each",
};

export default function MoshFiltersPage() {
  return <FilterBook />;
}
