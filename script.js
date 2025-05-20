// Enhanced version with humidity, pressure, wind, 5-day forecast, and autocomplete

const OPEN_CAGE_API_KEY = '2bd3b3c3ff7547bfac0ed742caac18b9';

const cityInput = document.getElementById("city-input");
const searchBtn = document.getElementById("search-btn");
const loader = document.getElementById("loader");
const errorMessage = document.getElementById("error-message");
const dashboardContainer = document.getElementById("dashboard-container");
const cityNameElement = document.getElementById("city-name");
const dateTimeElement = document.getElementById("date-time");
const temperatureElement = document.getElementById("temperature");
const weatherIcon = document.getElementById("weather-icon");
const weatherDescription = document.getElementById("weather-description");
const feelsLikeElement = document.getElementById("feels-like");
const humidityElement = document.getElementById("humidity");
const windSpeedElement = document.getElementById("wind-speed");
const windDirectionElement = document.getElementById("wind-direction");
const pressureElement = document.getElementById("pressure");
const forecastCardsContainer = document.getElementById("forecast-cards");
const aqiElement = document.getElementById("aqi");
const aqiStatusElement = document.getElementById("aqi-status");
const pollutantsContainer = document.getElementById("pollutants-container");

searchBtn.addEventListener("click", fetchWeather);
cityInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") fetchWeather();
});

cityInput.addEventListener("input", async () => {
    const query = cityInput.value.trim();
    if (query.length < 2) {
        // Remove existing autocomplete list if query is too short
        const list = document.getElementById("autocomplete-list");
        if (list) list.remove();
        return;
    }

    try {
        const res = await fetch(`https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(query)}&key=${OPEN_CAGE_API_KEY}&limit=5`);
        const data = await res.json();

        // Remove existing list if present
        let list = document.getElementById("autocomplete-list");
        if (list) list.remove();
        
        // Create new list
        list = document.createElement("ul");
        list.id = "autocomplete-list";
        list.style.position = "absolute";
        list.style.background = "#fff";
        list.style.border = "1px solid #ccc";
        list.style.borderRadius = "4px";
        list.style.width = cityInput.offsetWidth + "px";
        list.style.top = cityInput.offsetTop + cityInput.offsetHeight + "px";
        list.style.left = cityInput.offsetLeft + "px";
        list.style.zIndex = "1000";
        list.style.maxHeight = "200px";
        list.style.overflowY = "auto";
        list.style.listStyleType = "none";
        
        if (data.results && data.results.length > 0) {
            data.results.forEach(result => {
                const item = document.createElement("li");
                item.textContent = result.formatted;
                item.style.padding = "8px";
                item.style.cursor = "pointer";
                item.style.borderBottom = "1px solid #eee";
                item.addEventListener("mouseover", () => {
                    item.style.backgroundColor = "#f0f0f0";
                });
                item.addEventListener("mouseout", () => {
                    item.style.backgroundColor = "";
                });
                item.addEventListener("click", () => {
                    cityInput.value = result.formatted;
                    list.remove();
                    fetchWeather();
                });
                list.appendChild(item);
            });
            
            document.body.appendChild(list);
        }
    } catch (err) {
        console.error("Autocomplete error:", err);
    }
});

document.addEventListener("click", (e) => {
    const list = document.getElementById("autocomplete-list");
    if (list && !list.contains(e.target) && e.target !== cityInput) list.remove();
});

window.addEventListener("DOMContentLoaded", () => {
    getWeatherByCity("Delhi");
});

async function fetchWeather() {
    const city = cityInput.value.trim();
    if (!city) {
        showError("Please enter a city name.");
        return;
    }
    getWeatherByCity(city);
}

async function getWeatherByCity(city) {
    showLoader();
    hideError();
    dashboardContainer.style.display = "none";

    try {
        // Get coordinates from city name
        const geoRes = await fetch(`https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(city)}&key=${OPEN_CAGE_API_KEY}`);
        const geoData = await geoRes.json();

        if (!geoData.results || geoData.results.length === 0) {
            throw new Error("City not found.");
        }

        const { lat, lng } = geoData.results[0].geometry;
        const formattedCity = geoData.results[0].formatted;

        // Get weather data
        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,weather_code,pressure_msl,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,relative_humidity_2m,surface_pressure&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto`);
        const weatherData = await weatherRes.json();

        if (!weatherData || !weatherData.current) {
            throw new Error("Weather data not available for this location.");
        }

        // Update UI with current weather data
        const current = weatherData.current;
        cityNameElement.textContent = formattedCity.split(',')[0]; // Show only city name, not full address
        dateTimeElement.textContent = new Date().toLocaleString();
        temperatureElement.textContent = `${Math.round(current.temperature_2m ?? '--')}°C`;
        
        // Calculate feels like temperature (simple approximation)
        const feelsLike = calculateFeelsLike(current.temperature_2m, current.relative_humidity_2m);
        feelsLikeElement.textContent = `${Math.round(feelsLike)}°C`;
        
        // Update weather description and icon based on weather code
        const weatherInfo = getWeatherInfo(current.weather_code);
        weatherDescription.textContent = weatherInfo.description;
        weatherIcon.src = weatherInfo.iconUrl;
        
        // Update humidity, pressure, wind speed and direction
        humidityElement.textContent = `${Math.round(current.relative_humidity_2m ?? '--')}%`;
        pressureElement.textContent = `${Math.round(current.pressure_msl ?? '--')} hPa`;
        windSpeedElement.textContent = `${current.wind_speed_10m ?? '--'} km/h`;
        windDirectionElement.textContent = `${current.wind_direction_10m ?? '--'}°`;

        // Update forecast
        updateForecast(weatherData.daily);
        
        // Update air quality (mock data as Open-Meteo free tier doesn't include AQI)
        updateAirQuality();

        dashboardContainer.style.display = "block";
    } catch (err) {
        console.error(err);
        showError("Failed to fetch weather data. " + err.message);
    } finally {
        hideLoader();
    }
}

function updateForecast(daily) {
    forecastCardsContainer.innerHTML = "";
    
    for (let i = 0; i < Math.min(5, daily.time.length); i++) {
        const date = new Date(daily.time[i]);
        const day = date.toLocaleDateString('en-US', { weekday: 'short' });
        const weatherInfo = getWeatherInfo(daily.weather_code[i]);
        
        const card = document.createElement("div");
        card.className = "forecast-card";
        card.innerHTML = `
            <div class="day">${day}</div>
            <img src="${weatherInfo.iconUrl}" alt="Weather icon" style="width:50px;height:50px;">
            <div class="forecast-temp">
                <div class="temp-max">${Math.round(daily.temperature_2m_max[i])}°</div>
                <div class="temp-min">${Math.round(daily.temperature_2m_min[i])}°</div>
            </div>
        `;
        forecastCardsContainer.appendChild(card);
    }
}

function updateAirQuality() {
    // Mock data as the free API doesn't provide AQI
    const aqi = Math.floor(Math.random() * 150) + 20;
    let status, statusClass;
    
    if (aqi <= 50) {
        status = "Good";
        statusClass = "status-good";
    } else if (aqi <= 100) {
        status = "Moderate";
        statusClass = "status-moderate";
    } else if (aqi <= 150) {
        status = "Unhealthy";
        statusClass = "status-unhealthy";
    } else if (aqi <= 200) {
        status = "Very Unhealthy";
        statusClass = "status-very-unhealthy";
    } else {
        status = "Hazardous";
        statusClass = "status-hazardous";
    }
    
    aqiElement.textContent = aqi;
    aqiStatusElement.textContent = status;
    aqiStatusElement.className = `aqi-status ${statusClass}`;
    
    // Mock pollutants data
    pollutantsContainer.innerHTML = "";
    const pollutants = [
        { name: "PM2.5", value: Math.floor(Math.random() * 80) + 5, unit: "μg/m³" },
        { name: "PM10", value: Math.floor(Math.random() * 120) + 10, unit: "μg/m³" },
        { name: "O3", value: (Math.random() * 0.08 + 0.01).toFixed(3), unit: "ppm" },
        { name: "NO2", value: (Math.random() * 0.05 + 0.01).toFixed(3), unit: "ppm" },
        { name: "SO2", value: (Math.random() * 0.02 + 0.001).toFixed(3), unit: "ppm" },
        { name: "CO", value: (Math.random() * 8 + 0.5).toFixed(1), unit: "ppm" }
    ];
    
    pollutants.forEach(pollutant => {
        const card = document.createElement("div");
        card.className = "pollutant-card";
        card.innerHTML = `
            <div class="pollutant-name">${pollutant.name}</div>
            <div class="pollutant-value">${pollutant.value} <span class="pollutant-unit">${pollutant.unit}</span></div>
        `;
        pollutantsContainer.appendChild(card);
    });
}

function calculateFeelsLike(temp, humidity) {
    // Simple heat index calculation (approximation)
    if (temp > 20 && humidity > 40) {
        return temp + (humidity - 40) / 10;
    } else if (temp < 10) {
        // For cold temps (simplistic wind chill approximation)
        return temp - 2;
    }
    return temp;
}

function getWeatherInfo(code) {
    // WMO Weather interpretation codes (https://open-meteo.com/en/docs)
    const weatherCodes = {
        0: { description: "Clear sky", icon: "clear" },
        1: { description: "Mainly clear", icon: "clear" },
        2: { description: "Partly cloudy", icon: "partly-cloudy" },
        3: { description: "Overcast", icon: "cloudy" },
        45: { description: "Fog", icon: "fog" },
        48: { description: "Depositing rime fog", icon: "fog" },
        51: { description: "Light drizzle", icon: "drizzle" },
        53: { description: "Moderate drizzle", icon: "drizzle" },
        55: { description: "Dense drizzle", icon: "drizzle" },
        56: { description: "Light freezing drizzle", icon: "sleet" },
        57: { description: "Dense freezing drizzle", icon: "sleet" },
        61: { description: "Slight rain", icon: "rain" },
        63: { description: "Moderate rain", icon: "rain" },
        65: { description: "Heavy rain", icon: "heavy-rain" },
        66: { description: "Light freezing rain", icon: "sleet" },
        67: { description: "Heavy freezing rain", icon: "sleet" },
        71: { description: "Slight snow fall", icon: "snow" },
        73: { description: "Moderate snow fall", icon: "snow" },
        75: { description: "Heavy snow fall", icon: "heavy-snow" },
        77: { description: "Snow grains", icon: "snow" },
        80: { description: "Slight rain showers", icon: "rain" },
        81: { description: "Moderate rain showers", icon: "rain" },
        82: { description: "Violent rain showers", icon: "heavy-rain" },
        85: { description: "Slight snow showers", icon: "snow" },
        86: { description: "Heavy snow showers", icon: "heavy-snow" },
        95: { description: "Thunderstorm", icon: "thunderstorm" },
        96: { description: "Thunderstorm with slight hail", icon: "thunderstorm-hail" },
        99: { description: "Thunderstorm with heavy hail", icon: "thunderstorm-hail" }
    };

    const defaultInfo = { 
        description: "Unknown", 
        iconUrl: "https://cdn-icons-png.flaticon.com/512/1116/1116453.png" 
    };
    
    if (!weatherCodes[code]) return defaultInfo;
    
    const info = weatherCodes[code];
    
    // Map icon names to URLs (using Flaticon placeholder URLs)
    const iconUrls = {
        "clear": "https://cdn-icons-png.flaticon.com/512/3222/3222800.png",
        "partly-cloudy": "https://cdn-icons-png.flaticon.com/512/1146/1146869.png",
        "cloudy": "https://cdn-icons-png.flaticon.com/512/414/414927.png",
        "fog": "https://cdn-icons-png.flaticon.com/512/1197/1197102.png",
        "drizzle": "https://cdn-icons-png.flaticon.com/512/3313/3313838.png",
        "rain": "https://cdn-icons-png.flaticon.com/512/3351/3351979.png",
        "heavy-rain": "https://cdn-icons-png.flaticon.com/512/4150/4150897.png",
        "sleet": "https://cdn-icons-png.flaticon.com/512/6251/6251642.png",
        "snow": "https://cdn-icons-png.flaticon.com/512/2315/2315309.png",
        "heavy-snow": "https://cdn-icons-png.flaticon.com/512/2315/2315519.png",
        "thunderstorm": "https://cdn-icons-png.flaticon.com/512/1959/1959317.png",
        "thunderstorm-hail": "https://cdn-icons-png.flaticon.com/512/2469/2469994.png"
    };
    
    return {
        description: info.description,
        iconUrl: iconUrls[info.icon] || defaultInfo.iconUrl
    };
}

function showLoader() {
    loader.style.display = "block";
}

function hideLoader() {
    loader.style.display = "none";
}

function showError(message) {
    errorMessage.style.display = "block";
    errorMessage.textContent = message;
}

function hideError() {
    errorMessage.style.display = "none";
}