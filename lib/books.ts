// Central registry of all harvest books.
// Add a new entry here to create a new book on the site.

export interface Book {
  slug: string;
  title: string;
  description: string;
}

export const BOOKS: Book[] = [
  {
    slug: "something-to-eat",
    title: "something to eat",
    description: "food without faces — a collective archive",
  },
  // add new harvest themes here
];

// The anthology slug — collects submissions from ALL books above.
export const ANTHOLOGY_SLUG = "im-starting-to-become-a-hoarder";
export const ANTHOLOGY_TITLE = "im starting to become a hoarder,";

// Returns all source slugs for a given theme.
// The anthology pulls from every book.
export function getThemeSources(theme: string): string[] {
  if (theme === ANTHOLOGY_SLUG) return BOOKS.map(b => b.slug);
  return [theme];
}
