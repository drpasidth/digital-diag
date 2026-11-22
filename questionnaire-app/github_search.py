import urllib.request, json

url = 'https://api.github.com/search/repositories?q=THSarabunPSK'
try:
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    r = urllib.request.urlopen(req, timeout=10)
    data = r.read().decode()
    j = json.loads(data)
    with open('github_search.txt', 'w', encoding='utf-8') as f:
        for item in j.get('items', [])[:10]:
            f.write(f"{item['full_name']}: {item['html_url']}\n")
except Exception as e:
    with open('github_search.txt', 'w', encoding='utf-8') as f:
        f.write(f'FAIL: {e}\n')

print('Done')