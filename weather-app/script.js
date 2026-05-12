async function fetchWeatherApi(query) {
  try {
    const res = await fetch(`/api/weather?q=${encodeURIComponent(query)}`);
    const data = await res.json().catch(() => ({}));
    if (res.ok) return data;
  } catch {}

  return fetchOpenMeteoWeather(query);
}

const THEME_PREF_KEY = "themePref";
const LAST_AUTO_THEME_KEY = "lastAutoTheme";

let lastThemeContext = null;

function parseAmPmTimeToMinutes(t) {
  if (!t || typeof t !== "string") return null;
  const m = t.trim().match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
  if (!m) return null;
  let hours = Number(m[1]);
  const minutes = Number(m[2]);
  const meridiem = m[3].toUpperCase();
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) return null;

  if (hours === 12) hours = 0;
  if (meridiem === "PM") hours += 12;
  return hours * 60 + minutes;
}

function parseLocaltimeToMinutes(localtime) {
  if (!localtime || typeof localtime !== "string") return null;
  const parts = localtime.trim().split(" ");
  if (parts.length < 2) return null;
  const time = parts[1];
  const m = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function isDayFromSunTimes({ localtime, sunrise, sunset }) {
  const nowMin = parseLocaltimeToMinutes(localtime);
  const sunriseMin = parseAmPmTimeToMinutes(sunrise);
  const sunsetMin = parseAmPmTimeToMinutes(sunset);
  if (nowMin == null || sunriseMin == null || sunsetMin == null) return null;

  if (sunriseMin === sunsetMin) return null;
  if (sunriseMin < sunsetMin) return nowMin >= sunriseMin && nowMin < sunsetMin;
  return nowMin >= sunriseMin || nowMin < sunsetMin;
}

function getThemePref() {
  const v = localStorage.getItem(THEME_PREF_KEY);
  if (v === "light" || v === "dark" || v === "auto") return v;
  const legacy = localStorage.getItem("theme");
  if (legacy === "light" || legacy === "dark") return legacy;
  return "auto";
}

function setThemePref(v) {
  localStorage.setItem(THEME_PREF_KEY, v);
}

function applyResolvedTheme(theme) {
  document.body.classList.toggle("light", theme === "light");
}

function updateThemeToggleLabel(pref) {
  const el = document.getElementById("themeToggle");
  if (pref === "auto") el.textContent = "🕒";
  if (pref === "light") el.textContent = "☀️";
  if (pref === "dark") el.textContent = "🌙";
  el.setAttribute("aria-label", `Theme: ${pref}`);
}

function resolveTheme(pref, context) {
  if (pref === "light" || pref === "dark") return pref;
  const last = localStorage.getItem(LAST_AUTO_THEME_KEY);
  if (context && typeof context.isDay === "boolean") return context.isDay ? "light" : "dark";
  if (last === "light" || last === "dark") return last;
  const h = new Date().getHours();
  return h >= 6 && h < 18 ? "light" : "dark";
}

function applyThemeFromPref(pref, context) {
  const resolved = resolveTheme(pref, context);
  applyResolvedTheme(resolved);
  if (pref === "auto") localStorage.setItem(LAST_AUTO_THEME_KEY, resolved);
  updateThemeToggleLabel(pref);
}

function weatherTextFromWmoCode(code) {
  const c = Number(code);
  if (!Number.isFinite(c)) return "";
  if (c === 0) return "Clear";
  if (c === 1) return "Mainly clear";
  if (c === 2) return "Partly cloudy";
  if (c === 3) return "Overcast";
  if (c === 45 || c === 48) return "Fog";
  if (c === 51 || c === 53 || c === 55) return "Drizzle";
  if (c === 56 || c === 57) return "Freezing drizzle";
  if (c === 61 || c === 63 || c === 65) return "Rain";
  if (c === 66 || c === 67) return "Freezing rain";
  if (c === 71 || c === 73 || c === 75) return "Snow";
  if (c === 77) return "Snow grains";
  if (c === 80 || c === 81 || c === 82) return "Rain showers";
  if (c === 85 || c === 86) return "Snow showers";
  if (c === 95) return "Thunderstorm";
  if (c === 96 || c === 99) return "Thunderstorm with hail";
  return "Cloudy";
}

function formatLocalDateTime(value = new Date()) {
  if (typeof value === "string") return value.replace("T", " ").slice(0, 16);
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

function formatLocalDateTimeFromOffset(utcOffsetSeconds = 0) {
  const offsetMs = Number(utcOffsetSeconds) * 1000;
  const d = new Date(Date.now() + offsetMs);
  if (Number.isNaN(d.getTime())) return formatLocalDateTime();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

function formatOpenMeteoTime(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).split("T")[1] || value;
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function cToF(c) {
  return Number.isFinite(c) ? Math.round((c * 9) / 5 + 32) : null;
}

function parseLatLon(query) {
  const m = String(query).trim().match(/^(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/);
  if (!m) return null;
  return { lat: Number(m[1]), lon: Number(m[2]) };
}

async function resolveOpenMeteoLocation(query) {
  const coords = parseLatLon(query);
  if (coords) return reverseGeocodeLocation(coords);
  if (query === "auto:ip") throw new Error("Location permission denied.");

  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  const place = data?.results?.[0];
  if (!place) throw new Error("City not found.");

  return {
    lat: place.latitude,
    lon: place.longitude,
    name: place.name,
    country: place.country || "",
  };
}

async function reverseGeocodeLocation(coords) {
  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
      `&lat=${encodeURIComponent(coords.lat)}` +
      `&lon=${encodeURIComponent(coords.lon)}` +
      `&zoom=10&accept-language=en`;
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    const a = data?.address || {};
    const name =
      a.city ||
      a.town ||
      a.village ||
      a.municipality ||
      a.county ||
      a.state ||
      data?.name ||
      "Current location";
    return {
      ...coords,
      name,
      country: a.country || "",
    };
  } catch {
    return { ...coords, name: "Current location", country: "" };
  }
}

async function fetchOpenMeteoWeather(query) {
  const location = await resolveOpenMeteoLocation(query);
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(location.lat)}` +
    `&longitude=${encodeURIComponent(location.lon)}` +
    `&current_weather=true` +
    `&current=temperature_2m,weather_code,wind_speed_10m` +
    `&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,sunrise,sunset` +
    `&timezone=auto`;

  const res = await fetch(url);
  const data = await res.json();
  const current = data?.current || {};
  const currentWeather = data?.current_weather || {};
  const currentTemp = Number.isFinite(Number(currentWeather.temperature))
    ? Number(currentWeather.temperature)
    : Number(current.temperature_2m);
  const windKph = Number.isFinite(Number(currentWeather.windspeed))
    ? Number(currentWeather.windspeed)
    : Number(current.wind_speed_10m);
  const weatherCode = Number.isFinite(Number(currentWeather.weathercode))
    ? currentWeather.weathercode
    : current.weather_code;
  const localtime = formatLocalDateTimeFromOffset(data?.utc_offset_seconds || 0);

  return {
    location: {
      name: location.name,
      country: location.country,
      lat: location.lat,
      lon: location.lon,
      localtime,
    },
    current: {
      temp_c: Number.isFinite(currentTemp) ? Math.round(currentTemp) : null,
      temp_f: cToF(currentTemp),
      wind_kph: Number.isFinite(windKph) ? Math.round(windKph) : null,
      condition: {
        text: weatherTextFromWmoCode(weatherCode),
        icon: "",
      },
    },
    forecast: { forecastday: buildOpenMeteoForecastDays(data?.daily) },
  };
}

async function fetchOpenMeteoForecastDays(lat, lon) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}` +
    `&longitude=${encodeURIComponent(lon)}` +
    `&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,sunrise,sunset` +
    `&timezone=auto`;

  const res = await fetch(url);
  const data = await res.json();
  return buildOpenMeteoForecastDays(data?.daily);
}

function buildOpenMeteoForecastDays(daily) {
  const times = daily?.time;
  if (!Array.isArray(times) || times.length === 0) return [];

  const days = [];
  for (let i = 0; i < times.length; i++) {
    const date = times[i];
    const maxC = daily?.temperature_2m_max?.[i];
    const minC = daily?.temperature_2m_min?.[i];
    const precipMm = daily?.precipitation_sum?.[i];
    const windKph = daily?.windspeed_10m_max?.[i];
    const sunrise = daily?.sunrise?.[i];
    const sunset = daily?.sunset?.[i];
    const wmo = daily?.weathercode?.[i];

    days.push({
      date,
      day: {
        condition: { text: weatherTextFromWmoCode(wmo), icon: "" },
        maxtemp_c: Number.isFinite(maxC) ? maxC : null,
        mintemp_c: Number.isFinite(minC) ? minC : null,
        daily_chance_of_rain: null,
        precipitation_sum_mm: Number.isFinite(precipMm) ? precipMm : null,
        maxwind_kph: Number.isFinite(windKph) ? windKph : null,
        avghumidity: null
      },
      astro: {
        sunrise: formatOpenMeteoTime(sunrise),
        sunset: formatOpenMeteoTime(sunset)
      }
    });
  }

  return days.slice(0, 7);
}

// MESSAGE
function renderMessage(msg) {
  document.getElementById("weatherResult").innerHTML = `
    <div class="weather-card"><p>${msg}</p></div>
  `;
  document.getElementById("forecast").innerHTML = "";
}

// WEATHER CARD FIXED
function renderWeather(data) {
  const sunRow =
    data.sunrise && data.sunset
      ? `<div class="sun-times"><span>Sunrise: ${data.sunrise}</span><span>Sunset: ${data.sunset}</span></div>`
      : "";
  const icon = data.icon ? `<img class="weather-icon" src="https:${data.icon}" alt="">` : "";

  const card = `
    <div class="weather-card">
      <div class="weather-top">
        <div>
          <h2>${data.name}, ${data.country}</h2>
          <div class="weather-condition">
            ${icon}
            <span>${data.condition}</span>
          </div>
          <div class="weather-time">Local time: ${data.localtime}</div>
        </div>
        <div class="weather-temp">
          <div class="weather-temp-main">${data.tempC}&deg;C</div>
          <div class="weather-temp-sub">${data.tempF}&deg;F</div>
        </div>
      </div>
      <p>Wind: ${data.wind} km/h</p>
      ${sunRow}
    </div>
  `;

  document.getElementById("weatherResult").innerHTML = card;
}

// FORECAST FIXED
function renderForecast(days) {
  const container = document.createElement("div");
  container.className = "forecast-container";

  const toInt = v => (Number.isFinite(v) ? Math.round(v) : null);
  const cToF = c => (Number.isFinite(c) ? Math.round((c * 9) / 5 + 32) : null);
  const dateFromYmd = s => {
    const parts = String(s).split("-");
    const y = Number(parts[0]);
    const m = Number(parts[1]);
    const d = Number(parts[2]);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return new Date(NaN);
    return new Date(y, m - 1, d);
  };

  const byWeekdayIndex = new Map();
  days.forEach(d => {
    const dt = dateFromYmd(d.date);
    const dayIndex = dt.getDay();
    if (Number.isFinite(dayIndex)) byWeekdayIndex.set(dayIndex, d);
  });

  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    const d = byWeekdayIndex.get(dayIndex);
    const weekday = weekdayLabels[dayIndex];

    const dt = d ? dateFromYmd(d.date) : null;
    const monthDay = dt ? dt.toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";

    const maxC = toInt(d?.day?.maxtemp_c);
    const minC = toInt(d?.day?.mintemp_c);
    const maxF = cToF(d?.day?.maxtemp_c);
    const minF = cToF(d?.day?.mintemp_c);

    const chanceRain = d?.day?.daily_chance_of_rain;
    const precipMm = d?.day?.precipitation_sum_mm;
    const wind = toInt(d?.day?.maxwind_kph);
    const humidity = toInt(d?.day?.avghumidity);

    const metaParts = [];
    if (chanceRain != null && chanceRain !== "") metaParts.push(`Rain: ${chanceRain}%`);
    if (precipMm != null && precipMm !== "") metaParts.push(`Rain: ${precipMm} mm`);
    if (wind != null) metaParts.push(`Wind: ${wind} km/h`);
    if (humidity != null) metaParts.push(`Hum: ${humidity}%`);

    const temps =
      maxC != null && minC != null
        ? `H ${maxC}&deg;C (${maxF}&deg;F) / L ${minC}&deg;C (${minF}&deg;F)`
        : d
          ? ""
          : "No forecast available";

    const sunrise = d?.astro?.sunrise;
    const sunset = d?.astro?.sunset;
    const sunLine = sunrise && sunset ? `Sunrise ${sunrise} / Sunset ${sunset}` : "";

    const icon = d?.day?.condition?.icon ? `https:${d.day.condition.icon}` : "";
    const conditionText = d?.day?.condition?.text || "";

    const card = document.createElement("div");
    card.className = "forecast-card";
    card.innerHTML = `
      <div class="forecast-left">
        <div class="forecast-weekday">${weekday}</div>
        <div class="forecast-date">${monthDay}</div>
        ${icon ? `<img class="forecast-icon" src="${icon}">` : ``}
      </div>
      <div class="forecast-right">
        <div class="forecast-title">${conditionText}</div>
        <div class="forecast-temps">${temps}</div>
        <div class="forecast-meta">${metaParts.join(" / ")}</div>
        <div class="forecast-sun">${sunLine}</div>
      </div>
    `;

    container.appendChild(card);
  }

  const forecastDiv = document.getElementById("forecast");
  forecastDiv.innerHTML = "";
  if (days.length < 7) {
    const note = document.createElement("div");
    note.className = "forecast-note";
    note.textContent = `Only ${days.length}-day forecast is available from the current API plan.`;
    forecastDiv.appendChild(note);
  }
  forecastDiv.appendChild(container);
}

// API CALL FIXED
async function getWeather() {
  const city = document.getElementById("cityInput").value.trim();
  if (!city) return renderMessage("Please enter a city.");

  renderMessage("Loading...");

  try {
    const data = await fetchWeatherApi(city);

    if (data.error) return renderMessage(data.error.message);

    const todayAstro = data?.forecast?.forecastday?.[0]?.astro;
    const weather = {
      name: data.location.name,
      country: data.location.country,
      tempC: data.current.temp_c,
      tempF: data.current.temp_f,
      condition: data.current.condition.text,
      icon: data.current.condition.icon,
      wind: data.current.wind_kph,
      localtime: data.location.localtime,
      sunrise: todayAstro?.sunrise,
      sunset: todayAstro?.sunset
    };

    const isDay = isDayFromSunTimes(weather);
    lastThemeContext = isDay == null ? null : { isDay };
    const pref = getThemePref();
    if (pref === "auto") applyThemeFromPref(pref, lastThemeContext);

    renderWeather(weather);

    let forecastDays = data?.forecast?.forecastday || [];
    if (forecastDays.length < 7 && Number.isFinite(data?.location?.lat) && Number.isFinite(data?.location?.lon)) {
      try {
        const openMeteoDays = await fetchOpenMeteoForecastDays(data.location.lat, data.location.lon);
        if (openMeteoDays.length === 7) forecastDays = openMeteoDays;
      } catch {}
    }
    renderForecast(forecastDays);
  } catch (e) {
    renderMessage("Unable to fetch weather right now.");
  }
}

// LOCATION FIXED
function getWeatherByLocation() {
  if (!navigator.geolocation) return renderMessage("Geolocation is not supported in this browser.");

  renderMessage("Loading...");

  navigator.geolocation.getCurrentPosition(
    async pos => {
      try {
        const { latitude, longitude } = pos.coords;

        const data = await fetchWeatherApi(`${latitude},${longitude}`);

        if (data.error) return renderMessage(data.error.message);

        const todayAstro = data?.forecast?.forecastday?.[0]?.astro;
        const weather = {
          name: data.location.name,
          country: data.location.country,
          tempC: data.current.temp_c,
          tempF: data.current.temp_f,
          condition: data.current.condition.text,
          icon: data.current.condition.icon,
          wind: data.current.wind_kph,
          localtime: data.location.localtime,
          sunrise: todayAstro?.sunrise,
          sunset: todayAstro?.sunset
        };

        const isDay = isDayFromSunTimes(weather);
        lastThemeContext = isDay == null ? null : { isDay };
        const pref = getThemePref();
        if (pref === "auto") applyThemeFromPref(pref, lastThemeContext);

        renderWeather(weather);
        let forecastDays = data?.forecast?.forecastday || [];
        if (forecastDays.length < 7 && Number.isFinite(latitude) && Number.isFinite(longitude)) {
          try {
            const openMeteoDays = await fetchOpenMeteoForecastDays(latitude, longitude);
            if (openMeteoDays.length === 7) forecastDays = openMeteoDays;
          } catch {}
        }
        renderForecast(forecastDays);
      } catch (e) {
        renderMessage("Unable to fetch weather right now.");
      }
    },
    async err => {
      if (err && err.code === 1) {
        try {
          const data = await fetchWeatherApi("auto:ip");

          if (data.error) return renderMessage("Location permission denied.");

          const todayAstro = data?.forecast?.forecastday?.[0]?.astro;
          const weather = {
            name: data.location.name,
            country: data.location.country,
            tempC: data.current.temp_c,
            tempF: data.current.temp_f,
            condition: data.current.condition.text,
            icon: data.current.condition.icon,
            wind: data.current.wind_kph,
            localtime: data.location.localtime,
            sunrise: todayAstro?.sunrise,
            sunset: todayAstro?.sunset
          };

          const isDay = isDayFromSunTimes(weather);
          lastThemeContext = isDay == null ? null : { isDay };
          const pref = getThemePref();
          if (pref === "auto") applyThemeFromPref(pref, lastThemeContext);

          renderWeather(weather);
          let forecastDays = data?.forecast?.forecastday || [];
          if (
            forecastDays.length < 7 &&
            Number.isFinite(data?.location?.lat) &&
            Number.isFinite(data?.location?.lon)
          ) {
            try {
              const openMeteoDays = await fetchOpenMeteoForecastDays(data.location.lat, data.location.lon);
              if (openMeteoDays.length === 7) forecastDays = openMeteoDays;
            } catch {}
          }
          renderForecast(forecastDays);
          return;
        } catch (e) {
          return renderMessage("Location permission denied.");
        }
      }

      renderMessage("Unable to get your location.");
    }
  );
}

// THEME
applyThemeFromPref(getThemePref(), lastThemeContext);

document.getElementById("themeToggle").onclick = () => {
  const current = getThemePref();
  const next = current === "auto" ? "light" : current === "light" ? "dark" : "auto";
  setThemePref(next);
  applyThemeFromPref(next, lastThemeContext);
};

// ENTER KEY
document.getElementById("cityInput").addEventListener("keydown", e => {
  if (e.key === "Enter") getWeather();
});
