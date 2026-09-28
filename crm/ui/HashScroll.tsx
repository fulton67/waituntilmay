"use client";

import { useEffect } from "react";
import { goToSection, type SectionId } from "./Shell";

/** Arriving at /crm#schedule (from another CRM page's rail) scrolls to that section. */
export function HashScroll() {
  useEffect(() => {
    const id = window.location.hash.slice(1) as SectionId;
    if (id) window.setTimeout(() => goToSection(id), 60);
  }, []);
  return null;
}
