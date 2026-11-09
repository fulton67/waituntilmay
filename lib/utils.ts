// shadcn's `cn` helper without the clsx / tailwind-merge dependencies: joins truthy class names in order (later classes win by
// source order in our own CSS; no Tailwind conflict resolution).
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
