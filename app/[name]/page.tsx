import DownloadPage from "@/components/DownloadPage";

interface Props {
  params: Promise<{ name: string }>;
}

export default async function NamePage({ params }: Props) {
  const { name } = await params;
  return <DownloadPage name={decodeURIComponent(name)} />;
}
