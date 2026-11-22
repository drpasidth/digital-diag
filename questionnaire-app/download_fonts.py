import urllib.request, os

os.makedirs('fonts', exist_ok=True)

urls = [
    ('THSarabunPSK.ttf', 'https://raw.githubusercontent.com/cjv/thai-fonts/master/fonts/THSarabunPSK.ttf'),
    ('THSarabunPSK-Bold.ttf', 'https://raw.githubusercontent.com/cjv/thai-fonts/master/fonts/THSarabunPSK-Bold.ttf'),
    ('THSarabunPSK-Italic.ttf', 'https://raw.githubusercontent.com/cjv/thai-fonts/master/fonts/THSarabunPSK-Italic.ttf'),
    ('THSarabunPSK-BoldItalic.ttf', 'https://raw.githubusercontent.com/cjv/thai-fonts/master/fonts/THSarabunPSK-BoldItalic.ttf'),
]

for name, url in urls:
    path = os.path.join('fonts', name)
    try:
        urllib.request.urlretrieve(url, path)
        size = os.path.getsize(path)
        with open('download_log.txt', 'a', encoding='utf-8') as f:
            f.write(f'OK: {name} ({size} bytes)\n')
    except Exception as e:
        with open('download_log.txt', 'a', encoding='utf-8') as f:
            f.write(f'FAIL: {name} - {e}\n')

print('Done')