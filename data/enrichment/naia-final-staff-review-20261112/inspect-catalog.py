import sys, json
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, str(Path('tmp/pdfs/reader').resolve()))
import pymupdf
root=Path('data/enrichment/naia-final-staff-review-20261112')
doc=pymupdf.open(root/'sources/northwestern-ohio-catalog.pdf')
print('PAGES',len(doc))
print('COVER',doc[0].get_text()[:1800])
hits=[]
for i,page in enumerate(doc):
    text=page.get_text()
    if 'Kory Hartman' in text or 'Baseball Head Coach' in text:
        hits.append({'page':i+1,'text':text})
        print('STAFF_PAGE',i+1,text)
        out=Path('tmp/pdfs')/f'unoh-catalog-page-{i+1}.png'
        page.get_pixmap(matrix=pymupdf.Matrix(1.4,1.4)).save(out)
(root/'catalog-extraction.json').write_text(json.dumps({'databaseAccess':False,'databaseWrites':0,'cover':doc[0].get_text(),'pages':hits},indent=2)+'\n',encoding='utf8')
