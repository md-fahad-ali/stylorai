# Profile API Documentation

## Endpoints for Fetching User Profile

### 1. GET `/auth/me` (Recommended for Mobile/API)
**Authentication:** Required (JWT Bearer Token)

This endpoint returns the authenticated user's profile in JSON format.

#### Request Headers
```
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json
```

#### Response (Success - 200)
```json
{
  "user": {
    "id": 123,
    "email": "user@example.com",
    "full_name": "John Doe",
    "avatar": "https://lh3.googleusercontent.com/...",
    "google_id": "1234567890",
    "apple_id": null,
    "birthdate": "1990-01-15",
    "gender": "Male",
    "country": "Bangladesh",
    "created_at": "2025-12-28T10:30:00.000Z"
  }
}
```

#### Error Response (401 Unauthorized)
```json
{
  "error": "Unauthorized"
}
```

#### Example cURL Request
```bash
curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

#### Example JavaScript/Fetch Request
```javascript
const fetchProfile = async () => {
  const token = 'YOUR_ACCESS_TOKEN'; // Get from login response
  
  const response = await fetch('http://localhost:3000/auth/me', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  });
  
  const data = await response.json();
  
  if (response.ok) {
    console.log('User Profile:', data.user);
    return data.user;
  } else {
    console.error('Error:', data.error);
    throw new Error(data.error);
  }
};

// Usage
fetchProfile()
  .then(user => {
    console.log('Name:', user.full_name);
    console.log('Email:', user.email);
  })
  .catch(error => console.error(error));
```

---

### 2. GET `/user/profile` (Flexible - JSON or HTML)
**Authentication:** Optional (returns different responses based on auth state)

This endpoint can return either JSON or HTML based on the `Accept` header.

#### For JSON Response
**Request Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
Accept: application/json
```

**Response (Success - 200):**
```json
{
  "user": {
    "id": 123,
    "email": "user@example.com",
    "full_name": "John Doe",
    "avatar": "https://lh3.googleusercontent.com/...",
    "birthdate": "1990-01-15",
    "gender": "Male",
    "country": "Bangladesh"
  }
}
```

**Response (Not Authenticated):**
```json
{
  "message": "Not authenticated user"
}
```

#### Example cURL Request
```bash
curl -X GET http://localhost:3000/user/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Accept: application/json"
```

#### Example JavaScript/Fetch Request
```javascript
const fetchProfileFlexible = async () => {
  const token = 'YOUR_ACCESS_TOKEN';
  
  const response = await fetch('http://localhost:3000/user/profile', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json', // Important: Request JSON response
    }
  });
  
  const data = await response.json();
  return data;
};
```

---

## Update Profile

### POST `/user/profile/update`
**Authentication:** Required (JWT Bearer Token)

Update user profile information (birthdate, gender, country, avatar).

#### Request Headers
```
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json
```

#### Request Body
```json
{
  "birthdate": "1990-01-15",
  "gender": "Male",
  "country": "Bangladesh",
  "avatar": "https://example.com/avatar.jpg"
}
```

**Note:** All fields are optional. You can update one or more fields at a time.

#### Response (Success - 200)
```json
{
  "user": {
    "id": 123,
    "email": "user@example.com",
    "full_name": "John Doe",
    "avatar": "https://example.com/avatar.jpg",
    "birthdate": "1990-01-15",
    "gender": "Male",
    "country": "Bangladesh",
    "created_at": "2025-12-28T10:30:00.000Z"
  }
}
```

#### Error Responses

**401 Unauthorized:**
```json
{
  "error": "Unauthorized"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Failed to update profile"
}
```

#### Example cURL Request
```bash
curl -X POST http://localhost:3000/user/profile/update \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "birthdate": "1990-01-15",
    "gender": "Male",
    "country": "Bangladesh"
  }'
```

#### Example JavaScript/Fetch Request
```javascript
const updateProfile = async (profileData) => {
  const token = 'YOUR_ACCESS_TOKEN';
  
  const response = await fetch('http://localhost:3000/user/profile/update', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      birthdate: profileData.birthdate,
      gender: profileData.gender,
      country: profileData.country
    })
  });
  
  const data = await response.json();
  
  if (response.ok) {
    console.log('Profile updated successfully:', data.user);
    return data.user;
  } else {
    console.error('Update failed:', data.error);
    throw new Error(data.error);
  }
};

// Usage
updateProfile({
  birthdate: '1990-01-15',
  gender: 'Male',
  country: 'Bangladesh'
})
  .then(user => console.log('Updated user:', user))
  .catch(error => console.error(error));
```

---

## Complete Mobile App Flow Example

```javascript
class TailorAIClient {
  constructor() {
    this.baseURL = 'http://localhost:3000';
    this.accessToken = null;
    this.refreshToken = null;
  }

  // 1. Login with Google
  async loginWithGoogle(idToken) {
    const response = await fetch(`${this.baseURL}/auth/google/mobile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });
    
    const data = await response.json();
    if (response.ok) {
      this.accessToken = data.token;
      this.refreshToken = data.refreshToken;
      return data.user;
    }
    throw new Error(data.error);
  }

  // 2. Fetch Profile
  async getProfile() {
    const response = await fetch(`${this.baseURL}/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    if (response.ok) return data.user;
    throw new Error(data.error);
  }

  // 3. Update Profile
  async updateProfile(profileData) {
    const response = await fetch(`${this.baseURL}/user/profile/update`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(profileData)
    });
    
    const data = await response.json();
    if (response.ok) return data.user;
    throw new Error(data.error);
  }

  // 4. Submit Fashion DNA
  async submitFashionDNA(preferences) {
    const response = await fetch(`${this.baseURL}/fashion/dna`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preferences)
    });
    
    const data = await response.json();
    return data;
  }
}

// Usage Example
const client = new TailorAIClient();

// Login
const user = await client.loginWithGoogle('GOOGLE_ID_TOKEN');
console.log('Logged in:', user);

// Get Profile
const profile = await client.getProfile();
console.log('Profile:', profile);

// Update Profile
const updated = await client.updateProfile({
  birthdate: '1990-01-15',
  gender: 'Male',
  country: 'Bangladesh'
});
console.log('Updated:', updated);

// Submit Fashion DNA
const result = await client.submitFashionDNA({
  season: ['Spring'],
  style: ['Smart Casual'],
  preferencesColor: ['Neutrals'],
  bodyType: 'Athletic',
  skinTone: 'Light-Medium'
});
console.log('Fashion DNA submitted:', result);
```

---

## Key Differences Between Endpoints

| Endpoint | Authentication | Returns JSON | Use Case |
|----------|---------------|--------------|----------|
| `GET /auth/me` | **Required** (JWT) | ✅ Always | **Recommended for mobile/API** - Strict authentication |
| `GET /user/profile` | Optional | ✅ If `Accept: application/json` | Flexible - Can return HTML or JSON |
| `POST /user/profile/update` | **Required** (JWT) | ✅ Always | Update profile information |

---

## Notes

- **Access Token Expiry:** Access tokens expire in 15 minutes
- **Refresh Token:** Use `/auth/refresh` endpoint to get a new access token using the refresh token
- **Token Storage:** Store tokens securely (e.g., iOS Keychain, Android Keystore)
- **Error Handling:** Always check response status codes and handle errors appropriately
- **HTTPS:** In production, always use HTTPS for secure communication
