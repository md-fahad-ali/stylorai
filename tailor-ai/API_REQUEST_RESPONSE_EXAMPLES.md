# API Request & Response Examples

## 🔐 1. Google Login (Firebase)

### Request from Flutter App:

```json
POST /auth/google/mobile
Content-Type: application/json

{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjI3ZmE1MWY0ZTk3MjI5ZjRhYzI5YjE5ZjQwZDUxNmE3ZGJmNDJmNGQiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vdGFpbG9yYWktZjk4NzYiLCJhdWQiOiJ0YWlsb3JhaS1mOTg3NiIsImF1dGhfdGltZSI6MTcwNDAwMDAwMCwidXNlcl9pZCI6IkFCQzEyMzQ1NiIsInN1YiI6IkFCQzEyMzQ1NiIsImlhdCI6MTcwNDAwMDAwMCwiZXhwIjoxNzA0MDAzNjAwLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiZmlyZWJhc2UiOnsiaWRlbnRpdGllcyI6eyJnb29nbGUuY29tIjpbIjEwMjM0NTY3ODkwMTIzNDU2Nzg5Il0sImVtYWlsIjpbInVzZXJAZXhhbXBsZS5jb20iXX0sInNpZ25faW5fcHJvdmlkZXIiOiJnb29nbGUuY29tIn19.signature_here"
}
```

### Response from Backend:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIzLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJuYW1lIjoiSm9obiBEb2UiLCJpYXQiOjE3MDQwMDAwMDAsImV4cCI6MTcwNDAwMDkwMH0.signature",
  "refreshToken": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6",
  "user": {
    "id": 123,
    "google_id": "102345678901234567890",
    "email": "user@example.com",
    "full_name": "John Doe",
    "avatar": "https://lh3.googleusercontent.com/a/ACg8ocK...",
    "birthdate": null,
    "gender": null,
    "country": null,
    "created_at": "2025-12-29T10:30:00.000Z"
  }
}
```

---

## 👤 2. Get User Profile

### Request from Flutter App:

```json
GET /auth/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

### Response from Backend:

```json
{
  "user": {
    "id": 123,
    "google_id": "102345678901234567890",
    "email": "user@example.com",
    "full_name": "John Doe",
    "avatar": "https://lh3.googleusercontent.com/a/ACg8ocK...",
    "birthdate": "1990-01-15",
    "gender": "Male",
    "country": "Bangladesh",
    "created_at": "2025-12-29T10:30:00.000Z"
  }
}
```

---

## ✏️ 3. Update Profile

### Request from Flutter App:

```json
POST /user/profile/update
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "birthdate": "1990-01-15",
  "gender": "Male",
  "country": "Bangladesh"
}
```

### Response from Backend:

```json
{
  "user": {
    "id": 123,
    "google_id": "102345678901234567890",
    "email": "user@example.com",
    "full_name": "John Doe",
    "avatar": "https://lh3.googleusercontent.com/a/ACg8ocK...",
    "birthdate": "1990-01-15",
    "gender": "Male",
    "country": "Bangladesh",
    "created_at": "2025-12-29T10:30:00.000Z"
  }
}
```

---

## 📸 4. Upload Avatar

### Request from Flutter App:

```
POST /upload/avatar
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW

------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="file"; filename="avatar.jpg"
Content-Type: image/jpeg

[Binary image data here]
------WebKitFormBoundary7MA4YWxkTrZu0gW--
```

### Response from Backend:

```json
{
  "success": true,
  "message": "Avatar uploaded successfully",
  "user": {
    "id": 123,
    "google_id": "102345678901234567890",
    "email": "user@example.com",
    "full_name": "John Doe",
    "avatar": "/uploads/avatars/avatar_123_a1b2c3d4e5f6g7h8.jpg",
    "birthdate": "1990-01-15",
    "gender": "Male",
    "country": "Bangladesh",
    "created_at": "2025-12-29T10:30:00.000Z"
  },
  "avatarUrl": "/uploads/avatars/avatar_123_a1b2c3d4e5f6g7h8.jpg"
}
```

---

## 👗 5. Submit Fashion DNA

### Request from Flutter App:

```json
POST /fashion/dna
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "season": ["Spring", "Summer"],
  "style": ["Smart Casual", "Minimalist"],
  "preferencesColor": ["Neutrals", "Pastels"],
  "bodyType": "Athletic",
  "skinTone": "Light-Medium"
}
```

### Response from Backend:

```json
{
  "success": true,
  "message": "Fashion DNA preferences received and outfit image generated successfully",
  "userId": 123,
  "userEmail": "user@example.com",
  "receivedData": {
    "season": ["Spring", "Summer"],
    "style": ["Smart Casual", "Minimalist"],
    "preferencesColor": ["Neutrals", "Pastels"],
    "bodyType": "Athletic",
    "skinTone": "Light-Medium"
  },
  "generatedImage": {
    "url": "https://oaidalleapiprodscus.blob.core.windows.net/private/org-xxx/user-xxx/img-xxx.png?st=2025-12-29T10%3A30%3A00Z&se=2025-12-29T12%3A30%3A00Z&sp=r&sv=2021-08-06&sr=b&rscd=inline&rsct=image/png&skoid=xxx&sktid=xxx&skt=2025-12-29T10%3A30%3A00Z&ske=2025-12-30T10%3A30%3A00Z&sks=b&skv=2021-08-06&sig=xxx",
    "expiresIn": "2 hours"
  },
  "timestamp": "2025-12-29T10:30:00.000Z"
}
```

---

## 🔄 6. Refresh Token

### Request from Flutter App:

```json
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6"
}
```

### Response from Backend:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIzLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJuYW1lIjoiSm9obiBEb2UiLCJpYXQiOjE3MDQwMDM2MDAsImV4cCI6MTcwNDAwNDUwMH0.new_signature",
  "refreshToken": "z6y5x4w3v2u1t0s9r8q7p6o5n4m3l2k1j0i9h8g7f6e5d4c3b2a1"
}
```

---

## ❌ Error Responses

### 401 Unauthorized (Invalid/Expired Token):

```json
{
  "error": "Unauthorized"
}
```

### 400 Bad Request (Missing Fields):

```json
{
  "error": "Bad Request",
  "message": "Please provide fashion DNA preferences"
}
```

### 400 Bad Request (Invalid File Type):

```json
{
  "error": "Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed."
}
```

### 500 Internal Server Error:

```json
{
  "error": "Failed to update profile"
}
```

---

## 📱 Flutter Code Examples

### 1. Login Request:

```dart
final response = await http.post(
  Uri.parse('$baseUrl/auth/google/mobile'),
  headers: {'Content-Type': 'application/json'},
  body: jsonEncode({
    'idToken': firebaseIdToken,
  }),
);

final data = jsonDecode(response.body);
print('Access Token: ${data['token']}');
print('User: ${data['user']['email']}');
```

### 2. Get Profile Request:

```dart
final response = await http.get(
  Uri.parse('$baseUrl/auth/me'),
  headers: {
    'Authorization': 'Bearer $accessToken',
    'Content-Type': 'application/json',
  },
);

final data = jsonDecode(response.body);
print('User Name: ${data['user']['full_name']}');
```

### 3. Update Profile Request:

```dart
final response = await http.post(
  Uri.parse('$baseUrl/user/profile/update'),
  headers: {
    'Authorization': 'Bearer $accessToken',
    'Content-Type': 'application/json',
  },
  body: jsonEncode({
    'birthdate': '1990-01-15',
    'gender': 'Male',
    'country': 'Bangladesh',
  }),
);

final data = jsonDecode(response.body);
print('Updated User: ${data['user']}');
```

### 4. Upload Avatar Request:

```dart
var request = http.MultipartRequest(
  'POST',
  Uri.parse('$baseUrl/upload/avatar'),
);

request.headers['Authorization'] = 'Bearer $accessToken';
request.files.add(
  await http.MultipartFile.fromPath('file', imageFile.path),
);

var streamedResponse = await request.send();
var response = await http.Response.fromStream(streamedResponse);
final data = jsonDecode(response.body);

print('Avatar URL: ${data['avatarUrl']}');
```

### 5. Submit Fashion DNA Request:

```dart
final response = await http.post(
  Uri.parse('$baseUrl/fashion/dna'),
  headers: {
    'Authorization': 'Bearer $accessToken',
    'Content-Type': 'application/json',
  },
  body: jsonEncode({
    'season': ['Spring'],
    'style': ['Smart Casual'],
    'preferencesColor': ['Neutrals'],
    'bodyType': 'Athletic',
    'skinTone': 'Light-Medium',
  }),
);

final data = jsonDecode(response.body);
print('Generated Image: ${data['generatedImage']['url']}');
```

---

## 📊 Request/Response Summary Table

| Endpoint | Method | Request Body | Response Fields |
|----------|--------|--------------|-----------------|
| `/auth/google/mobile` | POST | `{ idToken }` | `token, refreshToken, user` |
| `/auth/me` | GET | None | `user` |
| `/user/profile/update` | POST | `{ birthdate, gender, country, avatar }` | `user` |
| `/upload/avatar` | POST | `multipart/form-data` | `success, user, avatarUrl` |
| `/fashion/dna` | POST | `{ season, style, preferencesColor, bodyType, skinTone }` | `success, generatedImage, receivedData` |
| `/auth/refresh` | POST | `{ refreshToken }` | `token, refreshToken` |

---

## 🔑 Important Notes

1. **Authorization Header**: সব protected endpoints এ `Authorization: Bearer {token}` header লাগবে
2. **Content-Type**: JSON requests এ `Content-Type: application/json` লাগবে
3. **Token Expiry**: Access token 15 minutes পর expire হয়, তখন refresh token use করতে হবে
4. **Image URL**: Generated outfit images 2 hours পর expire হয়
5. **Avatar URL**: Uploaded avatars permanent, full URL: `http://YOUR_SERVER_IP:3000/uploads/avatars/...`
