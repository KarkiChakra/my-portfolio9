const apiKey = "e1552c854221473db56224049263103";

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

async function fetchOpenMeteoForecastDays(lat, lon) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}` +
    `&longitude=${encodeURIComponent(lon)}` +
    `&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,sunrise,sunset` +
    `&timezone=auto`;

  const res = await fetch(url);
  const data = await res.json();
  const daily = data?.daily;
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
        daily_chance_of_rain: Number.isFinite(precipMm) ? `${precipMm} mm` : null,
        maxwind_kph: Number.isFinite(windKph) ? windKph : null,
        avghumidity: null
      },
      astro: {
        sunrise: sunrise ? String(sunrise).split(" ")[1] || sunrise : null,
        sunset: sunset ? String(sunset).split(" ")[1] || sunset : null
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
      ? `<div class="sun-times"><span>🌅 Sunrise: ${data.sunrise}</span><span>🌇 Sunset: ${data.sunset}</span></div>`
      : "";

  const card = `
    <div class="weather-card">
      <div class="weather-top">
        <div>
          <h2>${data.name}, ${data.country}</h2>
          <div class="weather-condition">
            <img class="weather-icon" src="https:${data.icon}">
            <span>${data.condition}</span>
          </div>
          <div class="weather-time">Local time: ${data.localtime}</div>
        </div>
        <div class="weather-temp">
          <div class="weather-temp-main">${data.tempC}°C</div>
          <div class="weather-temp-sub">${data.tempF}°F</div>
        </div>
      </div>
      <p>💨 Wind: ${data.wind} km/h</p>
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
    const wind = toInt(d?.day?.maxwind_kph);
    const humidity = toInt(d?.day?.avghumidity);

    const metaParts = [];
    if (chanceRain != null && chanceRain !== "") metaParts.push(`Rain: ${chanceRain}%`);
    if (wind != null) metaParts.push(`Wind: ${wind} km/h`);
    if (humidity != null) metaParts.push(`Hum: ${humidity}%`);

    const temps =
      maxC != null && minC != null
        ? `H ${maxC}°C (${maxF}°F) · L ${minC}°C (${minF}°F)`
        : d
          ? ""
          : "No forecast available";

    const sunrise = d?.astro?.sunrise;
    const sunset = d?.astro?.sunset;
    const sunLine = sunrise && sunset ? `🌅 ${sunrise} · 🌇 ${sunset}` : "";

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
        <div class="forecast-meta">${metaParts.join(" · ")}</div>
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
    const res = await fetch(
      `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${city}&days=7&aqi=no`
    );
    const data = await res.json();

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

        const res = await fetch(
          `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${latitude},${longitude}&days=7&aqi=no`
        );
        const data = await res.json();

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
    () => renderMessage("Location permission denied.")
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
