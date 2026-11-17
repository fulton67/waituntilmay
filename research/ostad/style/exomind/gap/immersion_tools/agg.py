import json,sys,numpy as np
S=sys.argv[1]; beats=json.load(open(sys.argv[2],encoding='utf-8'))
R=json.load(open(S+'/v6_frames.json'))
segs=[]
cards={c['beat']:c for c in beats['cards'] if c['kind']=='section'}
for b in beats['beats']:
    s,e=b['start_f'],b['end_f']
    if b['id'] in cards:
        c=cards[b['id']]; segs.append(('S'+c['num'][-1]+' '+c['title'],c['start_f'],c['end_f'])); s=c['end_f']+1
    segs.append((b['id'],s,e))
end=[c for c in beats['cards'] if c['kind']=='end'][0]; segs.append(('END',end['start_f'],end['end_f']-1))
segs.sort(key=lambda x:x[1])
THR=float(sys.argv[3]) if len(sys.argv)>3 else 0.5
out=[]
for name,s,e in segs:
    rr=R[s:e+1]; fill=np.array([r['fill'] for r in rr])
    on=fill>0.03
    d=np.array([r['dimg'] if r['dimg'] is not None else np.nan for r in rr])
    imgf=on & ~np.isnan(d)
    mov=(d>THR)&imgf
    out.append(dict(seg=name,s=s,e=e,sec=round((e-s+1)/24,2),fill_mean=round(float(fill.mean())*100,1),fill_max=round(float(fill.max())*100,1),
        img_on_s=round(on.sum()/24,2),img_moving_s=round(mov.sum()/24,2),img_still_s=round((imgf&~mov).sum()/24,2),
        dimg_med=None if not imgf.any() else round(float(np.nanmedian(d[imgf])),2),presenter_off_s=round(sum(not r['presenter'] for r in rr)/24,2)))
for o in out: print(o)
allf=np.array([r['fill'] for r in R]); d=np.array([r['dimg'] if r['dimg'] is not None else np.nan for r in R]); on=allf>0.03; imgf=on&~np.isnan(d)
tot=dict(frames=len(R),fill_mean=round(float(allf.mean())*100,1),fill_when_on=round(float(allf[on].mean())*100,1),img_on_share=round(float(on.mean())*100,1),
  moving_share_of_img=round(float(((d>THR)&imgf).sum()/imgf.sum())*100,1),takeover50_s=round(float((allf>=0.5).sum())/24,2),fill_ge_33_s=round(float((allf>=0.33).sum())/24,2))
print(tot)
json.dump({'thr':THR,'segments':out,'total':tot},open(S+f'/v6_segments.json','w'),indent=1)
