import sys,json,re
proto,tpl,gt,out=sys.argv[1:5]
s=open(proto,encoding='utf-8').read().split('\n')
start=next(i for i,l in enumerate(s) if 'road network (demo values' in l)
end=next(i for i,l in enumerate(s) if 'expected-traffic model' in l)
engine='\n'.join(s[start:end])
g=json.load(open(gt,encoding='utf-8'))
ids=set(re.findall(r"[HP]l\('(\w+)','(\w+)'",engine))
links={a+'-'+b for a,b in ids}
for ev in g['events']:
    for c in ev['closures']:
        assert c['link'] in links,c
t=open(tpl,encoding='utf-8').read().replace('/*__ENGINE__*/',"/* engine copied unchanged from PahaadPath_prototype.html, lines %d to %d */\n%s"%(start+1,end,engine)).replace('/*__GT__*/',json.dumps(g,ensure_ascii=False))
open(out,'w',encoding='utf-8').write(t)
print('engine lines',start+1,'to',end,'links',len(links))
