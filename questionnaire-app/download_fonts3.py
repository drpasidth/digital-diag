import urllib.request, os
os.makedirs('fonts', exist_ok=True)

urls = [
    ('ThaiSarabunNew-Regular.ttf', 'https://raw.githubusercontent.com/google/fonts/main/ofl/thaisarabunnew/ThaiSarabunNew%5Bwght%5D.ttf'),
    ('ThaiSarabunNew-Bold.ttf', 'https://raw.githubusercontent.com/google/fonts/main/ofl/thaisarabunnew/ThaiSarabunNew-Bold.ttf'),
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