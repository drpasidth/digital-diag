import urllib.request, os
os.makedirs('fonts', exist_ok=True)

urls = [
    ('THSarabunPSK.ttf', 'https://raw.githubusercontent.com/cjv/thai-fonts/master/THSarabunPSK.ttf'),
    ('THSarabunPSK-Bold.ttf', 'https://raw.githubusercontent.com/cjv/thai-fonts/master/THSarabunPSK-Bold.ttf'),
    ('THSarabunPSK-Italic.ttf', 'https://raw.githubusercontent.com/cjv/thai-fonts/master/THSarabunPSK-Italic.ttf'),
    ('THSarabunPSK-BoldItalic.ttf', 'https://raw.githubusercontent.com/cjv/thai-fonts/master/THSarabunPSK-BoldItalic.ttf'),
]

for name, url in urls:
    try:
        r = urllib.request.urlopen(url, timeout=10)
        data = r.read()
        with open(f'fonts/{name}', 'wb') as f:
            f.write(data)
        print(f'OK: {name} ({len(data)} bytes)')
    except Exception as e:
        print(f'FAIL: {name} - {e}')

print('Done')