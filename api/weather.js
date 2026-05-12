const json = (res, status, data) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
};

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return json(res, 200, { ok: true });
  }

  if (req.method !== "GET") {
    return json(res, 405, { message: "Method not allowed." });
  }

  const apiKey = process.env.WEATHER_API_KEY;
  if (!apiKey) {
    return json(res, 500, {
      message: "Weather service is not configured. Add WEATHER_API_KEY in Vercel.",
    });
  }

  const query = String(req.query?.q || "").trim();
  if (!query) {
    return json(res, 400, { message: "Please enter a city." });
  }

  try {
    const url =
      `https://api.weatherapi.com/v1/forecast.json?key=${encodeURIComponent(apiKey)}` +
      `&q=${encodeURIComponent(query)}&days=7&aqi=no`;
    const response = await fetch(url);
    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.error) {
      return json(res, response.ok ? 400 : response.status, {
        message: data.error?.message || data.message || "Unable to fetch weather right now.",
      });
    }

    return json(res, 200, data);
  } catch {
    return json(res, 502, { message: "Could not connect to the weather service." });
  }
};
