import { useLayoutEffect, useRef, useState } from "react";
import { staticFile, useCurrentFrame, useDelayRender, useVideoConfig } from "remotion";

// FlowingImage (research/ostad/style/gradients/MOVING.md): the user's own gradient image, used as a texture, with its pixels
// moved through a slow divergence-free curl-noise flow (UV back-trace in a WebGL fragment shader). Nothing is redrawn: every
// output pixel is a sample of the source. Grain is split off (src - gaussian(src)) and re-added at the fixed, un-warped
// position so it never swims; only the soft colour field gaussian(src) is displaced. Time runs on a circle in 4D simplex
// noise, so frame N == frame 0 and the loop has no seam. The noise / loop code is copied from FluidGlass.tsx (unchanged there).
// UVs are mirror-folded inside the crop (no smear, no texture repeat). Optional locks keep sharp features still:
// a rounded-rect mask (flow only inside it, e.g. the frosted tile) and a line (e.g. a thin light streak).

export type FlowPiece = {
  src: string;                                   // file in the public dir
  crop: [number, number, number, number];        // x0,y0,x1,y1 in source px (the piece)
  pad?: number;                                  // >0: outside the image, fold into a margin band this wide (plain ground)
  anchor?: [number, number];                     // where a cover crop sits inside the piece (0..1, default centred)
  inside?: { x0: number; y0: number; x1: number; y1: number; r: number; feather: number }; // flow only in here
  line?: { x1: number; y1: number; x2: number; y2: number; w: number };                    // no flow near this line
};

const VS = `attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}`;

const FS = `precision highp float;
uniform sampler2D uTex; uniform vec2 uTexSize, uRes; uniform vec4 uCrop, uView; // uView: src px of the output's top-left, src px per output px
uniform float uTime, uLoop, uSeed, uAmp, uFreq, uSat, uPad, uSigma, uDebug;
uniform vec4 uIn; uniform vec2 uInRF; uniform float uInOn;
uniform vec4 uLine; uniform float uLineW, uLineOn;

// 4D simplex noise: Ian McEwan / Stefan Gustavson (Ashima Arts, MIT) - as in FluidGlass.tsx
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
// time on circles (FluidGlass): integer turns per loop keep it periodic; the phase warp lets the flow surge and settle
vec2 T1, T2;
void times(){
  float ph=6.2831853*uTime/uLoop;
  float w1=ph+.55*sin(ph+uSeed), w2=2.*ph+.4*sin(2.*ph+1.3+uSeed);
  T1=vec2(cos(w1),sin(w1))*.75; T2=vec2(cos(w2),sin(w2))*.55;
}
float psi(vec2 p){ return sn(vec4(p*.85+uSeed, T1)) + .42*sn(vec4(p*2.1+vec2(7.3,-2.1)+uSeed, T2+vec2(3.1,-1.7))); }
vec2 curl(vec2 p){ const float e=.02; float a=psi(p); return vec2(psi(p+vec2(0.,e))-a, -(psi(p+vec2(e,0.))-a))/e; }

float sdRR(vec2 p, vec4 r, float rad){ vec2 c=(r.xy+r.zw)*.5, h=(r.zw-r.xy)*.5-rad; vec2 q=abs(p-c)-h; return length(max(q,0.))+min(max(q.x,q.y),0.)-rad; }
float sdSeg(vec2 p, vec2 a, vec2 b){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h); }
// how much this source point may move (1 = free flow, 0 = locked)
float freedom(vec2 s){
  float k=1.;
  if(uInOn>.5) k*=1.-smoothstep(-uInRF.y,0.,sdRR(s,uIn,uInRF.x));
  if(uLineOn>.5) k*=smoothstep(uLineW*.5,uLineW*2.5,sdSeg(s,uLine.xy,uLine.zw));
  return k;
}
float fold(float x, float a, float b){ float L=b-a; float t=mod(x-a,2.*L); return a+L-abs(L-t); }
vec2 mirror(vec2 s){ return vec2(fold(s.x,uCrop.x+.5,uCrop.z-.5), fold(s.y,uCrop.y+.5,uCrop.w-.5)); }
// outside the image (pad mode): fold into the plain-ground margin band so the ground and its grain continue
vec2 padFold(vec2 s){
  if(uPad<=0.) return s;
  if(s.x<0.) s.x=fold(s.x,.5,uPad); if(s.x>uTexSize.x) s.x=fold(s.x,uTexSize.x-uPad,uTexSize.x-.5);
  if(s.y<0.) s.y=fold(s.y,.5,uPad); if(s.y>uTexSize.y) s.y=fold(s.y,uTexSize.y-uPad,uTexSize.y-.5);
  return s;
}
vec3 tex(vec2 s){ return texture2D(uTex, s/uTexSize).rgb; }
// gaussian of the source around s (the soft colour field without its grain); taps folded inside the crop
vec3 soft(vec2 s){
  vec3 c=vec3(0.); float w=0.;
  for(int j=-3;j<=3;j++) for(int i=-3;i<=3;i++){
    vec2 o=vec2(float(i),float(j))*uSigma*.75; float g=exp(-dot(o,o)/(2.*uSigma*uSigma));
    c+=g*tex(mirror(padFold(s+o))); w+=g; }
  return c/w;
}

void main(){
  vec2 f=vec2(gl_FragCoord.x, uRes.y-gl_FragCoord.y);
  times();
  vec2 s0=uView.xy+f*uView.zw;                        // fixed source position of this output pixel
  vec2 sp=padFold(s0);
  vec2 s=mirror(sp);
  float cw=uCrop.z-uCrop.x;
  // back-trace through the curl field (3 sub-steps): where did the colour now at s come from
  vec2 p=(s-(uCrop.xy+uCrop.zw)*.5)/cw*uFreq;
  float fr=freedom(s);
  float stepk=uAmp*uFreq/2.6/3.;                     // curl of psi ~2.6 rms -> total move ~ uAmp * crop width
  for(int i=0;i<3;i++) p-=stepk*fr*curl(p);
  vec2 sw=(p/uFreq)*cw+(uCrop.xy+uCrop.zw)*.5;
  if(uDebug>.5){ vec2 d=(sw-s)/cw; gl_FragColor=vec4(.5+d*5.,0.,1.); return; }
  vec3 grain=tex(s)-soft(s);                          // static grain / fine detail, stays put
  vec3 c=soft(mirror(sw))+grain;
  float l=dot(c,vec3(.299,.587,.114));
  gl_FragColor=vec4(clamp(mix(vec3(l),c,uSat),0.,1.),1.);
}`;

type GLState = { gl: WebGLRenderingContext; loc: (n: string) => WebGLUniformLocation | null };

const init = (cv: HTMLCanvasElement, img: HTMLImageElement): GLState => {
  const gl = cv.getContext("webgl", { preserveDrawingBuffer: true, antialias: false, alpha: false });
  if (!gl) throw new Error("FlowingImage: WebGL unavailable (render with --gl=angle)");
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error("FlowingImage shader: " + gl.getShaderInfoLog(s));
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("FlowingImage link: " + gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const a = gl.getAttribLocation(prog, "a"); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const cache: Record<string, WebGLUniformLocation | null> = {};
  return { gl, loc: (n) => (n in cache ? cache[n] : (cache[n] = gl.getUniformLocation(prog, n))) };
};

export type FlowProps = {
  piece: FlowPiece; width: number; height: number;
  fit?: "cover" | "contain";   // contain: whole crop visible, the rest filled by pad folding (needs piece.pad)
  view?: [number, number, number, number]; // override the fitted region (src px x0,y0,x1,y1); scaled uniformly to cover the output
  loopSeconds?: number; amp?: number; freq?: number; sat?: number; seed?: number; sigma?: number; debug?: boolean;
  style?: React.CSSProperties;
};

export const FlowingImage: React.FC<FlowProps> = ({ piece, width, height, fit = "cover", view, loopSeconds = 12, amp = 0.018, freq = 1.15, sat = 1, seed = 0, sigma = 1.6, debug = false, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const ref = useRef<HTMLCanvasElement>(null);
  const st = useRef<GLState | null>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [handle] = useState(() => delayRender("FlowingImage texture"));
  useLayoutEffect(() => {
    const im = new Image();
    im.onload = () => setImg(im);
    im.onerror = () => cancelRender(new Error("FlowingImage: cannot load " + piece.src));
    im.src = staticFile(piece.src);
  }, [piece.src, cancelRender]);
  useLayoutEffect(() => {
    if (!img || !ref.current) return;
    if (!st.current) st.current = init(ref.current, img);
    const { gl, loc } = st.current;
    const [x0, y0, x1, y1] = view ?? piece.crop;
    const vw = x1 - x0, vh = y1 - y0;
    const k = fit === "cover" ? Math.min(vw / width, vh / height) : Math.max(vw / width, vh / height); // src px per output px
    const [axr, ayr] = piece.anchor ?? [0.5, 0.5];
    const ox = x0 + (vw - width * k) * axr, oy = y0 + (vh - height * k) * ayr;
    gl.viewport(0, 0, width, height);
    const f1 = (n: string, v: number) => gl.uniform1f(loc(n), v);
    const f2 = (n: string, a: number, b: number) => gl.uniform2f(loc(n), a, b);
    const f4 = (n: string, a: number, b: number, c: number, d: number) => gl.uniform4f(loc(n), a, b, c, d);
    gl.uniform1i(loc("uTex"), 0);
    f2("uTexSize", img.naturalWidth, img.naturalHeight); f2("uRes", width, height);
    const c = piece.crop;
    f4("uCrop", c[0], c[1], c[2], c[3]); f4("uView", ox, oy, k, k);
    f1("uTime", frame / fps); f1("uLoop", loopSeconds); f1("uSeed", seed); f1("uAmp", amp); f1("uFreq", freq); f1("uSat", sat);
    f1("uPad", piece.pad ?? 0); f1("uSigma", sigma); f1("uDebug", debug ? 1 : 0);
    const I = piece.inside; f1("uInOn", I ? 1 : 0);
    if (I) { f4("uIn", I.x0, I.y0, I.x1, I.y1); f2("uInRF", I.r, I.feather); }
    const L = piece.line; f1("uLineOn", L ? 1 : 0);
    if (L) { f4("uLine", L.x1, L.y1, L.x2, L.y2); f1("uLineW", L.w); }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.finish();
    continueRender(handle);
  });
  return <canvas ref={ref} width={width} height={height} style={{ position: "absolute", left: 0, top: 0, width, height, ...style }} />;
};
