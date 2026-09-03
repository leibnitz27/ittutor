"""
Dev server. Serves .js as text/javascript so browsers accept ES modules.
Run from the project root: python scripts/serve.py
"""
import http.server
import socketserver

PORT = 8000

class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        '.js':   'text/javascript',
        '.json': 'application/json',
        '.html': 'text/html',
        '.css':  'text/css',
        '':      'application/octet-stream',
    }

    def log_message(self, fmt, *args):
        pass  # suppress request noise

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving on http://localhost:{PORT}")
    httpd.serve_forever()
