import { useMemo } from 'react'
import SunCalc from 'suncalc'

/**
 * Hook to calculate sun position in 3D space based on geographic location and time.
 * Uses SunCalc library for accurate astronomical calculations.
 *
 * @param {number} latitude - Latitude in degrees (-90 to 90)
 * @param {number} longitude - Longitude in degrees (-180 to 180)
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @param {number} hour - Hour of day (0-23, can include decimals for minutes)
 * @returns {Object} Sun position data including 3D coordinates and metadata
 */
export const useSunPosition = (latitude, longitude, dateStr, hour) => {
    return useMemo(() => {
        // Parse date and set time
        const [year, month, day] = dateStr.split('-').map(Number)
        const date = new Date(year, month - 1, day, Math.floor(hour), (hour % 1) * 60)

        // Get sun position from SunCalc
        const sunPosition = SunCalc.getPosition(date, latitude, longitude)
        const times = SunCalc.getTimes(date, latitude, longitude)

        // Azimuth: compass direction (radians, 0 = south, positive = west)
        // Altitude: angle above horizon (radians, 0 = horizon, PI/2 = zenith)
        const { azimuth, altitude } = sunPosition

        // Distance from scene center for directional light
        const distance = 500

        // Convert spherical to Cartesian (Z-up coordinate system)
        // In our system: X = East, Y = North, Z = Up
        // SunCalc azimuth: 0 = South, positive = West
        // We need to adjust: our North is +Y, so we rotate by PI
        const adjustedAzimuth = azimuth + Math.PI

        const x = Math.sin(adjustedAzimuth) * Math.cos(altitude) * distance
        const y = Math.cos(adjustedAzimuth) * Math.cos(altitude) * distance
        const z = Math.sin(altitude) * distance

        // Calculate intensity based on sun altitude
        // Full intensity when sun is high, reduced when near horizon
        const altitudeNormalized = Math.max(0, altitude) / (Math.PI / 2)
        const intensity = Math.max(0, Math.sin(altitude)) * 1.5

        // Determine if sun is above horizon
        const isAboveHorizon = altitude > 0

        // Calculate shadow softness based on altitude
        // Softer shadows when sun is low, sharper when high
        const shadowSoftness = 1 - altitudeNormalized * 0.5

        // Sun color shifts warmer at sunrise/sunset
        const sunColorTemp = altitudeNormalized < 0.3
            ? { r: 1, g: 0.7 + altitudeNormalized, b: 0.4 + altitudeNormalized * 2 }
            : { r: 1, g: 1, b: 1 }

        return {
            // 3D position for directional light
            position: [x, y, z],

            // Raw astronomical data
            azimuth,
            altitude,
            azimuthDegrees: (azimuth * 180) / Math.PI,
            altitudeDegrees: (altitude * 180) / Math.PI,

            // Computed properties
            intensity,
            isAboveHorizon,
            shadowSoftness,
            sunColor: sunColorTemp,

            // Sun times for the day
            sunrise: times.sunrise,
            sunset: times.sunset,
            solarNoon: times.solarNoon,

            // Formatted times
            sunriseTime: times.sunrise ? formatTime(times.sunrise) : 'N/A',
            sunsetTime: times.sunset ? formatTime(times.sunset) : 'N/A',

            // Debug info
            date,
            latitude,
            longitude
        }
    }, [latitude, longitude, dateStr, hour])
}

/**
 * Format a Date object to HH:MM string
 */
function formatTime(date) {
    if (!date || isNaN(date.getTime())) return 'N/A'
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    })
}

/**
 * Get preset locations for common cities
 */
export const presetLocations = [
    { name: 'San Francisco, CA', latitude: 37.7749, longitude: -122.4194 },
    { name: 'New York, NY', latitude: 40.7128, longitude: -74.0060 },
    { name: 'Los Angeles, CA', latitude: 34.0522, longitude: -118.2437 },
    { name: 'Chicago, IL', latitude: 41.8781, longitude: -87.6298 },
    { name: 'Miami, FL', latitude: 25.7617, longitude: -80.1918 },
    { name: 'Seattle, WA', latitude: 47.6062, longitude: -122.3321 },
    { name: 'Denver, CO', latitude: 39.7392, longitude: -104.9903 },
    { name: 'Phoenix, AZ', latitude: 33.4484, longitude: -112.0740 },
    { name: 'London, UK', latitude: 51.5074, longitude: -0.1278 },
    { name: 'Tokyo, Japan', latitude: 35.6762, longitude: 139.6503 },
    { name: 'Sydney, Australia', latitude: -33.8688, longitude: 151.2093 },
    { name: 'Dubai, UAE', latitude: 25.2048, longitude: 55.2708 },
]

export default useSunPosition
