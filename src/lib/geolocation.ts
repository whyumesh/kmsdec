// Hidden geolocation service using IP-based location detection
// This doesn't require user permission and works silently

export interface LocationData {
  latitude: number;
  longitude: number;
  city?: string;
  region?: string;
  country?: string;
  accuracy?: number;
}

export async function getHiddenLocation(): Promise<LocationData | null> {
  try {
    // Method 1: Try to get location from IP using free IP geolocation service
    const ipResponse = await fetch('https://ipapi.co/json/');
    const ipData = await ipResponse.json();
    
    if (ipData.latitude && ipData.longitude) {
      return {
        latitude: ipData.latitude,
        longitude: ipData.longitude,
        city: ipData.city,
        region: ipData.region,
        country: ipData.country,
        accuracy: 1000 // IP-based location has ~1km accuracy
      };
    }
  } catch (error) {
    console.log('IP geolocation failed, trying alternative method');
  }

  try {
    // Method 2: Alternative IP geolocation service
    const altResponse = await fetch('https://ipinfo.io/json');
    const altData = await altResponse.json();
    
    if (altData.loc) {
      const [lat, lng] = altData.loc.split(',').map(Number);
      return {
        latitude: lat,
        longitude: lng,
        city: altData.city,
        region: altData.region,
        country: altData.country,
        accuracy: 1000
      };
    }
  } catch (error) {
    console.log('Alternative geolocation failed');
  }

  // Method 3: Fallback to approximate location based on timezone
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const approximateLocation = getLocationFromTimezone(timezone);
    if (approximateLocation) {
      return approximateLocation;
    }
  } catch (error) {
    console.log('Timezone-based location failed');
  }

  // Method 4: Default fallback location (can be configured)
  return {
    latitude: 28.6139, // Delhi, India (example)
    longitude: 77.2090,
    city: 'Delhi',
    region: 'Delhi',
    country: 'India',
    accuracy: 50000 // Very low accuracy for fallback
  };
}

function getLocationFromTimezone(timezone: string): LocationData | null {
  // Approximate locations for common timezones
  const timezoneLocations: Record<string, LocationData> = {
    'Asia/Kolkata': { latitude: 22.5726, longitude: 88.3639, city: 'Kolkata', region: 'West Bengal', country: 'India', accuracy: 1000 },
    'Asia/Mumbai': { latitude: 19.0760, longitude: 72.8777, city: 'Mumbai', region: 'Maharashtra', country: 'India', accuracy: 1000 },
    'Asia/Chennai': { latitude: 13.0827, longitude: 80.2707, city: 'Chennai', region: 'Tamil Nadu', country: 'India', accuracy: 1000 },
    'Asia/Bangalore': { latitude: 12.9716, longitude: 77.5946, city: 'Bangalore', region: 'Karnataka', country: 'India', accuracy: 1000 },
    'Asia/Hyderabad': { latitude: 17.3850, longitude: 78.4867, city: 'Hyderabad', region: 'Telangana', country: 'India', accuracy: 1000 },
    'Asia/Pune': { latitude: 18.5204, longitude: 73.8567, city: 'Pune', region: 'Maharashtra', country: 'India', accuracy: 1000 },
    'America/New_York': { latitude: 40.7128, longitude: -74.0060, city: 'New York', region: 'NY', country: 'USA', accuracy: 1000 },
    'America/Los_Angeles': { latitude: 34.0522, longitude: -118.2437, city: 'Los Angeles', region: 'CA', country: 'USA', accuracy: 1000 },
    'Europe/London': { latitude: 51.5074, longitude: -0.1278, city: 'London', region: 'England', country: 'UK', accuracy: 1000 },
  };

  return timezoneLocations[timezone] || null;
}

// Validate if location is within allowed regions (for security)
export function validateLocation(location: LocationData, allowedRegions: string[]): boolean {
  // This can be customized based on your requirements
  // For now, we'll allow all locations
  return true;
}

// Get approximate region from coordinates (for 7-region system)
export function getRegionFromCoordinates(latitude: number, longitude: number): string {
  // This is a simplified mapping - you can make it more sophisticated
  if (latitude > 30) return 'NORTH';
  if (latitude < 20) return 'SOUTH';
  if (longitude > 80) return 'EAST';
  if (longitude < 70) return 'WEST';
  if (latitude > 25 && latitude < 30) return 'CENTRAL';
  if (latitude > 30 && longitude > 80) return 'NORTHEAST';
  if (latitude > 30 && longitude < 70) return 'NORTHWEST';
  
  return 'CENTRAL'; // Default fallback
}
