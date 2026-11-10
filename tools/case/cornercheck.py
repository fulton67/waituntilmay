import cv2, json, numpy as np, sys
R='../../'; O='../../../case-check/textures/'
c=json.load(open('corners.json'))
for k in sys.argv[1:]:
    im=cv2.imread(R+c[k]['src'], cv2.IMREAD_UNCHANGED); bgr=im[...,:3].copy()
    if im.shape[2]==4: bgr=(bgr*(im[...,3:4]/255.0)+90*(1-im[...,3:4]/255.0)).astype(np.uint8)
    bgr=cv2.copyMakeBorder(bgr,80,80,80,80,cv2.BORDER_CONSTANT,value=(90,90,90))
    tiles=[]
    for (x,y) in c[k]['quad']:
        X,Y=x+80,y+80; t=cv2.resize(bgr[Y-70:Y+70,X-70:X+70],(560,560),interpolation=cv2.INTER_CUBIC)
        t=np.clip(t.astype(np.float32)*1.8+20,0,255).astype(np.uint8)
        for g in range(-60,61,20):
            p=(g+70)*4; cv2.line(t,(p,0),(p,560),(0,255,255) if g else (0,255,0),1); cv2.line(t,(0,p),(560,p),(0,255,255) if g else (0,255,0),1)
            cv2.putText(t,str(x+g),(p+2,12),0,0.4,(255,255,255),1); cv2.putText(t,str(y+g),(2,p-2),0,0.4,(255,255,255),1)
        tiles.append(t)
    cv2.imwrite(O+f'corners_{k}.png',np.vstack([np.hstack(tiles[:2]),np.hstack([tiles[3],tiles[2]])]))
