// node inspect.mjs <file.glb> [dumpDir]  -- node tree, mesh bounds, materials, textures
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import fs from 'fs'; import path from 'path';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const [file, dump] = process.argv.slice(2);
const doc = await io.read(file);
const out = { file: path.basename(file), bytes: fs.statSync(file).size, nodes: [], textures: [], tris: 0 };
const walk = (n, depth, parent) => {
  const m = n.getMesh(); let info = { name: n.getName(), parent, depth, t: n.getTranslation().map(v=>+v.toFixed(4)), r: n.getRotation().map(v=>+v.toFixed(4)), s: n.getScale().map(v=>+v.toFixed(4)) };
  if (m) { let mn=[1e9,1e9,1e9], mx=[-1e9,-1e9,-1e9], tris=0;
    for (const p of m.listPrimitives()) { const a=p.getAttribute('POSITION'); const lo=a.getMin([]), hi=a.getMax([]);
      for (let i=0;i<3;i++){mn[i]=Math.min(mn[i],lo[i]);mx[i]=Math.max(mx[i],hi[i]);}
      tris += (p.getIndices()? p.getIndices().getCount(): a.getCount())/3;
      const mat=p.getMaterial(); info.material = mat && { name: mat.getName(), base: mat.getBaseColorFactor().map(v=>+v.toFixed(3)), rough: mat.getRoughnessFactor(), metal: mat.getMetallicFactor(), alpha: mat.getAlphaMode(), tex: mat.getBaseColorTexture() && mat.getBaseColorTexture().getName(), ext: mat.listExtensions().map(e=>e.extensionName) }; }
    info.min=mn.map(v=>+v.toFixed(4)); info.max=mx.map(v=>+v.toFixed(4)); info.tris=tris; out.tris+=tris; }
  out.nodes.push(info);
  for (const c of n.listChildren()) walk(c, depth+1, n.getName());
};
for (const s of doc.getRoot().listScenes()) for (const n of s.listChildren()) walk(n, 0, null);
for (const t of doc.getRoot().listTextures()) { const img=t.getImage(); out.textures.push({ name:t.getName(), mime:t.getMimeType(), size:t.getSize(), bytes: img?img.byteLength:0 });
  if (dump && img) { fs.mkdirSync(dump,{recursive:true}); fs.writeFileSync(path.join(dump,(t.getName()||('tex'+out.textures.length))+'.'+t.getMimeType().split('/')[1]), img); } }
console.log(JSON.stringify(out, null, 1));
