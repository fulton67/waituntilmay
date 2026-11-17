import json,glob,os,sys,collections
import numpy as np
out={}
for grp in ['evident_yt','evident','arena','grove','drjc','colin','ro']:
    agg=collections.defaultdict(list)
    for p in glob.glob(f'{grp}/*/graphic_elements.json'):
        d=os.path.dirname(p)
        try: pr=json.load(open(f'{d}/probe.json'))
        except Exception: continue
        W,H=pr['width'],pr['height']; fps=pr.get('fps') or 24; n=pr.get('frame_count') or len(json.load(open(p))['rows'])
        g=json.load(open(p)); els={e['id']:e for e in g['elements']}
        tr={e['id']:{t['frame']:t['bbox'] for t in e['track']} for e in g['elements']}
        fills=[];zones=collections.Counter();big=0
        for f,ids in enumerate(g['rows']):
            m=np.zeros((36,64) if W>H else (64,36),bool); hh,ww=m.shape
            for i in ids:
                if els[i]['kind']!='image_card': continue
                b=tr[i].get(f)
                if not b: continue
                x0,y0,x1,y1=b; m[int(y0/H*hh):int(np.ceil(y1/H*hh)),int(x0/W*ww):int(np.ceil(x1/W*ww))]=True
                cx=(x0+x1)/2/W; cy=(y0+y1)/2/H
                zones[('L' if cx<.4 else 'R' if cx>.6 else 'C')+('T' if cy<.4 else 'B' if cy>.6 else 'M')]+=1
            fills.append(m.mean())
        fills=np.array(fills)
        if not len(fills): continue
        dur=len(fills)/fps
        # takeover entries: rising edges of fill>=0.5 lasting >=6 frames
        tk=fills>=0.5; ent=0;run=0
        for i,v in enumerate(tk):
            run=run+1 if v else 0
            if run==6: ent+=1
        agg['fill_mean'].append(fills.mean()); agg['fill_when_on'].append(fills[fills>0].mean() if (fills>0).any() else 0)
        agg['img_on_share'].append((fills>0).mean()); agg['takeover_share'].append(tk.mean()); agg['takeovers_per_min'].append(ent/dur*60)
        agg['zones_used'].append(sum(1 for z,c in zones.items() if c>=fps)); agg['aspect'].append('L' if W>H else 'P')
    if agg['fill_mean']:
        out[grp]={'n':len(agg['fill_mean']),'landscape':agg['aspect'].count('L'),**{k:round(float(np.median(v)),3) for k,v in agg.items() if k!='aspect'}}
print(json.dumps(out,indent=1))
json.dump(out,open(sys.argv[1],'w'),indent=1)
