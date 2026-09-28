import { DM_Sans } from "next/font/google";

/**
 * Aeonik is the brand face. Until the licensed files are in public/fonts/, DM Sans stands in.
 * To switch: drop Aeonik-Regular/Medium/Bold.woff2 into public/fonts/ and replace this with
 *
 *   import localFont from "next/font/local";
 *   export const crmFont = localFont({
 *     src: [
 *       { path: "../../public/fonts/Aeonik-Regular.woff2", weight: "400" },
 *       { path: "../../public/fonts/Aeonik-Medium.woff2", weight: "500" },
 *       { path: "../../public/fonts/Aeonik-Bold.woff2", weight: "700" },
 *     ],
 *     variable: "--font-crm",
 *     display: "swap",
 *   });
 */
export const crmFont = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-crm", display: "swap" });
