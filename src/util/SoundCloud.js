const clientId = 'puarEC3OXso3dwnE66BNAm6nWe5QhqoD'; // Insert client ID here.
const clientSecret = '...';
const redirectUri = 'http://localhost:3000/'; // Have to add this to your accepted Spotify redirect URIs on the Spotify API.
let accessToken;

function generateByte() {
  const byteArray = crypto.getRandomValues(new Uint8Array(32));
  const byteToString = String.fromCharCode(...byteArray);
  //const byteToString = Array.from(byteArray, (byte) => String.fromCharCode(byte)).join('');
  return btoa(byteToString).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hashString(string) {
  const encoder = new TextEncoder();
  const stringToByte = encoder.encode(string);
  const hash = await crypto.subtle.digest('SHA-256', stringToByte);
  const hashToString = String.fromCharCode(...new Uint8Array(hash));
  return btoa(hashToString).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const SoundCloud = {
  async getAccessToken() {
    if (accessToken) {
      return accessToken;
    }
    
    //secure code and state from url
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const receivedState = urlParams.get('state');

    //(yes code)get token or (no code)get authorization code
    if (code) {
      //secure state from session storage
      const savedState = sessionStorage.getItem('oauth_state');
      //cleanup
      sessionStorage.removeItem('oauth_state');
      //state comparison
      if (!receivedState || receivedState !== savedState) {
        throw new Error("State mismatch! Possible CSRF attack or session timeout.")
      }

      //secure verifier from session storage
      const verifier = sessionStorage.getItem('pkce_verifier');
      //clean up
      sessionStorage.removeItem('pkce_verifier');
      //verifier comparison
      if (!verifier) {
          throw new Error("PKCE verifier not found. Possible CSRF or session timeout.");
      }

      return await this.exchangeCodeForToken(code, verifier);
    } else {
      //generate PKCE pair
      const verifier = generateByte();
      const state = generateByte();
      const challenge = await hashString(verifier);
      
      //save pair to session
      sessionStorage.setItem('pkce_verifier', verifier);
      sessionStorage.setItem('oauth_state', state);

      //to authorization
      const accessUrl = `https://secure.soundcloud.com/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&code_challenge=${challenge}&code_challenge_method=S256&state=${state}`;
      window.location = accessUrl;
    }
  },

  async exchangeCodeForToken(code, verifier) {
    const url = "https://secure.soundcloud.com/oauth/token";
    
    const payload = {
        method: 'POST',
        headers: {
            'accept': 'application/json; charset=utf-8',
            'Content-Type': 'application/x-www-form-urlencoded'
            
        },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: clientId, // Your registered Spotify Client ID
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            code_verifier: verifier, // The secret verifier from sessionStorage
            code: code,
        }),
    };

    try {
      const response = await fetch(url, payload);
      if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      // Save the results
      accessToken = data.access_token;
      const expiresIn = data.expires_in;

      // Set expiration timer
      window.setTimeout(() => accessToken = '', expiresIn * 1000);
      
      // Optional: Store Refresh Token for later use
      if (data.refresh_token) {
        sessionStorage.setItem('soundcloud_refresh_token', data.refresh_token);
      }

      // Clean up the URL
      window.history.pushState('Access Token', null, '/');
      
      return accessToken;
    } catch (error) {
        console.error('Error exchanging code for token:', error);
    }
  },

  async search(term) {
    const accessToken = await this.getAccessToken();
    if (!accessToken) return [];

    return fetch(`https://api.soundcloud.com/tracks?q=${term}&access=playable&limit=5&linked_partitioning=true`, {
      headers: {
        'accept': 'application/json; charset=utf-8',
        'Authorization': `OAuth ${accessToken}`
      }
    }).then(response => {
      return response.json();
    }).then(jsonResponse => {
      if (!jsonResponse.collection) {
        return [];
      }
      return jsonResponse.collection.map(track => ({
        id: track.id,
        name: track.title,
        artist: track.metadata_artist,
        urn: track.urn,
        cover: track.artwork_url,
      }))
    });
  },

  savePlaylist(name, trackUris) {
    if (!name || !trackUris.length) {
      return;
    }

    const accessToken = Spotify.getAccessToken();
    const headers = { Authorization: `Bearer ${accessToken}` };
    let userId;

    return fetch('https://api.spotify.com/v1/me', {headers: headers}
    ).then(response => response.json()
    ).then(jsonResponse => {
      userId = jsonResponse.id;
      return fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
        headers: headers,
        method: 'POST',
        body: JSON.stringify({name: name})
      }).then(response => response.json()
      ).then(jsonResponse => {
        const playlistId = jsonResponse.id;
        return fetch(`https://api.spotify.com/v1/users/${userId}/playlists/${playlistId}/tracks`, {
          headers: headers,
          method: 'POST',
          body: JSON.stringify({uris: trackUris})
        });
      });
    });
  }
};

export default SoundCloud;
