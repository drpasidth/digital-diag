import urllib.request

urls = [
    ('THSarabunNew.ttf', 'https://raw.githubusercontent.com/pongsakornboon/THSarabunNew/master/THSarabunNew.ttf'),
    ('THSarabunPSK.ttf', 'https://raw.githubusercontent.com/xfirstz/THSarabun/master/THSarabunPSK.ttf'),
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