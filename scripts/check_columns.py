import os, json
from urllib.request import Request, urlopen

url = os.environ['SUPABASE_URL']
key = os.environ['SUPABASE_SERVICE_KEY']

req = Request(f'{url}/rest/v1/jobs?limit=1', headers={
    'apikey': key, 'Authorization': f'Bearer {key}', 'Accept': 'application/json'
})
with urlopen(req, timeout=10) as resp:
    rows = json.loads(resp.read())
    if rows:
        print('Columns:', sorted(rows[0].keys()))
    else:
        print('No rows - trying to get schema from migration')
