// Shared by the CRM root layout (pre-paint script) and IntroOverlay (client decision).
export const INTRO_SEEN_KEY = "crm-intro-seen";

// Hides the server-rendered intro overlay before paint on a full load when the sting was already
// seen this session or the user prefers reduced motion, so the app never flashes navy.
export const INTRO_SKIP_SCRIPT = `try{if(sessionStorage.getItem("${INTRO_SEEN_KEY}")||matchMedia("(prefers-reduced-motion: reduce)").matches){document.documentElement.setAttribute("data-crm-intro","skip")}}catch(e){}`;
