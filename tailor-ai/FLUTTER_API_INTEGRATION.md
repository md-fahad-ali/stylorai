# Flutter App + TailorAI Backend Integration

## 🔄 Complete API Integration Flow

আপনার Flutter app এবং TailorAI backend এর মধ্যে এভাবে communication হবে:

---

## 1️⃣ Google Login Flow

```
Flutter App                          TailorAI Backend
    |                                      |
    |  1. User clicks "Sign in"           |
    |------------------------------------>|
    |                                      |
    |  2. Google Sign-In Dialog           |
    |  (User selects account)             |
    |                                      |
    |  3. Get ID Token from Google        |
    |                                      |
    |  POST /auth/google/mobile            |
    |  { "idToken": "xxx..." }            |
    |------------------------------------>|
    |                                      |
    |                                      | 4. Verify token with Google
    |                                      | 5. Create/Find user in DB
    |                                      | 6. Generate JWT tokens
    |                                      |
    |  Response:                           |
    |  {                                   |
    |    "token": "jwt_access_token",     |
    |    "refreshToken": "refresh_xxx",   |
    |    "user": { ... }                  |
    |  }                                   |
    |<------------------------------------|
    |                                      |
    |  7. Save tokens locally              |
    |  8. Navigate to Home                 |
```

---

## 2️⃣ Get User Profile

```
Flutter App                          TailorAI Backend
    |                                      |
    |  GET /auth/me                        |
    |  Headers:                            |
    |    Authorization: Bearer {token}     |
    |------------------------------------>|
    |                                      |
    |                                      | Verify JWT token
    |                                      | Fetch user from DB
    |                                      |
    |  Response:                           |
    |  {                                   |
    |    "user": {                         |
    |      "id": 123,                      |
    |      "email": "user@gmail.com",      |
    |      "full_name": "John Doe",        |
    |      "avatar": "/uploads/...",       |
    |      "birthdate": "1990-01-15",      |
    |      "gender": "Male",               |
    |      "country": "Bangladesh"         |
    |    }                                 |
    |  }                                   |
    |<------------------------------------|
```

---

## 3️⃣ Update Profile

```
Flutter App                          TailorAI Backend
    |                                      |
    |  POST /user/profile/update           |
    |  Headers:                            |
    |    Authorization: Bearer {token}     |
    |  Body:                               |
    |  {                                   |
    |    "birthdate": "1990-01-15",       |
    |    "gender": "Male",                |
    |    "country": "Bangladesh"          |
    |  }                                   |
    |------------------------------------>|
    |                                      |
    |                                      | Verify JWT token
    |                                      | Update user in DB
    |                                      |
    |  Response:                           |
    |  {                                   |
    |    "user": { ...updated data... }   |
    |  }                                   |
    |<------------------------------------|
```

---

## 4️⃣ Upload Avatar

```
Flutter App                          TailorAI Backend
    |                                      |
    |  POST /upload/avatar                 |
    |  Headers:                            |
    |    Authorization: Bearer {token}     |
    |  Body: multipart/form-data           |
    |    file: [image binary]              |
    |------------------------------------>|
    |                                      |
    |                                      | Verify JWT token
    |                                      | Save image to uploads/avatars/
    |                                      | Update user.avatar in DB
    |                                      |
    |  Response:                           |
    |  {                                   |
    |    "success": true,                  |
    |    "avatarUrl": "/uploads/...",     |
    |    "user": { ...updated data... }   |
    |  }                                   |
    |<------------------------------------|
```

---

## 5️⃣ Submit Fashion DNA

```
Flutter App                          TailorAI Backend
    |                                      |
    |  POST /fashion/dna                   |
    |  Headers:                            |
    |    Authorization: Bearer {token}     |
    |  Body:                               |
    |  {                                   |
    |    "season": ["Spring"],            |
    |    "style": ["Smart Casual"],       |
    |    "preferencesColor": ["Neutrals"],|
    |    "bodyType": "Athletic",          |
    |    "skinTone": "Light-Medium"       |
    |  }                                   |
    |------------------------------------>|
    |                                      |
    |                                      | Verify JWT token
    |                                      | Generate outfit image (DALL-E)
    |                                      | Save to database (future)
    |                                      |
    |  Response:                           |
    |  {                                   |
    |    "success": true,                  |
    |    "generatedImage": {               |
    |      "url": "https://...",          |
    |      "expiresIn": "2 hours"         |
    |    },                                |
    |    "receivedData": { ... }          |
    |  }                                   |
    |<------------------------------------|
```

---

## 📱 Complete Flutter Service Class

এই একটা service class দিয়ে সব API call করতে পারবেন:

```dart
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:io';
import 'package:shared_preferences/shared_preferences.dart';

class TailorAIService {
  // আপনার backend URL
  static const String baseUrl = 'http://YOUR_SERVER_IP:3000';
  
  // Get saved access token
  Future<String?> _getAccessToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('access_token');
  }

  // ==========================================
  // 1. GET USER PROFILE
  // ==========================================
  Future<Map<String, dynamic>?> getUserProfile() async {
    try {
      final token = await _getAccessToken();
      if (token == null) return null;

      final response = await http.get(
        Uri.parse('$baseUrl/auth/me'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['user'];
      }
      return null;
    } catch (e) {
      print('Error getting profile: $e');
      return null;
    }
  }

  // ==========================================
  // 2. UPDATE PROFILE
  // ==========================================
  Future<Map<String, dynamic>?> updateProfile({
    String? birthdate,
    String? gender,
    String? country,
    String? avatar,
  }) async {
    try {
      final token = await _getAccessToken();
      if (token == null) return null;

      final body = <String, dynamic>{};
      if (birthdate != null) body['birthdate'] = birthdate;
      if (gender != null) body['gender'] = gender;
      if (country != null) body['country'] = country;
      if (avatar != null) body['avatar'] = avatar;

      final response = await http.post(
        Uri.parse('$baseUrl/user/profile/update'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: jsonEncode(body),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['user'];
      }
      return null;
    } catch (e) {
      print('Error updating profile: $e');
      return null;
    }
  }

  // ==========================================
  // 3. UPLOAD AVATAR
  // ==========================================
  Future<Map<String, dynamic>?> uploadAvatar(File imageFile) async {
    try {
      final token = await _getAccessToken();
      if (token == null) return null;

      var request = http.MultipartRequest(
        'POST',
        Uri.parse('$baseUrl/upload/avatar'),
      );

      // Add authorization header
      request.headers['Authorization'] = 'Bearer $token';

      // Add image file
      request.files.add(
        await http.MultipartFile.fromPath('file', imageFile.path),
      );

      // Send request
      var streamedResponse = await request.send();
      var response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
      return null;
    } catch (e) {
      print('Error uploading avatar: $e');
      return null;
    }
  }

  // ==========================================
  // 4. SUBMIT FASHION DNA
  // ==========================================
  Future<Map<String, dynamic>?> submitFashionDNA({
    required List<String> season,
    required List<String> style,
    required List<String> preferencesColor,
    required String bodyType,
    required String skinTone,
  }) async {
    try {
      final token = await _getAccessToken();
      if (token == null) return null;

      final response = await http.post(
        Uri.parse('$baseUrl/fashion/dna'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'season': season,
          'style': style,
          'preferencesColor': preferencesColor,
          'bodyType': bodyType,
          'skinTone': skinTone,
        }),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
      return null;
    } catch (e) {
      print('Error submitting fashion DNA: $e');
      return null;
    }
  }

  // ==========================================
  // 5. REFRESH TOKEN
  // ==========================================
  Future<bool> refreshAccessToken() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final refreshToken = prefs.getString('refresh_token');
      
      if (refreshToken == null) return false;

      final response = await http.post(
        Uri.parse('$baseUrl/auth/refresh'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'refreshToken': refreshToken}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        await prefs.setString('access_token', data['token']);
        await prefs.setString('refresh_token', data['refreshToken']);
        return true;
      }
      return false;
    } catch (e) {
      print('Error refreshing token: $e');
      return false;
    }
  }

  // ==========================================
  // HELPER: Get full avatar URL
  // ==========================================
  String getAvatarUrl(String? avatarPath) {
    if (avatarPath == null || avatarPath.isEmpty) {
      return 'https://ui-avatars.com/api/?name=User';
    }
    if (avatarPath.startsWith('/uploads/')) {
      return '$baseUrl$avatarPath';
    }
    return avatarPath;
  }
}
```

---

## 🎯 Usage Examples

### Example 1: Get and Display Profile

```dart
final service = TailorAIService();

// Get profile
final profile = await service.getUserProfile();

if (profile != null) {
  print('Name: ${profile['full_name']}');
  print('Email: ${profile['email']}');
  
  // Display avatar
  final avatarUrl = service.getAvatarUrl(profile['avatar']);
  // Use avatarUrl in Image.network(avatarUrl)
}
```

### Example 2: Update Profile

```dart
final service = TailorAIService();

// Update profile
final updatedProfile = await service.updateProfile(
  birthdate: '1990-01-15',
  gender: 'Male',
  country: 'Bangladesh',
);

if (updatedProfile != null) {
  print('Profile updated successfully!');
}
```

### Example 3: Upload Avatar

```dart
import 'package:image_picker/image_picker.dart';

final service = TailorAIService();
final picker = ImagePicker();

// Pick image
final XFile? image = await picker.pickImage(source: ImageSource.gallery);

if (image != null) {
  // Upload avatar
  final result = await service.uploadAvatar(File(image.path));
  
  if (result != null) {
    print('Avatar uploaded!');
    print('New avatar URL: ${result['avatarUrl']}');
  }
}
```

### Example 4: Submit Fashion DNA

```dart
final service = TailorAIService();

// Submit fashion preferences
final result = await service.submitFashionDNA(
  season: ['Spring'],
  style: ['Smart Casual'],
  preferencesColor: ['Neutrals'],
  bodyType: 'Athletic',
  skinTone: 'Light-Medium',
);

if (result != null && result['generatedImage'] != null) {
  final imageUrl = result['generatedImage']['url'];
  print('Generated outfit image: $imageUrl');
  
  // Display image
  // Image.network(imageUrl)
}
```

---

## 🔐 Authentication Flow

```dart
// 1. Login করার পর tokens save হয়
await AuthService().signInWithGoogle();

// 2. এখন সব API call automatically token সহ হবে
final profile = await TailorAIService().getUserProfile();

// 3. Token expire হলে refresh করুন
if (profile == null) {
  final refreshed = await TailorAIService().refreshAccessToken();
  if (refreshed) {
    // Retry the API call
    final profile = await TailorAIService().getUserProfile();
  }
}
```

---

## 📊 API Endpoints Summary

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/auth/google/mobile` | POST | Google login | ❌ No |
| `/auth/me` | GET | Get profile | ✅ Yes |
| `/auth/refresh` | POST | Refresh token | ❌ No |
| `/user/profile/update` | POST | Update profile | ✅ Yes |
| `/upload/avatar` | POST | Upload avatar | ✅ Yes |
| `/fashion/dna` | POST | Submit fashion DNA | ✅ Yes |

---

## 🚀 Complete App Structure

```
lib/
├── main.dart                    # App entry point
├── screens/
│   ├── splash_screen.dart       # Check login status
│   ├── login_screen.dart        # Google login
│   ├── home_screen.dart         # Profile display
│   ├── profile_edit_screen.dart # Edit profile
│   └── fashion_dna_screen.dart  # Fashion preferences
├── services/
│   ├── auth_service.dart        # Google login logic
│   └── tailorai_service.dart    # All API calls
└── models/
    ├── user_model.dart          # User data model
    └── fashion_dna_model.dart   # Fashion DNA model
```

---

## ✅ Summary

আপনার Flutter app এবং TailorAI backend এর মধ্যে integration খুবই straightforward:

1. **Login**: Google Sign-In → Get ID Token → Send to backend → Get JWT tokens
2. **API Calls**: Always include `Authorization: Bearer {token}` header
3. **Data Flow**: Flutter → HTTP Request → Backend → Database → Response → Flutter
4. **Token Management**: Save tokens locally, refresh when expired

এখন আপনি `TailorAIService` class টা use করে সব API call করতে পারবেন! 🎉
