#!/bin/sh
# Local production build of the whole site into .next-prod, then serve on :3108.
# app/reels/admin is moved aside (it needs secrets), turbopack gets an explicit root, and the dev server's
# .next type stubs are dropped from tsconfig for the build. Everything is restored afterwards.
cd "$(dirname "$0")/../../../.." || exit 1
rm -rf .next-prod
mv app/reels/admin ../_reels_admin_tmp
sed -i 's|const nextConfig: NextConfig = {|const nextConfig: NextConfig = {\n  turbopack: { root: process.cwd() },|' next.config.ts
sed -i '/"\.next\/dev\/types\/\*\*\/\*\.ts",/d; /"\.next\/types\/\*\*\/\*\.ts",/d' tsconfig.json
NEXT_DIST_DIR=.next-prod npx next build > ../_build.log 2>&1; code=$?
mv ../_reels_admin_tmp app/reels/admin
git checkout -- tsconfig.json next.config.ts
echo "build exit $code"; grep -n "rror" ../_build.log | head -5
[ $code -eq 0 ] || exit $code
(NEXT_DIST_DIR=.next-prod npx next start -p 3108 > ../_start.log 2>&1 &)
for i in $(seq 1 40); do curl -s -o /dev/null -w "%{http_code}" http://localhost:3108/ostad/refs | grep -q 200 && { echo "serving :3108"; exit 0; }; sleep 2; done
echo "server did not come up"; exit 1
