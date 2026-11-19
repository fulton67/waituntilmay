import { useLayoutEffect, useRef } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";

// FluidGlass (research/ostad/style/fluid/README.md): a glass object rendered in one WebGL fragment shader, with liquid dye inside.
// Motion = curl-noise dye advection (Bridson 2007) over a domain-warped fbm dye (Quilez), evaluated per pixel from the frame
// number alone, so every Remotion frame renders deterministically and in any order. Time runs around a circle in 4D simplex
// noise (x, y, cos t, sin t), so the loop closes with no crossfade and no seam; a periodic phase warp gives the flow variable
// speed (it surges and settles) instead of the constant drift of round 1's sine-path blobs.
// Shapes: "sphere" (the reference glass ball: fresnel rim, inner floor, light pooling at the bottom, see-through interior),
// "bead" (small sphere, no floor), "ring" (elliptical glass band, e.g. the loupe rim) and "arrow" (round glass tube + head).
// bg: true paints the palette background (the sphere loops); false renders premultiplied alpha to sit over DOM (photo layouts).

export type Palette = {
  c0: string; c1: string; c2: string; c3: string; // top -> bottom of the dye ramp (cool top, warm pooled bottom)
  rim: string; bg: string; glow: string; // rim light, background, light pool on the ground behind/below
  tint: string; tintA: number; // what the interior does to what's behind (dark glass darkens, paper glass barely tints)
  sat: number; light: boolean;
};

// "ref": the reference sphere (navy top, violet middle, amber bottom) on near-black. "brand": navy, soft pale blue, muted
// lavender-grey, sand/cream warmth, lower saturation, on brand navy. "paper": pastel version for the ivory post background.
export const PALETTES: Record<string, Palette> = {
  ref: { c0: "#7ab8ee", c1: "#24448f", c2: "#7c63b4", c3: "#f0b45c", rim: "#cfe4ff", bg: "#141519", glow: "#232634", tint: "#05060c", tintA: 0.3, sat: 1, light: false },
  brand: { c0: "#c3d5e6", c1: "#1d2c48", c2: "#8890ab", c3: "#e2c9a0", rim: "#e9f0f7", bg: "#152235", glow: "#1f3049", tint: "#070b14", tintA: 0.28, sat: 0.78, light: false },
  paper: { c0: "#86a9d4", c1: "#a3b6da", c2: "#b39fd0", c3: "#eab66c", rim: "#ffffff", bg: "#f5f2eb", glow: "#efe7d8", tint: "#dfe3ea", tintA: 0.1, sat: 0.9, light: true },
};

export type Shape =
  | { kind: "sphere" | "bead"; cx: number; cy: number; r: number; floor?: boolean }
  | { kind: "ring"; cx: number; cy: number; rx: number; ry: number; w: number; ang?: number }
  | { kind: "arrow"; x1: number; y1: number; x2: number; y2: number; sw: number; hl: number; hw: number };

const VS = `attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}`;

const FS = `precision highp float;
uniform vec2 uRes; uniform float uTime, uLoop, uFrame, uSeed, uFlow, uGrain, uMilk, uBgOn, uLight, uSat, uTintA, uFloor, uScale;
uniform int uShape;
uniform vec2 uC; uniform float uR;
uniform vec2 uAB; uniform float uW, uAng;
uniform vec2 uP1, uP2; uniform float uSW, uHL, uHW;
uniform vec3 uCol0, uCol1, uCol2, uCol3, uRim, uBg, uGlow, uTint;

// 4D simplex noise: Ian McEwan / Stefan Gustavson (Ashima Arts, MIT)
vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
float mod289(float x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
float permute(float x){return mod289(((x*34.)+1.)*x);}
vec4 tis(vec4 r){return 1.79284291400159-.85373472095314*r;}
float tis(float r){return 1.79284291400159-.85373472095314*r;}
vec4 grad4(float j, vec4 ip){
  vec4 p,s; p.xyz=floor(fract(vec3(j)*ip.xyz)*7.)*ip.z-1.; p.w=1.5-dot(abs(p.xyz),vec3(1.));
  s=vec4(lessThan(p,vec4(0.))); p.xyz=p.xyz+(s.xyz*2.-1.)*s.www; return p;}
float sn(vec4 v){
  const vec4 C=vec4(.138196601125011,.276393202250021,.414589803375032,-.447213595499958);
  vec4 i=floor(v+dot(v,vec4(.309016994374947451))); vec4 x0=v-i+dot(i,C.xxxx);
  vec4 i0; vec3 isX=step(x0.yzw,x0.xxx); vec3 isYZ=step(x0.zww,x0.yyz);
  i0.x=isX.x+isX.y+isX.z; i0.yzw=1.-isX; i0.y+=isYZ.x+isYZ.y; i0.zw+=1.-isYZ.xy; i0.z+=isYZ.z; i0.w+=1.-isYZ.z;
  vec4 i3=clamp(i0,0.,1.), i2=clamp(i0-1.,0.,1.), i1=clamp(i0-2.,0.,1.);
  vec4 x1=x0-i1+C.xxxx, x2=x0-i2+C.yyyy, x3=x0-i3+C.zzzz, x4=x0+C.wwww;
  i=mod289(i);
  float j0=permute(permute(permute(permute(i.w)+i.z)+i.y)+i.x);
  vec4 j1=permute(permute(permute(permute(i.w+vec4(i1.w,i2.w,i3.w,1.))+i.z+vec4(i1.z,i2.z,i3.z,1.))+i.y+vec4(i1.y,i2.y,i3.y,1.))+i.x+vec4(i1.x,i2.x,i3.x,1.));
  vec4 ip=vec4(1./294.,1./49.,1./7.,0.);
  vec4 p0=grad4(j0,ip), p1=grad4(j1.x,ip), p2=grad4(j1.y,ip), p3=grad4(j1.z,ip), p4=grad4(j1.w,ip);
  vec4 nr=tis(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3))); p0*=nr.x; p1*=nr.y; p2*=nr.z; p3*=nr.w; p4*=tis(dot(p4,p4));
  vec3 m0=max(.6-vec3(dot(x0,x0),dot(x1,x1),dot(x2,x2)),0.); vec2 m1=max(.6-vec2(dot(x3,x3),dot(x4,x4)),0.);
  m0=m0*m0; m1=m1*m1;
  return 49.*(dot(m0*m0,vec3(dot(p0,x0),dot(p1,x1),dot(p2,x2)))+dot(m1*m1,vec2(dot(p3,x3),dot(p4,x4))));
}

// time on circles: k turns per loop (integers keep it periodic); the phase warp makes the flow surge and settle
vec2 T1, T2, T3;
void times(){
  float ph=6.2831853*uTime/uLoop;
  float w1=ph+.55*sin(ph+uSeed), w2=2.*ph+.4*sin(2.*ph+1.3+uSeed), w3=ph-.5*sin(ph+2.1);
  T1=vec2(cos(w1),sin(w1))*.75*uFlow; T2=vec2(cos(w2),sin(w2))*.55*uFlow; T3=vec2(cos(w3),sin(w3))*.6*uFlow;
}
// stream function: two octaves, the fine one turning twice as fast (eddies inside the big swirl)
float psi(vec2 p){ return sn(vec4(p*.85+uSeed, T1)) + .42*sn(vec4(p*2.1+vec2(7.3,-2.1)+uSeed, T2+vec2(3.1,-1.7))); }
vec2 curl(vec2 p){ const float e=.02; float a=psi(p); return vec2(psi(p+vec2(0.,e))-a, -(psi(p+vec2(e,0.))-a))/e; }
// semi-Lagrangian back-trace of the dye through the divergence-free curl field (what Stam's advection step does, analytically)
vec2 advect(vec2 p, int n){ for(int i=0;i<5;i++){ if(i>=n) break; p-=.075*curl(p); } return p; }
// dye: Quilez domain warp of the advected position -> (ramp offset, filament brightness)
vec2 dye(vec2 p){
  vec2 q=vec2(sn(vec4(p*1.05,T3)), sn(vec4(p*1.05+vec2(5.2,1.3),T3+vec2(1.7,9.2))));
  float r=sn(vec4(p*1.1+1.6*q,T1*.8+vec2(3.1,0.)));
  float f=.5+.5*sn(vec4(p*1.7+1.8*q+vec2(1.9,4.4),T2*.7+vec2(7.,2.)));
  return vec2(r+.45*q.y, f*f*f);
}
vec3 ramp(float t){ t=clamp(t,0.,1.);
  vec3 c=mix(uCol0,uCol1,smoothstep(0.,.3,t)); c=mix(c,uCol2,smoothstep(.3,.66,t)); c=mix(c,uCol3,smoothstep(.62,1.,t));
  float l=dot(c,vec3(.299,.587,.114)); return mix(vec3(l),c,uSat); }
float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
vec4 acc;
void over(vec3 c, float a){ a=clamp(a,0.,1.); acc=vec4(c*a,a)+acc*(1.-a); }
vec3 bgAt(vec2 q){ vec2 d=(q-(uC+vec2(0.,uR*1.15)))/(uR*vec2(1.5,.55)); return mix(uBg,uGlow,exp(-dot(d,d))); }

float sdSeg(vec2 p, vec2 a, vec2 b){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h); }
float sdTri(vec2 p, vec2 p0, vec2 p1, vec2 p2){
  vec2 e0=p1-p0,e1=p2-p1,e2=p0-p2,v0=p-p0,v1=p-p1,v2=p-p2;
  vec2 pq0=v0-e0*clamp(dot(v0,e0)/dot(e0,e0),0.,1.), pq1=v1-e1*clamp(dot(v1,e1)/dot(e1,e1),0.,1.), pq2=v2-e2*clamp(dot(v2,e2)/dot(e2,e2),0.,1.);
  float s=sign(e0.x*e2.y-e0.y*e2.x);
  vec2 d=min(min(vec2(dot(pq0,pq0),s*(v0.x*e0.y-v0.y*e0.x)),vec2(dot(pq1,pq1),s*(v1.x*e1.y-v1.y*e1.x))),vec2(dot(pq2,pq2),s*(v2.x*e2.y-v2.y*e2.x)));
  return -sqrt(d.x)*sign(d.y); }
float sdShape(vec2 f){
  if(uShape==2){ vec2 q=f-uC; float c=cos(uAng), s=sin(uAng); q=vec2(c*q.x+s*q.y,-s*q.x+c*q.y);
    float k=min(uAB.x,uAB.y); return abs((length(q/uAB)-1.)*k)-uW*.5; }
  vec2 dir=normalize(uP2-uP1), n=vec2(-dir.y,dir.x), base=uP2-dir*uHL;
  float sh=sdSeg(f,uP1,base+dir*2.)-uSW*.5;
  float hd=sdTri(f,uP2,base+n*uHW*.5,base-n*uHW*.5);
  float k=6.; float h=clamp(.5+.5*(hd-sh)/k,0.,1.); return mix(hd,sh,h)-k*h*(1.-h) - 1.5;  // smooth union, soft corners
}

void main(){
  vec2 f=vec2(gl_FragCoord.x, uRes.y-gl_FragCoord.y);
  times(); acc=vec4(0.);
  float grain=(hash(f+fract(uFrame*.6180339)*311.)-.5)*uGrain;
  if(uShape<=1){
    // ---------- sphere / bead ----------
    vec2 p=(f-uC)/uR; p.y=-p.y; float d=length(p);
    float aa=1.4/uR, cov=1.-smoothstep(1.-aa,1.,d);
    if(cov>0.){
      float z=sqrt(max(0.,1.-d*d)), fres=pow(1.-z,1.9), bottom=smoothstep(.05,-1.,p.y);
      vec2 fp=p*.8/(.62+.38*z)*uScale;                       // front shell: compressed toward the rim like a lens
      vec2 dy=dye(advect(fp,4));
      vec2 bp=vec2(-p.x,p.y)*.7*uScale+vec2(4.2,1.1);           // back wall, seen through, mirrored
      vec2 db=dye(advect(bp,2));
      // what's behind, refracted: a ball lens flips and shrinks it
      if(uBgOn>.5) over(bgAt(uC-(f-uC)*vec2(.55,.55)), 1.);
      over(uTint, uTintA*(1.-.5*fres));
      over(ramp(.5-.42*p.y+.2*db.x)*(uLight>.5?1.:.5), (.06+.2*db.y)*(1.-fres)*(uLight>.5?.45:1.));
      if(uFloor>.5){
        float yf=-.1, rf=sqrt(1.-yf*yf)*.96, ry=rf*.16;
        vec2 e=vec2(p.x/rf,(p.y-yf)/ry); float el=length(e), inF=1.-smoothstep(.96,1.04,el);
        over(uLight>.5? mix(uBg,ramp(.7),.3)*.96 : uTint*1.4+ramp(.85)*.05, (uLight>.5?.08:.35)*inF);
        float arc=exp(-pow((el-1.)/.035,2.))*smoothstep(yf-.01,yf+.05,p.y);         // the far edge of the floor, seen through the glass
        over(uLight>.5? vec3(1.) : uRim, .22*arc);
        vec2 pl=vec2(p.x*1.7,(p.y-yf+.02)*5.5);
        over(ramp(.92), (uLight>.5?.22:.28)*exp(-dot(pl,pl))*(.8+.4*dy.y));            // light pooling on the floor
      }
      over(ramp(.97+.06*dy.x), (uLight>.5?.55:.75)*bottom*bottom*(.55+.45*fres+.3*dy.y));  // light gathering in the bowl
      float yy=.5-.47*p.y+.16*dy.x;
      over(ramp(yy)*(.8+.6*dy.y), clamp(.03+1.15*fres+.12*dy.y*fres,0.,.97));               // dye at the rim (fresnel)
      over(uRim, .55*pow(fres,3.)*smoothstep(-.3,1.,p.y));                              // cool sky rim on top
      over(vec3(1.), .5*exp(-pow((1.-d)*uR/1.3,2.))*(.45+.55*smoothstep(-.6,.9,p.y))); // hairline edge
      vec2 hl=(p-vec2(-.38,.52))/vec2(.32,.18); over(vec3(1.), .07*exp(-dot(hl,hl)));     // broad soft key highlight
      acc*=cov;
    }
    if(uBgOn>.5){
      vec3 bg=bgAt(f);
      float halo=exp(-max(d-1.,0.)*9.)*(1.-cov);
      if(uLight>.5){ vec2 sh=vec2(p.x*1.,(p.y+1.04)*5.); bg*=1.-.16*exp(-dot(sh,sh))*(1.-cov); }
      bg=mix(bg, ramp(.5-.47*p.y), .1*halo);
      gl_FragColor=vec4(acc.rgb+bg*(1.-acc.a)+grain,1.);
    } else {
      gl_FragColor=vec4(acc.rgb+grain*acc.a,acc.a);
    }
    return;
  }
  // ---------- ring / arrow: SDF tube profile ----------
  float sd=sdShape(f);
  float shs=sdShape(f-vec2(-3.,5.));                                  // contact shadow, light from the upper right
  float shadow=.22*exp(-max(shs,0.)/7.)*(1.-smoothstep(-1.,1.,sd));
  float cov=clamp(.5-sd,0.,1.);
  if(cov>0.){
    float bw=uShape==2? uW*.5 : uSW*.5;
    float s=-sd, t=clamp(s/bw,0.,1.), h=sqrt(1.-(1.-t)*(1.-t));
    vec2 g=vec2(sdShape(f+vec2(1.,0.))-sd, sdShape(f-vec2(0.,1.))-sd); g=normalize(g+1e-5);  // outward, y up
    vec3 n=normalize(vec3(g*(1.-t)*1.6,h+.02));
    float fres=pow(1.-n.z,1.4);
    vec2 p=(f-uC)/uR; p.y=-p.y;
    vec2 dy=dye(advect(p*1.7*uScale+n.xy*.35,4));                     // refraction: the dye is seen through the curved wall
    float yy;
    if(uShape==2) yy=.5-.47*p.y+.35*dy.x;
    else { vec2 ax=uP2-uP1; float u=clamp(dot(f-uP1,ax)/dot(ax,ax),0.,1.); yy=.08+.85*u+.22*dy.x; }
    over(vec3(1.), uMilk*(.55+.45*t));                                 // frost
    over(uTint, uTintA*.6);
    over(ramp(yy)*(.85+.5*dy.y), .5+.45*fres+.1*dy.y);
    over(ramp(.98), .6*max(0.,-n.y)*fres);                             // light pooling on the lower wall
    over(uRim, .8*max(0.,n.y)*pow(fres,1.2));                          // lit upper wall
    over(vec3(1.), .75*exp(-pow((s-1.2)/1.1,2.)));                     // bright edge
    acc*=cov;
  }
  acc=vec4(0.,0.,0.,shadow)*(1.-acc.a)+acc;
  if(uBgOn>.5) gl_FragColor=vec4(acc.rgb+uBg*(1.-acc.a)+grain,1.);
  else gl_FragColor=vec4(acc.rgb+grain*acc.a,acc.a);
}`;

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);

type Props = {
  width: number; height: number; shape: Shape; palette?: Palette | keyof typeof PALETTES;
  bg?: boolean; loopSeconds?: number; seed?: number; flow?: number; milk?: number; grain?: number; scale?: number;
  style?: React.CSSProperties; timeOffset?: number;
};

type GLState = { gl: WebGLRenderingContext; prog: WebGLProgram; loc: (n: string) => WebGLUniformLocation | null };

const init = (cv: HTMLCanvasElement): GLState => {
  const gl = cv.getContext("webgl", { preserveDrawingBuffer: true, premultipliedAlpha: true, antialias: false, alpha: true });
  if (!gl) throw new Error("FluidGlass: WebGL unavailable (render with --gl=angle)");
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error("FluidGlass shader: " + gl.getShaderInfoLog(s));
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("FluidGlass link: " + gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const a = gl.getAttribLocation(prog, "a"); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
  const cache: Record<string, WebGLUniformLocation | null> = {};
  return { gl, prog, loc: (n) => (n in cache ? cache[n] : (cache[n] = gl.getUniformLocation(prog, n))) };
};

export const FluidGlass: React.FC<Props> = ({ width, height, shape, palette = "brand", bg = false, loopSeconds = 8, seed = 0, flow = 1, milk = 0.1, grain = 0.03, scale = 1, style, timeOffset = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null);
  const st = useRef<GLState | null>(null);
  const P = typeof palette === "string" ? PALETTES[palette] : palette;
  useLayoutEffect(() => {
    if (!ref.current) return;
    if (!st.current) st.current = init(ref.current);
    const { gl, loc } = st.current;
    gl.viewport(0, 0, width, height);
    const f1 = (n: string, v: number) => gl.uniform1f(loc(n), v);
    const f2 = (n: string, a: number, b: number) => gl.uniform2f(loc(n), a, b);
    const f3 = (n: string, h: string) => { const [r, g, b] = hex(h); gl.uniform3f(loc(n), r, g, b); };
    f2("uRes", width, height); f1("uTime", frame / fps + timeOffset); f1("uLoop", loopSeconds); f1("uFrame", frame);
    f1("uSeed", seed); f1("uFlow", flow); f1("uGrain", grain); f1("uMilk", milk); f1("uBgOn", bg ? 1 : 0); f1("uScale", scale);
    f1("uLight", P.light ? 1 : 0); f1("uSat", P.sat); f1("uTintA", P.tintA);
    f3("uCol0", P.c0); f3("uCol1", P.c1); f3("uCol2", P.c2); f3("uCol3", P.c3); f3("uRim", P.rim); f3("uBg", P.bg); f3("uGlow", P.glow); f3("uTint", P.tint);
    if (shape.kind === "sphere" || shape.kind === "bead") {
      gl.uniform1i(loc("uShape"), shape.kind === "sphere" ? 0 : 1);
      f2("uC", shape.cx, shape.cy); f1("uR", shape.r); f1("uFloor", shape.kind === "sphere" && shape.floor !== false ? 1 : 0);
    } else if (shape.kind === "ring") {
      gl.uniform1i(loc("uShape"), 2);
      f2("uC", shape.cx, shape.cy); f1("uR", Math.max(shape.rx, shape.ry)); f2("uAB", shape.rx, shape.ry); f1("uW", shape.w); f1("uAng", ((shape.ang ?? 0) * Math.PI) / 180);
    } else if (shape.kind === "arrow") {
      gl.uniform1i(loc("uShape"), 3);
      const L = Math.hypot(shape.x2 - shape.x1, shape.y2 - shape.y1);
      f2("uC", (shape.x1 + shape.x2) / 2, (shape.y1 + shape.y2) / 2); f1("uR", L / 2);
      f2("uP1", shape.x1, shape.y1); f2("uP2", shape.x2, shape.y2); f1("uSW", shape.sw); f1("uHL", shape.hl); f1("uHW", shape.hw);
    }
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.finish();
  });
  return <canvas ref={ref} width={width} height={height} style={{ position: "absolute", left: 0, top: 0, width, height, ...style }} />;
};

// the target object: the reference glass sphere, full frame
export const FluidGlassSphere: React.FC<{ width: number; height: number; palette?: keyof typeof PALETTES; r?: number; cy?: number; seed?: number; loopSeconds?: number }> = ({ width, height, palette = "ref", r, cy, seed = 0, loopSeconds = 8 }) => (
  <FluidGlass width={width} height={height} bg palette={palette} seed={seed} loopSeconds={loopSeconds} grain={0.035}
    shape={{ kind: "sphere", cx: width / 2, cy: cy ?? height * 0.48, r: r ?? width * 0.36 }} />
);
