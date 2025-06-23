import type { Express } from 'express';

export function registerLocationRoutes(app: Express) {
  // Proxy endpoint for location autocomplete to avoid CORS issues
  app.get('/api/location/search', async (req, res) => {
    try {
      const { q } = req.query;
      
      if (!q || typeof q !== 'string' || q.length < 2) {
        return res.status(400).json({ error: 'Query parameter "q" is required and must be at least 2 characters' });
      }

      console.log('🔍 Location search for:', q);

      // Make request to Nominatim API from server (no CORS issues)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&countrycodes=us&q=${encodeURIComponent(q)}`,
        {
          headers: {
            'User-Agent': 'LocalPick/1.0 (location search service)',
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Nominatim API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📍 Nominatim returned:', data.length, 'results');

      // Format the response for the client
      const suggestions = data.map((item: any, index: number) => {
        const address = item.address || {};
        let mainText = '';
        let secondaryText = '';
        
        // Build main text (street address)
        if (address.house_number && address.road) {
          mainText = `${address.house_number} ${address.road}`;
        } else if (address.road) {
          mainText = address.road;
        } else if (address.neighbourhood) {
          mainText = address.neighbourhood;
        } else {
          mainText = item.display_name.split(',')[0];
        }
        
        // Build secondary text (city, state)
        const city = address.city || address.town || address.village;
        const state = address.state;
        if (city && state) {
          secondaryText = `${city}, ${state}`;
        } else if (state) {
          secondaryText = state;
        }
        
        return {
          place_id: item.place_id || `nominatim_${index}`,
          description: `${mainText}${secondaryText ? `, ${secondaryText}` : ''}`,
          main_text: mainText,
          secondary_text: secondaryText,
          coordinates: {
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon)
          }
        };
      });

      res.json(suggestions);
    } catch (error) {
      console.error('Location search error:', error);
      res.status(500).json({ 
        error: 'Failed to search locations',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Reverse geocoding endpoint
  app.get('/api/location/reverse', async (req, res) => {
    try {
      const { lat, lng } = req.query;
      
      if (!lat || !lng) {
        return res.status(400).json({ error: 'Latitude and longitude parameters are required' });
      }

      console.log('🔄 Reverse geocoding for:', lat, lng);

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'LocalPick/1.0 (reverse geocoding service)',
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Reverse geocoding error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('🏠 Reverse geocoding result:', data.display_name);

      const address = data.address || {};
      let streetAddress = '';
      
      if (address.house_number && address.road) {
        streetAddress = `${address.house_number} ${address.road}`;
      } else if (address.road) {
        streetAddress = address.road;
      } else if (address.neighbourhood) {
        streetAddress = address.neighbourhood;
      } else {
        streetAddress = data.display_name.split(',')[0];
      }

      res.json({
        address: streetAddress,
        full_address: data.display_name,
        coordinates: {
          lat: parseFloat(data.lat),
          lng: parseFloat(data.lon)
        }
      });
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      res.status(500).json({ 
        error: 'Failed to reverse geocode location',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}