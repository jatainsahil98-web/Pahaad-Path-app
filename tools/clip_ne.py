# Clips Natural Earth 10m lines (public domain) to the PahaadPath map box and simplifies them, for the offline basemap.
import json,sys
W,S,E,N=76.4,28.1,81.3,31.6
def inside(p):return W<=p[0]<=E and S<=p[1]<=N
def dp(pts,eps):
    if len(pts)<3:return pts
    a,b=pts[0],pts[-1];dx,dy=b[0]-a[0],b[1]-a[1];L=(dx*dx+dy*dy)**.5 or 1e-12
    i,dm=0,0
    for k in range(1,len(pts)-1):
        p=pts[k];d=abs(dy*(p[0]-a[0])-dx*(p[1]-a[1]))/L
        if d>dm:i,dm=k,d
    if dm>eps:return dp(pts[:i+1],eps)[:-1]+dp(pts[i:],eps)
    return [a,b]
def lines(g):
    if not g:return []
    if g['type']=='LineString':return [g['coordinates']]
    if g['type']=='MultiLineString':return g['coordinates']
    if g['type']=='Polygon':return g['coordinates']
    if g['type']=='MultiPolygon':return [r for p in g['coordinates'] for r in p]
    return []
def clip(path,filt,eps):
    out=[]
    for f in json.load(open(path))['features']:
        pr=f['properties']
        if filt and not filt(pr):continue
        for ln in lines(f['geometry']):
            cur=[]
            for p in ln:
                if inside(p):cur.append([round(p[0],3),round(p[1],3)])
                else:
                    if len(cur)>1:out.append(dp(cur,eps))
                    cur=[]
            if len(cur)>1:out.append(dp(cur,eps))
    return out
v=sys.argv[1]
res={
 'rivers':clip(v+'/ne_10m_rivers_lake_centerlines.geojson',None,.004),
 'roads':clip(v+'/ne_10m_roads.geojson',lambda p:p.get('sov_a3')=='IND' or p.get('continent')=='Asia',.004),
 'borders':clip(v+'/ne_10m_admin_1_states_provinces_lines.geojson',lambda p:p.get('ADM0_A3')=='IND' and not p.get('BRK_A3'),.004),
 'lakes':clip(v+'/ne_10m_lakes.geojson',None,.004)}
for k in res:
    u=[];[u.append(x) for x in res[k] if x not in u];res[k]=u
for k in res:print(k,len(res[k]),sum(len(x) for x in res[k]),file=sys.stderr)
json.dump(res,open(sys.argv[2],'w'),separators=(',',':'))
