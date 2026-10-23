
export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({
            error: "Method not allowed"
        });
    }

    const city = typeof req.query.q === "string"
        ? req.query.q.trim()
        : "";

    if (!city) {
        return res.status(400).json({
            error: "Please provide a city name."
        });
    }

    const apiKey = process.env.OPENWEATHER_API_KEY;

    if (!apiKey) {
        return res.status(500).json({
            error: "Weather API key is not configured."
        });
    }

    try {
        const url = new URL(
            "https://api.openweathermap.org/data/2.5/weather"
        );

        url.searchParams.set("q", city);
        url.searchParams.set("appid", apiKey);
        url.searchParams.set("units", "metric");

        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({
                error: data.message || "Unable to fetch weather."
            });
        }

        return res.status(200).json({
            name: data.name,
            temp: data.main.temp,
            condition: data.weather[0].description
        });

    } catch (error) {
        console.error("Weather API error:", error);

        return res.status(500).json({
            error: "Unable to fetch weather. Please try again."
        });
    }
}
