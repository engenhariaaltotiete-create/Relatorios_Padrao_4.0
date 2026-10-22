"""Run after browser-smoke.mjs. Requires PyMuPDF (fitz)."""
import os
from pathlib import Path
import fitz

root = Path(os.environ.get('MA_TEST_ARTIFACTS', '/tmp/maintenance-authorization-tests'))
mm = 72 / 25.4
for name in ['0', '1', '2', '5', 'long']:
    document = fitz.open(root / f'maintenance-{name}.pdf')
    if name != 'long':
        assert len(document) == int(name) + 1
    else:
        assert len(document) > 2
    text = ''.join(page.get_text() for page in document)
    for number, page in enumerate(document):
        assert abs(page.rect.width / mm - 210) < .1
        assert abs(page.rect.height / mm - 297) < .1
        assert f'{number + 1}/{len(document)}' in page.get_text()
        for block in page.get_text('dict')['blocks']:
            if block['type'] == 0:
                for line in block['lines']:
                    for span in line['spans']:
                        x0, y0, x1, y1 = span['bbox']
                        assert x0 >= 15 * mm - .5 and x1 <= 195 * mm + .5
                        if span['size'] == 11.5:
                            assert y0 >= 30 * mm - .5 and y1 <= 267 * mm + .5
                        elif span['size'] == 8:
                            assert y0 >= 270 * mm and y1 <= 297 * mm
                        elif span['size'] == 12:
                            assert y1 <= 30 * mm
            else:
                x0, y0, x1, y1 = block['bbox']
                assert x0 >= 15 * mm - .5 and x1 <= 195 * mm + .5
                if y0 >= 30 * mm:
                    assert y1 <= 267 * mm + .5
        if name != 'long' and number > 0:
            photos = [b for b in page.get_text('dict')['blocks']
                      if b['type'] == 1 and b['bbox'][1] >= 30 * mm]
            assert len(photos) == 1
            box = photos[0]['bbox']
            assert abs((box[2]-box[0])/(box[3]-box[1])-2) < .01
    assert 'agentes' not in text.lower()
    assert text.index('Data:') < text.index('Prazo aproximado') < text.index('Medidas aproximadas')
    assert '21 de outubro de 2026' in text
    assert 'Prefeitura Municipal de Suzano' in text
    spans = [s for p in document for b in p.get_text('dict')['blocks']
             if b['type'] == 0 for line in b['lines'] for s in line['spans']]
    assert all('Bold' in s['font'] for s in spans if 'Abaixo, segue' in s['text'] or s['text'] == '7654321')
    print(f'{name}: {len(document)} páginas; A4, margens, conteúdo, fotografias e paginação OK')
fitz.open(root / 'maintenance-1.pdf')[0].get_pixmap(matrix=fitz.Matrix(1.4, 1.4)).save(root / 'pdf-preview.png')
