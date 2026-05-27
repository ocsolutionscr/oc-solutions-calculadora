const RATE_URL = "https://tipodecambio.cr/api/v1/tipo-cambio/hoy";

export default async function handler() {
  try {
    const response = await fetch(RATE_URL, {
      headers: { "User-Agent": "CalculadoraPrecioCR/1.0" }
    });

    const body = await response.text();

    return new Response(body, {
      status: response.status,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, max-age=300"
      }
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: "No se pudo consultar el tipo de cambio.",
        detail: error.message
      },
      { status: 502 }
    );
  }
}
