from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import urllib.error
import urllib.request


PORT = 8787
RATE_URL = "https://tipodecambio.cr/api/v1/tipo-cambio/hoy"


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/api/rate":
            self.send_rate()
            return
        super().do_GET()

    def send_rate(self):
        try:
            request = urllib.request.Request(
                RATE_URL,
                headers={"User-Agent": "CalculadoraPrecioCR/1.0"},
            )
            with urllib.request.urlopen(request, timeout=15) as response:
                payload = response.read()
                status = response.status
        except (urllib.error.URLError, TimeoutError) as error:
            payload = json.dumps({
                "ok": False,
                "error": "No se pudo consultar el tipo de cambio.",
                "detail": str(error),
            }).encode("utf-8")
            status = 502

        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(payload)


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"Calculadora lista en http://127.0.0.1:{PORT}")
    server.serve_forever()
