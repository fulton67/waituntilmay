#!/bin/bash
# run_build.sh MODEL.glb OUTNAME FRONT LEFT BACK RIGHT  (flat skins, paths relative to build/)
cd "$(dirname "$0")"
B="/c/Program Files/Blender Foundation/Blender 5.2/blender.exe"
w() { cygpath -w "$PWD/$1"; }
"$B" -b --factory-startup -P blender/project.py -- "$(w $1)" "$(w renders/$2)" "$(w $3)" "$(w $4)" "$(w $5)" "$(w $6)" 2>&1 \
  | grep -E "^(verts|yaw|glasses|chosen|view|palette|bake|baked|saved|Traceback|  File|[A-Za-z]*Error)" 
C:/Users/naimj/tools/style-venv/Scripts/python.exe -I -c "
from PIL import Image
fs=['soft_q34','soft_front','soft_left','soft_back','toon_q34']
ims=[Image.open('renders/$2/'+f+'.png').convert('RGBA') for f in fs]
h=600; ims=[i.resize((int(i.width*h/i.height),h)) for i in ims]
s=Image.new('RGBA',(sum(i.width for i in ims),h),(235,235,235,255)); x=0
for i in ims: s.alpha_composite(i,(x,0)); x+=i.width
s.convert('RGB').save('renders/$2/strip.jpg',quality=85)"
