// The housing's photo setup: a studio HDRI with a window reflection, accumulated soft shadows, a contact shadow,
// N8AO and a shallow depth of field on the front card. Three tuning variables live in PHOTO; each can also be
// overridden from the URL, e.g. ?exposure=1.1&roughness=0.4&grain=0.1
export const PHOTO = {
  exposure: 1.0, // renderer tone-mapping exposure
  roughness: 0.42, // base roughness of the brushed frame and base (the brushed map modulates around it)
  grain: 0.06, // brushed-grain strength: normal-map scale of the brushing
};

export function readLook(): typeof PHOTO {
  const q = typeof window === "undefined" ? new URLSearchParams() : new URLSearchParams(window.location.search);
  const num = (k: keyof typeof PHOTO) => { const v = parseFloat(q.get(k) ?? ""); return Number.isFinite(v) ? v : PHOTO[k]; };
  return { exposure: num("exposure"), roughness: num("roughness"), grain: num("grain") };
}
