"use client";
import { useRef, useState, useCallback, useEffect } from "react";

// ─── GLSL ────────────────────────────────────────────────────────────────────

const VERT = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main(){
  v_uv = a_pos*0.5+0.5;
  gl_Position = vec4(a_pos,0.0,1.0);
}`;

const FRAG_PASS = `
precision mediump float;
uniform sampler2D u_tex;
varying vec2 v_uv;
void main(){ gl_FragColor = texture2D(u_tex,v_uv); }`;

const FRAG_DATAMOSH = `
precision mediump float;
uniform sampler2D u_current;
uniform sampler2D u_ghost;
uniform float u_threshold;
uniform float u_blend;
uniform float u_drift;
varying vec2 v_uv;
void main(){
  vec4 cur = texture2D(u_current, v_uv);
  vec4 gh  = texture2D(u_ghost, clamp(v_uv+u_drift, 0.0, 1.0));
  float m = (abs(cur.r-gh.r)+abs(cur.g-gh.g)+abs(cur.b-gh.b))/3.0;
  gl_FragColor = m>u_threshold ? mix(cur,gh,u_blend) : cur;
}`;

const FRAG_BLOCKS = `
precision mediump float;
uniform sampler2D u_current;
uniform sampler2D u_ghost;
uniform float u_threshold;
uniform vec2 u_bUV;
varying vec2 v_uv;
void main(){
  vec2 bc = floor(v_uv/u_bUV)*u_bUV + u_bUV*0.5;
  vec4 c = texture2D(u_current,bc);
  vec4 g = texture2D(u_ghost,bc);
  float m = (abs(c.r-g.r)+abs(c.g-g.g)+abs(c.b-g.b))/3.0;
  gl_FragColor = m>u_threshold ? texture2D(u_ghost,v_uv) : texture2D(u_current,v_uv);
}`;

const FRAG_SINE = `
precision mediump float;
uniform sampler2D u_tex;
uniform float u_time;
uniform float u_str;
uniform float u_freq;
varying vec2 v_uv;
void main(){
  vec2 uv = v_uv;
  uv.x += sin(uv.y*u_freq + u_time)*u_str;
  uv.y += cos(uv.x*u_freq*0.7 + u_time*1.3)*u_str*0.6;
  gl_FragColor = texture2D(u_tex, uv);
}`;

const FRAG_RGB = `
precision mediump float;
uniform sampler2D u_tex;
uniform float u_int;
varying vec2 v_uv;
void main(){
  vec2 c = vec2(0.5);
  vec2 d = v_uv-c;
  float r = length(d);
  vec2 dir = d/max(r,0.001);
  float r2 = r*r;
  vec2 rUV = clamp(c+dir*(r-u_int*1.5*r2),0.0,1.0);
  vec2 gUV = clamp(c+dir*(r+u_int*0.3*r2),0.0,1.0);
  vec2 bUV = clamp(c+dir*(r+u_int*2.0*r2),0.0,1.0);
  gl_FragColor = vec4(
    texture2D(u_tex,rUV).r,
    texture2D(u_tex,gUV).g,
    texture2D(u_tex,bUV).b,
    1.0);
}`;

const FRAG_VHS = `
precision mediump float;
uniform sampler2D u_tex;
uniform float u_time;
uniform float u_int;
uniform float u_h;
varying vec2 v_uv;
float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){
  vec2 uv=v_uv;
  vec2 b=uv*2.0-1.0;
  b*=1.0+0.08*u_int*dot(b,b);
  uv=b*0.5+0.5;
  if(uv.x<0.0||uv.x>1.0||uv.y<0.0||uv.y>1.0){gl_FragColor=vec4(0,0,0,1);return;}
  float px=1.0/1280.0;
  float rS=(8.0+4.0*sin(uv.y*30.0+u_time))*px*u_int;
  float bS=(-8.0+4.0*cos(uv.y*30.0+u_time+1.57))*px*u_int;
  float gS=(-4.0+2.0*sin(uv.y*30.0+u_time+3.14))*px*u_int;
  float red  =texture2D(u_tex,clamp(uv+vec2(rS,0),0.0,1.0)).r;
  float grn  =texture2D(u_tex,clamp(uv+vec2(gS,0),0.0,1.0)).g;
  float blu  =texture2D(u_tex,clamp(uv+vec2(bS,0),0.0,1.0)).b;
  float row  =floor(uv.y*u_h);
  bool scan  =mod(row,3.0)<1.0;
  float sc   =scan?0.2:1.0;
  float noise=(hash(uv+floor(u_time))-0.5)*0.04*u_int;
  gl_FragColor=vec4(
    clamp(red*sc+noise,0.0,1.0),
    clamp(grn*sc+noise,0.0,1.0),
    clamp(blu*sc*(scan?1.5:1.0)+noise,0.0,1.0),
    1.0);
}`;

const HSV=`
vec3 rgb2hsv(vec3 c){
  vec4 K=vec4(0.0,-1.0/3.0,2.0/3.0,-1.0);
  vec4 p=mix(vec4(c.bg,K.wz),vec4(c.gb,K.xy),step(c.b,c.g));
  vec4 q=mix(vec4(p.xyw,c.r),vec4(c.r,p.yzx),step(p.x,c.r));
  float d=q.x-min(q.w,q.y);
  return vec3(abs(q.z+(q.w-q.y)/(6.0*d+1e-10)),d/(q.x+1e-10),q.x);
}
vec3 hsv2rgb(vec3 c){
  vec4 K=vec4(1.0,2.0/3.0,1.0/3.0,3.0);
  vec3 p=abs(fract(c.xxx+K.xyz)*6.0-K.www);
  return c.z*mix(K.xxx,clamp(p-K.xxx,0.0,1.0),c.y);
}`;

const FRAG_HUE = `
precision mediump float;
uniform sampler2D u_tex;
uniform float u_shift;
uniform float u_time;
uniform float u_anim;
varying vec2 v_uv;
${HSV}
void main(){
  vec4 col=texture2D(u_tex,v_uv);
  vec3 hsv=rgb2hsv(col.rgb);
  float s=u_anim>0.5 ? sin(u_time*0.5)*0.083 : u_shift;
  hsv.x=fract(hsv.x+s);
  gl_FragColor=vec4(hsv2rgb(hsv),col.a);
}`;

const FRAG_KALEIDO = `
precision mediump float;
uniform sampler2D u_tex;
uniform float u_segs;
varying vec2 v_uv;
void main(){
  vec2 uv=v_uv-0.5;
  float angle=atan(uv.y,uv.x);
  float r=length(uv);
  float slice=6.28318/u_segs;
  float m=mod(angle,slice);
  if(m>slice*0.5) m=slice-m;
  gl_FragColor=texture2D(u_tex,clamp(vec2(cos(m),sin(m))*r+0.5,0.0,1.0));
}`;

const FRAG_BLOOM = `
precision mediump float;
uniform sampler2D u_tex;
uniform float u_int;
uniform vec2 u_px;
varying vec2 v_uv;
void main(){
  vec4 col=texture2D(u_tex,v_uv);
  vec4 blur=vec4(0.0);
  float n=0.0;
  for(int x=-2;x<=2;x++){
    for(int y=-2;y<=2;y++){
      blur+=texture2D(u_tex,v_uv+vec2(float(x),float(y))*u_px*12.0);
      n+=1.0;
    }
  }
  blur/=n;
  gl_FragColor=vec4(mix(col,blur,u_int*0.4).rgb+blur.rgb*u_int*0.2,1.0);
}`;

const FRAG_BURN = `
precision mediump float;
uniform sampler2D u_tex;
uniform float u_time;
uniform float u_int;
varying vec2 v_uv;
void main(){
  vec4 col=texture2D(u_tex,v_uv);
  float s=sin(u_time); float c=cos(u_time);
  col.r=clamp(col.r*(1.0+u_int*0.3*s),0.0,1.0);
  col.g=clamp(col.g*(1.0+u_int*0.3*c),0.0,1.0);
  col.b=clamp(col.b*(1.0-u_int*0.3*s),0.0,1.0);
  gl_FragColor=col;
}`;

const FRAG_FEEDBACK = `
precision mediump float;
uniform sampler2D u_current;
uniform sampler2D u_feedback;
uniform float u_opacity;
uniform float u_scale;
uniform float u_rot;
varying vec2 v_uv;
void main(){
  vec2 c=vec2(0.5);
  vec2 uv=v_uv-c;
  float co=cos(u_rot),si=sin(u_rot);
  uv=vec2(co*uv.x-si*uv.y, si*uv.x+co*uv.y)/u_scale+c;
  vec4 cur=texture2D(u_current,v_uv);
  vec4 fb=(uv.x<0.0||uv.x>1.0||uv.y<0.0||uv.y>1.0)?vec4(0):texture2D(u_feedback,uv);
  gl_FragColor=mix(cur,fb,u_opacity);
}`;

// ─── WebGL helpers ────────────────────────────────────────────────────────────
type FBO = { fb: WebGLFramebuffer; tex: WebGLTexture };

function mkShader(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src); gl.compileShader(s); return s;
}
function mkProg(gl: WebGLRenderingContext, frag: string): WebGLProgram {
  const p = gl.createProgram()!;
  gl.attachShader(p, mkShader(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(p, mkShader(gl, gl.FRAGMENT_SHADER, frag));
  gl.linkProgram(p); return p;
}
function mkFBO(gl: WebGLRenderingContext, w: number, h: number): FBO {
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const fb = gl.createFramebuffer()!;
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindTexture(gl.TEXTURE_2D, null);
  return { fb, tex };
}

// ─── State types ──────────────────────────────────────────────────────────────
interface DatamoshS { enabled:boolean; ifi:number; thr:number; blend:number; drift:number }
interface BlocksS   { enabled:boolean; ifi:number; thr:number; bsize:number }
interface SineS     { enabled:boolean; str:number; freq:number; speed:number }
interface RGBS      { enabled:boolean; int:number }
interface VHSS      { enabled:boolean; int:number }
interface HueS      { enabled:boolean; shift:number; anim:boolean; speed:number }
interface KaleidoS  { enabled:boolean; segs:number }
interface BloomS    { enabled:boolean; int:number }
interface BurnS     { enabled:boolean; int:number; speed:number }
interface FeedbackS { enabled:boolean; opacity:number; scale:number; rot:number }

type GLState = {
  gl:WebGLRenderingContext; buf:WebGLBuffer; videoTex:WebGLTexture;
  ping:FBO; pong:FBO; ghostFBO:FBO; ghost2FBO:FBO; feedbackFBO:FBO;
  progs: Record<string,WebGLProgram>;
  w:number; h:number;
};

interface Preset {
  name:string; tip:string;
  dm?:Partial<DatamoshS>; bl?:Partial<BlocksS>; si?:Partial<SineS>;
  rg?:Partial<RGBS>; vh?:Partial<VHSS>; hu?:Partial<HueS>;
  ka?:Partial<KaleidoS>; bo?:Partial<BloomS>; bu?:Partial<BurnS>;
  fb?:Partial<FeedbackS>;
}

const off = { enabled:false };

const PRESETS:Preset[] = [
  { name:"datamosh", tip:"ghost frame bleed through motion",
    dm:{enabled:true,ifi:60,thr:18,blend:0.92,drift:0} },
  { name:"blocks", tip:"macroblock corruption",
    bl:{enabled:true,ifi:45,thr:20,bsize:32} },
  { name:"vhs", tip:"scan lines + color bleed + barrel",
    vh:{enabled:true,int:1} },
  { name:"prism", tip:"radial chromatic aberration",
    rg:{enabled:true,int:0.5} },
  { name:"wave", tip:"sinusoidal warp from pychedelic",
    si:{enabled:true,str:40,freq:30,speed:2} },
  { name:"hue", tip:"oscillating hue rotation",
    hu:{enabled:true,shift:0.3,anim:true,speed:2} },
  { name:"kaleidoscope", tip:"6-segment polar mirror",
    ka:{enabled:true,segs:6} },
  { name:"glow", tip:"dreamify bloom overlay",
    bo:{enabled:true,int:0.7} },
  { name:"burn", tip:"pychedelic color channel oscillation",
    bu:{enabled:true,int:1,speed:2} },
  { name:"tunnel", tip:"feedback zoom loop",
    fb:{enabled:true,opacity:0.88,scale:1.02,rot:0} },
  { name:"psyche", tip:"pychedelic master: sine + hue + burn",
    si:{enabled:true,str:25,freq:25,speed:2},
    hu:{enabled:true,shift:0,anim:true,speed:2},
    bu:{enabled:true,int:0.8,speed:1.5} },
  { name:"chaos", tip:"everything at once",
    dm:{enabled:true,ifi:50,thr:15,blend:0.90,drift:1},
    bl:{enabled:true,ifi:40,thr:18,bsize:24},
    si:{enabled:true,str:15,freq:20,speed:1.5},
    rg:{enabled:true,int:0.3},
    vh:{enabled:true,int:0.5},
    hu:{enabled:true,shift:0,anim:true,speed:1},
    bo:{enabled:true,int:0.4},
    bu:{enabled:true,int:0.6,speed:2},
    fb:{enabled:true,opacity:0.8,scale:1.01,rot:0} },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function VideoLabPage() {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const videoRef    = useRef<HTMLVideoElement>(null);
  const fileInputRef= useRef<HTMLInputElement>(null);
  const glStateRef  = useRef<GLState|null>(null);
  const rafRef      = useRef<number>(0);
  const recorderRef = useRef<MediaRecorder|null>(null);
  const chunksRef   = useRef<Blob[]>([]);
  const dmFrameRef  = useRef(0);
  const blFrameRef  = useRef(0);
  const timeRef     = useRef(0);

  const [videoUrl, setVideoUrl]   = useState<string|null>(null);
  const [dragging, setDragging]   = useState(false);
  const [playing, setPlaying]     = useState(false);
  const [recording, setRecording] = useState(false);
  const [canRecord, setCanRecord] = useState(false);
  const [noGL, setNoGL]           = useState(false);

  const [dm, setDm] = useState<DatamoshS>({enabled:false,ifi:60,thr:18,blend:0.92,drift:0});
  const [bl, setBl] = useState<BlocksS>({enabled:false,ifi:45,thr:20,bsize:32});
  const [si, setSi] = useState<SineS>({enabled:false,str:40,freq:30,speed:2});
  const [rg, setRg] = useState<RGBS>({enabled:false,int:0.4});
  const [vh, setVh] = useState<VHSS>({enabled:false,int:0.8});
  const [hu, setHu] = useState<HueS>({enabled:false,shift:0.3,anim:true,speed:2});
  const [ka, setKa] = useState<KaleidoS>({enabled:false,segs:6});
  const [bo, setBo] = useState<BloomS>({enabled:false,int:0.5});
  const [bu, setBu] = useState<BurnS>({enabled:false,int:0.8,speed:2});
  const [fb, setFb] = useState<FeedbackS>({enabled:false,opacity:0.88,scale:1.02,rot:0});

  const dmR=useRef(dm); const blR=useRef(bl); const siR=useRef(si); const rgR=useRef(rg);
  const vhR=useRef(vh); const huR=useRef(hu); const kaR=useRef(ka); const boR=useRef(bo);
  const buR=useRef(bu); const fbR=useRef(fb);

  useEffect(()=>{dmR.current=dm;},[dm]);
  useEffect(()=>{blR.current=bl;},[bl]);
  useEffect(()=>{siR.current=si;},[si]);
  useEffect(()=>{rgR.current=rg;},[rg]);
  useEffect(()=>{vhR.current=vh;},[vh]);
  useEffect(()=>{huR.current=hu;},[hu]);
  useEffect(()=>{kaR.current=ka;},[ka]);
  useEffect(()=>{boR.current=bo;},[bo]);
  useEffect(()=>{buR.current=bu;},[bu]);
  useEffect(()=>{fbR.current=fb;},[fb]);

  const stopLoop = useCallback(()=>{
    if(rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current=0;
  },[]);

  const renderFrame = useCallback(()=>{
    const video=videoRef.current;
    const gs=glStateRef.current;
    if(!video||!gs||video.paused||video.ended){setPlaying(false);return;}
    const {gl,buf,videoTex,ping,pong,ghostFBO,ghost2FBO,feedbackFBO,progs,w,h}=gs;

    const D=dmR.current,B=blR.current,SI=siR.current,RG=rgR.current;
    const VH=vhR.current,HU=huR.current,KA=kaR.current;
    const BO=boR.current,BU=buR.current,FB=fbR.current;

    // Upload current video frame to videoTex
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.bindTexture(gl.TEXTURE_2D, videoTex);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,video);
    gl.bindTexture(gl.TEXTURE_2D,null);

    // Helper: uniform setters
    const u1=(prog:WebGLProgram,n:string,v:number)=>gl.uniform1f(gl.getUniformLocation(prog,n),v);
    const u2=(prog:WebGLProgram,n:string,x:number,y:number)=>gl.uniform2f(gl.getUniformLocation(prog,n),x,y);
    const ut=(prog:WebGLProgram,n:string,unit:number,tex:WebGLTexture)=>{
      gl.activeTexture(gl.TEXTURE0+unit);
      gl.bindTexture(gl.TEXTURE_2D,tex);
      gl.uniform1i(gl.getUniformLocation(prog,n),unit);
    };

    // Full-screen quad draw
    const draw=(prog:WebGLProgram,out:FBO|null)=>{
      gl.bindFramebuffer(gl.FRAMEBUFFER, out?out.fb:null);
      gl.viewport(0,0,w,h);
      gl.useProgram(prog);
      const loc=gl.getAttribLocation(prog,"a_pos");
      gl.bindBuffer(gl.ARRAY_BUFFER,buf);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
      gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    };

    // Ping-pong state
    let cur:WebGLTexture=videoTex;
    let pingNext=true;
    const next=():FBO=>{const f=pingNext?ping:pong;pingNext=!pingNext;return f;};

    const pass=(prog:WebGLProgram,setup:()=>void)=>{
      const out=next();
      gl.useProgram(prog);
      setup();
      draw(prog,out);
      cur=out.tex;
    };

    const t=timeRef.current;

    // 1. DATAMOSH
    if(D.enabled){
      pass(progs.datamosh,()=>{
        ut(progs.datamosh,"u_current",0,cur);
        ut(progs.datamosh,"u_ghost",1,ghostFBO.tex);
        u1(progs.datamosh,"u_threshold",D.thr/255);
        u1(progs.datamosh,"u_blend",D.blend);
        u1(progs.datamosh,"u_drift",D.drift/Math.max(w,h));
      });
      dmFrameRef.current++;
      if(dmFrameRef.current%D.ifi===0){
        gl.useProgram(progs.pass); ut(progs.pass,"u_tex",0,cur); draw(progs.pass,ghostFBO);
      }
    }

    // 2. BLOCKS
    if(B.enabled){
      pass(progs.blocks,()=>{
        ut(progs.blocks,"u_current",0,cur);
        ut(progs.blocks,"u_ghost",1,ghost2FBO.tex);
        u1(progs.blocks,"u_threshold",B.thr/255);
        u2(progs.blocks,"u_bUV",B.bsize/w,B.bsize/h);
      });
      blFrameRef.current++;
      if(blFrameRef.current%B.ifi===0){
        gl.useProgram(progs.pass); ut(progs.pass,"u_tex",0,cur); draw(progs.pass,ghost2FBO);
      }
    }

    // 3. SINE DISTORTION (pychedelic wave_x/wave_y)
    if(SI.enabled){
      pass(progs.sine,()=>{
        ut(progs.sine,"u_tex",0,cur);
        u1(progs.sine,"u_time",t*SI.speed*0.05);
        u1(progs.sine,"u_str",SI.str*0.001);
        u1(progs.sine,"u_freq",SI.freq);
      });
    }

    // 4. RADIAL RGB SPLIT (pychedelic chromatic aberration)
    if(RG.enabled){
      pass(progs.rgb,()=>{
        ut(progs.rgb,"u_tex",0,cur);
        u1(progs.rgb,"u_int",RG.int*0.5);
      });
    }

    // 5. VHS (scan lines + color bleed + barrel + noise)
    if(VH.enabled){
      pass(progs.vhs,()=>{
        ut(progs.vhs,"u_tex",0,cur);
        u1(progs.vhs,"u_time",t*0.1);
        u1(progs.vhs,"u_int",VH.int);
        u1(progs.vhs,"u_h",h);
      });
    }

    // 6. HUE SHIFT (pychedelic sin-oscillated HSV)
    if(HU.enabled){
      pass(progs.hue,()=>{
        ut(progs.hue,"u_tex",0,cur);
        u1(progs.hue,"u_shift",HU.shift);
        u1(progs.hue,"u_time",t*HU.speed*0.05);
        u1(progs.hue,"u_anim",HU.anim?1:0);
      });
    }

    // 7. KALEIDOSCOPE (pychedelic polar symmetry)
    if(KA.enabled){
      pass(progs.kaleido,()=>{
        ut(progs.kaleido,"u_tex",0,cur);
        u1(progs.kaleido,"u_segs",KA.segs);
      });
    }

    // 8. BLOOM / DREAMIFY (pychedelic emo bloom)
    if(BO.enabled){
      pass(progs.bloom,()=>{
        ut(progs.bloom,"u_tex",0,cur);
        u1(progs.bloom,"u_int",BO.int);
        u2(progs.bloom,"u_px",1/w,1/h);
      });
    }

    // 9. BURNIFY (pychedelic time channel oscillation)
    if(BU.enabled){
      pass(progs.burn,()=>{
        ut(progs.burn,"u_tex",0,cur);
        u1(progs.burn,"u_time",t*BU.speed*0.05);
        u1(progs.burn,"u_int",BU.int);
      });
    }

    // 10. FEEDBACK (to intermediate FBO, then blit to canvas + copy to feedbackFBO)
    if(FB.enabled){
      pass(progs.feedback,()=>{
        ut(progs.feedback,"u_current",0,cur);
        ut(progs.feedback,"u_feedback",1,feedbackFBO.tex);
        u1(progs.feedback,"u_opacity",FB.opacity);
        u1(progs.feedback,"u_scale",FB.scale);
        u1(progs.feedback,"u_rot",FB.rot*Math.PI/180);
      });
    }

    // Blit final to canvas
    gl.useProgram(progs.pass);
    ut(progs.pass,"u_tex",0,cur);
    draw(progs.pass,null);

    // Copy final to feedbackFBO for next frame
    gl.useProgram(progs.pass);
    ut(progs.pass,"u_tex",0,cur);
    draw(progs.pass,feedbackFBO);

    timeRef.current++;
    rafRef.current=requestAnimationFrame(renderFrame);
  },[]);

  const initGL = useCallback(()=>{
    const canvas=canvasRef.current;
    const video=videoRef.current;
    if(!canvas||!video) return;
    const vw=video.videoWidth, vh2=video.videoHeight;
    if(!vw||!vh2) return;

    const scale=Math.min(1,1280/vw);
    const w=Math.round(vw*scale), h=Math.round(vh2*scale);
    canvas.width=w; canvas.height=h;

    const existing=glStateRef.current?.gl;
    if(existing){ /* reuse context */ }

    const gl=(canvas.getContext("webgl",{preserveDrawingBuffer:true,antialias:false}) as WebGLRenderingContext|null);
    if(!gl){setNoGL(true);return;}

    const buf=gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER,buf);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);

    const videoTex=gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D,videoTex);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,255]));
    gl.bindTexture(gl.TEXTURE_2D,null);

    const progs={
      pass:     mkProg(gl,FRAG_PASS),
      datamosh: mkProg(gl,FRAG_DATAMOSH),
      blocks:   mkProg(gl,FRAG_BLOCKS),
      sine:     mkProg(gl,FRAG_SINE),
      rgb:      mkProg(gl,FRAG_RGB),
      vhs:      mkProg(gl,FRAG_VHS),
      hue:      mkProg(gl,FRAG_HUE),
      kaleido:  mkProg(gl,FRAG_KALEIDO),
      bloom:    mkProg(gl,FRAG_BLOOM),
      burn:     mkProg(gl,FRAG_BURN),
      feedback: mkProg(gl,FRAG_FEEDBACK),
    };

    glStateRef.current={
      gl,buf,videoTex,
      ping:mkFBO(gl,w,h), pong:mkFBO(gl,w,h),
      ghostFBO:mkFBO(gl,w,h), ghost2FBO:mkFBO(gl,w,h), feedbackFBO:mkFBO(gl,w,h),
      progs, w, h,
    };
    dmFrameRef.current=0; blFrameRef.current=0; timeRef.current=0;
  },[]);

  const startPlayback=useCallback(()=>{
    const video=videoRef.current;
    if(!video) return;
    initGL();
    video.currentTime=0;
    video.play();
    setPlaying(true);
    stopLoop();
    rafRef.current=requestAnimationFrame(renderFrame);
  },[initGL,renderFrame,stopLoop]);

  const stopPlayback=useCallback(()=>{
    videoRef.current?.pause();
    stopLoop(); setPlaying(false);
  },[stopLoop]);

  useEffect(()=>{
    const video=videoRef.current;
    if(!video) return;
    const onEnded=()=>{
      stopLoop(); setPlaying(false);
      if(recorderRef.current?.state==="recording") recorderRef.current.stop();
    };
    video.addEventListener("ended",onEnded);
    return ()=>video.removeEventListener("ended",onEnded);
  },[stopLoop]);

  useEffect(()=>{
    setCanRecord(typeof MediaRecorder!=="undefined"&&MediaRecorder.isTypeSupported("video/webm"));
  },[]);

  const startRecording=useCallback(()=>{
    const canvas=canvasRef.current;
    if(!canvas||!canRecord) return;
    chunksRef.current=[];
    const recorder=new MediaRecorder(canvas.captureStream(30),{mimeType:"video/webm"});
    recorderRef.current=recorder;
    recorder.ondataavailable=e=>{if(e.data.size>0) chunksRef.current.push(e.data);};
    recorder.onstop=()=>{
      setRecording(false);
      const blob=new Blob(chunksRef.current,{type:"video/webm"});
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a");
      a.href=url; a.download="lab-export.webm"; a.click();
      URL.revokeObjectURL(url);
    };
    recorder.start(); setRecording(true); startPlayback();
  },[canRecord,startPlayback]);

  const stopRecording=useCallback(()=>{
    recorderRef.current?.stop(); stopPlayback();
  },[stopPlayback]);

  const loadFile=(file:File)=>{
    if(!file.type.startsWith("video/")) return;
    stopPlayback();
    if(videoUrl) URL.revokeObjectURL(videoUrl);
    glStateRef.current=null;
    setVideoUrl(URL.createObjectURL(file));
    setPlaying(false); setRecording(false);
  };

  const applyPreset=(p:Preset)=>{
    const merge=<T,>(set:(fn:(prev:T)=>T)=>void,patch?:Partial<T>)=>{
      if(patch!==undefined) set(prev=>({...prev,...patch}));
      else set(prev=>({...prev,enabled:false}));
    };
    // Disable all first, then apply patch
    setDm(p=>({...p,enabled:false}));
    setBl(p=>({...p,enabled:false}));
    setSi(p=>({...p,enabled:false}));
    setRg(p=>({...p,enabled:false}));
    setVh(p=>({...p,enabled:false}));
    setHu(p=>({...p,enabled:false}));
    setKa(p=>({...p,enabled:false}));
    setBo(p=>({...p,enabled:false}));
    setBu(p=>({...p,enabled:false}));
    setFb(p=>({...p,enabled:false}));
    if(p.dm) merge(setDm,p.dm);
    if(p.bl) merge(setBl,p.bl);
    if(p.si) merge(setSi,p.si);
    if(p.rg) merge(setRg,p.rg);
    if(p.vh) merge(setVh,p.vh);
    if(p.hu) merge(setHu,p.hu);
    if(p.ka) merge(setKa,p.ka);
    if(p.bo) merge(setBo,p.bo);
    if(p.bu) merge(setBu,p.bu);
    if(p.fb) merge(setFb,p.fb);
  };

  // ─── UI helpers ──────────────────────────────────────────────────────────────
  const micro=(t:string)=>(
    <span style={{fontSize:10,opacity:0.35,letterSpacing:"0.08em",textTransform:"uppercase"}}>{t}</span>
  );

  const Slider=({label,value,min,max,step=1,onChange,display}:{
    label:string;value:number;min:number;max:number;step?:number;
    onChange:(v:number)=>void;display?:string;
  })=>(
    <div style={{marginBottom:10}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
        <span style={{fontSize:11,opacity:0.55}}>{label}</span>
        <span style={{fontSize:11,fontFamily:"Courier New",opacity:0.7}}>{display??value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e=>onChange(Number(e.target.value))}
        style={{width:"100%",accentColor:"#000"}}/>
    </div>
  );

  const Toggle=({label,value,onChange}:{label:string;value:boolean;onChange:(v:boolean)=>void})=>(
    <button onClick={()=>onChange(!value)} style={{
      border:`1px solid ${value?"#000":"#d0d0d0"}`,
      background:value?"#000":"transparent",color:value?"#fff":"#aaa",
      padding:"3px 10px",fontSize:10,cursor:"pointer",letterSpacing:"0.07em",
    }}>{label}</button>
  );

  const Section=({title,enabled,onToggle,children}:{
    title:string;enabled:boolean;onToggle:(v:boolean)=>void;children:React.ReactNode;
  })=>(
    <div style={{border:`1px solid ${enabled?"#000":"#e8e8e8"}`,marginBottom:10}}>
      <div style={{
        display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"8px 12px",background:enabled?"#000":"transparent",cursor:"pointer",
      }} onClick={()=>onToggle(!enabled)}>
        <span style={{fontSize:11,letterSpacing:"0.08em",textTransform:"uppercase",color:enabled?"#fff":"#999"}}>
          {title}
        </span>
        <span style={{fontSize:10,color:enabled?"#fff":"#bbb"}}>{enabled?"on":"off"}</span>
      </div>
      {enabled&&<div style={{padding:"12px 12px 4px"}}>{children}</div>}
    </div>
  );

  const div=<div style={{borderTop:"1px solid #ebebeb",margin:"20px 0"}}/>;

  return (
    <div style={{padding:"clamp(24px,5vw,64px) clamp(20px,5vw,32px)",maxWidth:"960px",margin:"0 auto",fontFamily:"'Courier New',monospace"}}>

      {videoUrl&&(
        <video ref={videoRef} src={videoUrl} muted playsInline style={{display:"none"}}
          onLoadedMetadata={initGL}/>
      )}

      <div style={{marginBottom:20}}>
        <a href="/" style={{fontSize:12,opacity:0.45}}>← back</a>
      </div>

      <h1 style={{fontSize:13,marginBottom:6,letterSpacing:"0.08em"}}>video lab</h1>
      <p style={{fontSize:11,opacity:0.35,marginBottom:24}}>
        gpu-accelerated · datamosh · blocks · sine warp · radial rgb · vhs · hue · kaleidoscope · bloom · burn · feedback
      </p>

      {noGL&&(
        <div style={{fontSize:12,opacity:0.5,marginBottom:16}}>
          WebGL not available in this browser — try Chrome or Firefox
        </div>
      )}

      {/* Drop zone */}
      <div
        onClick={()=>fileInputRef.current?.click()}
        onDrop={e=>{e.preventDefault();setDragging(false);const f=e.dataTransfer.files[0];if(f)loadFile(f);}}
        onDragOver={e=>{e.preventDefault();setDragging(true);}}
        onDragLeave={()=>setDragging(false)}
        style={{border:`1px solid ${dragging?"#000":"#ccc"}`,padding:"28px",textAlign:"center",
          cursor:"pointer",fontSize:12,marginBottom:24,userSelect:"none"}}>
        {videoUrl?"click or drop to replace video":"click or drop a video file"}
      </div>
      <input ref={fileInputRef} type="file" accept="video/*"
        onChange={e=>{const f=e.target.files?.[0];if(f)loadFile(f);}}
        style={{display:"none"}}/>

      {videoUrl&&(
        <>
          {/* Presets */}
          <div style={{marginBottom:24}}>
            {micro("presets")}
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:8}}>
              {PRESETS.map(p=>(
                <button key={p.name} onClick={()=>applyPreset(p)} title={p.tip}
                  style={{border:"1px solid #d0d0d0",background:"transparent",
                    padding:"4px 10px",fontSize:11,cursor:"pointer",letterSpacing:"0.06em"}}>
                  {p.name}
                </button>
              ))}
            </div>
            <div style={{fontSize:10,opacity:0.3,marginTop:6}}>hover for description</div>
          </div>

          {div}

          {/* Effects */}
          <Section title="datamosh" enabled={dm.enabled} onToggle={v=>setDm(p=>({...p,enabled:v}))}>
            <Slider label="i-frame interval" value={dm.ifi} min={4} max={240} display={`${dm.ifi}f`}
              onChange={v=>setDm(p=>({...p,ifi:v}))}/>
            <Slider label="motion threshold" value={dm.thr} min={1} max={80}
              onChange={v=>setDm(p=>({...p,thr:v}))}/>
            <Slider label="ghost persistence" value={Math.round(dm.blend*100)} min={50} max={99} display={`${Math.round(dm.blend*100)}%`}
              onChange={v=>setDm(p=>({...p,blend:v/100}))}/>
            <Slider label="drift offset" value={dm.drift} min={0} max={20} display={`${dm.drift}px`}
              onChange={v=>setDm(p=>({...p,drift:v}))}/>
          </Section>

          <Section title="block corrupt" enabled={bl.enabled} onToggle={v=>setBl(p=>({...p,enabled:v}))}>
            <Slider label="i-frame interval" value={bl.ifi} min={4} max={240} display={`${bl.ifi}f`}
              onChange={v=>setBl(p=>({...p,ifi:v}))}/>
            <Slider label="motion threshold" value={bl.thr} min={1} max={80}
              onChange={v=>setBl(p=>({...p,thr:v}))}/>
            <Slider label="macroblock size" value={bl.bsize} min={4} max={128} display={`${bl.bsize}px`}
              onChange={v=>setBl(p=>({...p,bsize:v}))}/>
          </Section>

          <Section title="sine warp" enabled={si.enabled} onToggle={v=>setSi(p=>({...p,enabled:v}))}>
            <div style={{fontSize:10,opacity:0.35,marginBottom:10}}>wave_x = sin(y·freq + t)·strength — pychedelic sine distortion</div>
            <Slider label="strength" value={si.str} min={1} max={100}
              onChange={v=>setSi(p=>({...p,str:v}))}/>
            <Slider label="frequency" value={si.freq} min={5} max={80}
              onChange={v=>setSi(p=>({...p,freq:v}))}/>
            <Slider label="speed" value={si.speed} min={0} max={10} step={0.5}
              onChange={v=>setSi(p=>({...p,speed:v}))}/>
          </Section>

          <Section title="radial rgb split" enabled={rg.enabled} onToggle={v=>setRg(p=>({...p,enabled:v}))}>
            <div style={{fontSize:10,opacity:0.35,marginBottom:10}}>pychedelic chromatic aberration — radial channel displacement by r²</div>
            <Slider label="intensity" value={Math.round(rg.int*100)} min={1} max={100} display={`${Math.round(rg.int*100)}%`}
              onChange={v=>setRg(p=>({...p,int:v/100}))}/>
          </Section>

          <Section title="vhs" enabled={vh.enabled} onToggle={v=>setVh(p=>({...p,enabled:v}))}>
            <div style={{fontSize:10,opacity:0.35,marginBottom:10}}>scan lines · sinusoidal color bleed · barrel distortion · noise</div>
            <Slider label="intensity" value={Math.round(vh.int*100)} min={1} max={100} display={`${Math.round(vh.int*100)}%`}
              onChange={v=>setVh(p=>({...p,int:v/100}))}/>
          </Section>

          <Section title="hue shift" enabled={hu.enabled} onToggle={v=>setHu(p=>({...p,enabled:v}))}>
            <div style={{fontSize:10,opacity:0.35,marginBottom:10}}>HSV hue rotation — animate oscillates like pychedelic sin(t·0.5)·30°</div>
            <div style={{display:"flex",gap:6,marginBottom:12}}>
              <Toggle label="animate" value={hu.anim} onChange={v=>setHu(p=>({...p,anim:v}))}/>
            </div>
            {!hu.anim&&<Slider label="shift" value={Math.round(hu.shift*360)} min={0} max={360} display={`${Math.round(hu.shift*360)}°`}
              onChange={v=>setHu(p=>({...p,shift:v/360}))}/>}
            <Slider label="speed" value={hu.speed} min={0} max={10} step={0.5}
              onChange={v=>setHu(p=>({...p,speed:v}))}/>
          </Section>

          <Section title="kaleidoscope" enabled={ka.enabled} onToggle={v=>setKa(p=>({...p,enabled:v}))}>
            <div style={{fontSize:10,opacity:0.35,marginBottom:10}}>polar coordinate symmetry — pychedelic segment_count mirror</div>
            <Slider label="segments" value={ka.segs} min={2} max={16}
              onChange={v=>setKa(p=>({...p,segs:v}))}/>
          </Section>

          <Section title="bloom / dreamify" enabled={bo.enabled} onToggle={v=>setBo(p=>({...p,enabled:v}))}>
            <div style={{fontSize:10,opacity:0.35,marginBottom:10}}>0.6·original + 0.4·blurred + glow overlay — pychedelic emo bloom</div>
            <Slider label="intensity" value={Math.round(bo.int*100)} min={1} max={100} display={`${Math.round(bo.int*100)}%`}
              onChange={v=>setBo(p=>({...p,int:v/100}))}/>
          </Section>

          <Section title="burnify" enabled={bu.enabled} onToggle={v=>setBu(p=>({...p,enabled:v}))}>
            <div style={{fontSize:10,opacity:0.35,marginBottom:10}}>R·(1+0.3·sin(t)) G·(1+0.3·cos(t)) B·(1−0.3·sin(t)) — pychedelic burnify</div>
            <Slider label="intensity" value={Math.round(bu.int*100)} min={1} max={100} display={`${Math.round(bu.int*100)}%`}
              onChange={v=>setBu(p=>({...p,int:v/100}))}/>
            <Slider label="speed" value={bu.speed} min={0} max={10} step={0.5}
              onChange={v=>setBu(p=>({...p,speed:v}))}/>
          </Section>

          <Section title="feedback loop" enabled={fb.enabled} onToggle={v=>setFb(p=>({...p,enabled:v}))}>
            <Slider label="opacity" value={Math.round(fb.opacity*100)} min={10} max={99} display={`${Math.round(fb.opacity*100)}%`}
              onChange={v=>setFb(p=>({...p,opacity:v/100}))}/>
            <Slider label="zoom per frame" value={Math.round((fb.scale-1)*1000)} min={0} max={50}
              display={`+${Math.round((fb.scale-1)*1000)/10}%`}
              onChange={v=>setFb(p=>({...p,scale:1+v/1000}))}/>
            <Slider label="rotation per frame" value={Math.round(fb.rot*10)/10} min={-5} max={5} step={0.1}
              display={`${Math.round(fb.rot*10)/10}°`}
              onChange={v=>setFb(p=>({...p,rot:v}))}/>
          </Section>

          {div}

          {/* Playback */}
          <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
            {!playing?(
              <button onClick={startPlayback}
                style={{border:"1px solid #000",background:"#000",color:"#fff",
                  padding:"6px 16px",fontSize:12,cursor:"pointer",letterSpacing:"0.06em"}}>
                preview
              </button>
            ):(
              <button onClick={stopPlayback}
                style={{border:"1px solid #000",background:"#000",color:"#fff",
                  padding:"6px 16px",fontSize:12,cursor:"pointer",letterSpacing:"0.06em"}}>
                stop
              </button>
            )}
            {canRecord&&(!recording?(
              <button onClick={startRecording}
                style={{border:"1px solid #c00",background:"#c00",color:"#fff",
                  padding:"6px 16px",fontSize:12,cursor:"pointer",letterSpacing:"0.06em"}}>
                record + export
              </button>
            ):(
              <button onClick={stopRecording}
                style={{border:"1px solid #c00",background:"transparent",color:"#c00",
                  padding:"6px 16px",fontSize:12,cursor:"pointer",letterSpacing:"0.06em"}}>
                stop recording
              </button>
            ))}
          </div>

          {recording&&(
            <div style={{fontSize:11,opacity:0.45,marginBottom:12}}>
              recording — plays through once then downloads as .webm
            </div>
          )}

          <canvas ref={canvasRef} style={{display:"block",maxWidth:"100%"}}/>
        </>
      )}
    </div>
  );
}
