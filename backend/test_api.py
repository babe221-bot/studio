import urllib.request
import json

url = 'http://127.0.0.1:8000/api/cad/generate-drawing'
data = {
    'dims': {'length': 100, 'width': 50, 'height': 2},
    'material': {'name': 'Granite'},
    'finish': {'name': 'Polished'},
    'profile': {'name': 'Straight'},
    'processedEdges': {'front': True, 'back': False, 'left': False, 'right': False},
    'okapnikEdges': {'front': False, 'back': False, 'left': False, 'right': False}
}
req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers={'Content-Type': 'application/json'})

try:
    with urllib.request.urlopen(req) as f:
        print(f.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(f"HTTPError: {e.code}")
    print(e.read().decode('utf-8'))
except Exception as e:
    print(f"Exception: {e}")
