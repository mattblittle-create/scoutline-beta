import sys, json, hashlib, re
from pathlib import Path
sys.path.insert(0, str(Path('tmp/pdfs/reader').resolve()))
import pymupdf
root = Path(__file__).resolve().parent
source = root / 'concordia-2027-roster.pdf'
doc = pymupdf.open(source)
assert len(doc) == 2
assert '2027 Concordia Baseball Roster' in doc[0].get_text()
rows = []
page_counts = []
for page_no, page in enumerate(doc, 1):
    groups = {}
    for word in page.get_text('words'):
        groups.setdefault(round(word[1], 1), []).append(word)
    count = 0
    for y, words in sorted(groups.items()):
        columns = [[] for _ in range(8)]
        for w in sorted(words, key=lambda w: w[0]):
            x = w[0]
            index = sum(x >= bound for bound in [40, 155, 200, 235, 268, 300, 414])
            columns[index].append(w[4])
        cells = [' '.join(c) for c in columns]
        if not re.fullmatch(r'(?:RHP|LHP|INF|OF|C|1B|UTIL)(?:/(?:RHP|LHP|INF|OF|C|1B|UTIL))*', cells[2]):
            continue
        assert cells[1] and re.fullmatch(r'[56]-\d{1,2}', cells[3])
        assert cells[4] in ['Fr.', 'So.', 'Jr.', 'Sr.']
        assert re.fullmatch(r'[RLS]/[RL]', cells[5])
        rows.append({'page': page_no, 'y': y, 'number': cells[0] or None, 'name': cells[1], 'positionRaw': cells[2], 'heightRaw': cells[3], 'classYearRaw': cells[4], 'batsThrowsPublished': cells[5]})
        count += 1
    page_counts.append(count)
assert len({r['name'] for r in rows}) == len(rows)
assert page_counts == [45, 20], page_counts
output = {'sourceSHA256': hashlib.sha256(source.read_bytes()).hexdigest(), 'season': '2027', 'pageCounts': page_counts, 'rows': rows, 'visualReview': 'Both rendered pages inspected; aligned name/position/height/year columns. No weight inferred. Staff footer excluded.'}
(root / 'concordia-pdf-rows.json').write_text(json.dumps(output, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'players': len(rows), 'pageCounts': page_counts}))
