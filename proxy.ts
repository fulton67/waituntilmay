import { NextRequest, NextResponse } from "next/server";

const COOKIE = "lb-auth";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/lunch-bells/login") return NextResponse.next();

  const auth = req.cookies.get(COOKIE)?.value;
  const password = process.env.LUNCH_BELLS_PASSWORD;

  if (password && auth === password) return NextResponse.next();

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/lunch-bells/login";
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/lunch-bells", "/lunch-bells/:path*"],
};
