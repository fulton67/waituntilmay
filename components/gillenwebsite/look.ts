// Two housing looks, picked with ?look=flat | ?look=photo (flat is the default).
//   flat:  matcap shading and a black 1 px outline, the bible's technical-drawing register; no floor shadow.
//   photo: PBR in a studio HDRI with a window reflection, accumulated soft shadows, contact shadow, N8AO and a
//          shallow depth of field on the front card.
// The photo look's three tuning variables live in PHOTO; each can also be overridden from the URL,
// e.g. ?look=photo&exposure=1.1&roughness=0.4&grain=0.1
export type Look = "flat" | "photo";

export const PHOTO = {
  exposure: 1.0, // renderer tone-mapping exposure
  roughness: 0.42, // base roughness of the brushed frame and base (the brushed map modulates around it)
  grain: 0.06, // brushed-grain strength: normal-map scale of the brushing
};

export function readLook(): { look: Look; photo: typeof PHOTO } {
  const q = typeof window === "undefined" ? new URLSearchParams() : new URLSearchParams(window.location.search);
  const num = (k: keyof typeof PHOTO) => { const v = parseFloat(q.get(k) ?? ""); return Number.isFinite(v) ? v : PHOTO[k]; };
  return { look: q.get("look") === "photo" ? "photo" : "flat", photo: { exposure: num("exposure"), roughness: num("roughness"), grain: num("grain") } };
}
