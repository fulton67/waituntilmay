#!/usr/bin/env bash
# tools/case/build.sh <N>  ->  site/assets/case/sie-case-v<N>.glb   (textures -> raw glb -> optimised glb)
set -e; cd "$(dirname "$0")"; N=${1:?version}
python make_textures.py >/dev/null
node build_glb.mjs
npx gltf-transform optimize build/sie-case-raw.glb build/sie-case-opt.glb --simplify false --flatten false --join false --instance false --palette false --texture-compress webp --texture-size 2048 >/dev/null
cp build/sie-case-opt.glb ../../site/assets/case/sie-case-v$N.glb
ls -l ../../site/assets/case/sie-case-v$N.glb
