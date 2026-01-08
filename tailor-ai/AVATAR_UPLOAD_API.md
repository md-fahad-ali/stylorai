# Avatar Upload API Documentation

## Upload Avatar Image

### POST `/upload/avatar`
**Authentication:** Required (JWT Bearer Token)

Upload a profile picture/avatar image. The image will be saved to the server's local storage and the avatar URL will be automatically updated in the user's profile.

#### Request Headers
```
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: multipart/form-data
```

#### Request Body (Form Data)
- **file**: Image file (JPEG, PNG, GIF, WebP)
- **Max file size**: 5MB

#### Response (Success - 200)
```json
{
  "success": true,
  "message": "Avatar uploaded successfully",
  "user": {
    "id": 123,
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

#### Error Responses

**401 Unauthorized:**
```json
{
  "error": "Unauthorized"
}
```

**400 Bad Request (No file):**
```json
{
  "error": "No file uploaded"
}
```

**400 Bad Request (Invalid file type):**
```json
{
  "error": "Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed."
}
```

**500 Internal Server Error:**
```json
{
  "error": "Failed to upload avatar"
}
```

---

## Flutter/Mobile Implementation

### Example: Upload Avatar from Flutter App

```dart
import 'package:image_picker/image_picker.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:io';

class ProfileService {
  final String baseUrl = 'http://localhost:3000';
  String? accessToken;

  // Pick and upload avatar
  Future<Map<String, dynamic>?> uploadAvatar() async {
    try {
      // 1. Pick image from gallery
      final ImagePicker picker = ImagePicker();
      final XFile? image = await picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 85,
      );

      if (image == null) {
        print('No image selected');
        return null;
      }

      // 2. Create multipart request
      var request = http.MultipartRequest(
        'POST',
        Uri.parse('$baseUrl/upload/avatar'),
      );

      // 3. Add authorization header
      request.headers['Authorization'] = 'Bearer $accessToken';

      // 4. Add the image file
      request.files.add(
        await http.MultipartFile.fromPath(
          'file', // This must match the field name in backend
          image.path,
        ),
      );

      // 5. Send request
      var streamedResponse = await request.send();
      var response = await http.Response.fromStream(streamedResponse);

      // 6. Handle response
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        print('✅ Avatar uploaded successfully!');
        print('Avatar URL: ${data['avatarUrl']}');
        return data;
      } else {
        final error = jsonDecode(response.body);
        print('❌ Upload failed: ${error['error']}');
        return null;
      }
    } catch (e) {
      print('❌ Error uploading avatar: $e');
      return null;
    }
  }

  // Get full avatar URL for display
  String getAvatarUrl(String? avatarPath) {
    if (avatarPath == null || avatarPath.isEmpty) {
      return 'https://ui-avatars.com/api/?name=User';
    }
    // If it's a relative path, prepend base URL
    if (avatarPath.startsWith('/uploads/')) {
      return '$baseUrl$avatarPath';
    }
    return avatarPath;
  }
}

// Usage Example
void main() async {
  final profileService = ProfileService();
  profileService.accessToken = 'YOUR_JWT_TOKEN';

  // Upload avatar
  final result = await profileService.uploadAvatar();
  
  if (result != null) {
    final user = result['user'];
    final avatarUrl = profileService.getAvatarUrl(user['avatar']);
    print('Display avatar from: $avatarUrl');
  }
}
```

### Complete Flutter Widget Example

```dart
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

class ProfileAvatarWidget extends StatefulWidget {
  @override
  _ProfileAvatarWidgetState createState() => _ProfileAvatarWidgetState();
}

class _ProfileAvatarWidgetState extends State<ProfileAvatarWidget> {
  String? avatarUrl;
  bool isUploading = false;

  Future<void> _pickAndUploadAvatar() async {
    setState(() => isUploading = true);

    try {
      final ImagePicker picker = ImagePicker();
      final XFile? image = await picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 85,
      );

      if (image == null) {
        setState(() => isUploading = false);
        return;
      }

      // Upload logic here (use ProfileService from above)
      final profileService = ProfileService();
      final result = await profileService.uploadAvatar();

      if (result != null) {
        setState(() {
          avatarUrl = profileService.getAvatarUrl(result['user']['avatar']);
        });
        
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Avatar updated successfully!')),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to upload avatar')),
      );
    } finally {
      setState(() => isUploading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        CircleAvatar(
          radius: 60,
          backgroundImage: avatarUrl != null
              ? NetworkImage(avatarUrl!)
              : AssetImage('assets/default_avatar.png') as ImageProvider,
        ),
        Positioned(
          bottom: 0,
          right: 0,
          child: GestureDetector(
            onTap: isUploading ? null : _pickAndUploadAvatar,
            child: Container(
              padding: EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.blue,
                shape: BoxShape.circle,
              ),
              child: isUploading
                  ? SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        color: Colors.white,
                        strokeWidth: 2,
                      ),
                    )
                  : Icon(Icons.camera_alt, color: Colors.white, size: 20),
            ),
          ),
        ),
      ],
    );
  }
}
```

---

## How It Works

1. **User selects image** from gallery/camera in mobile app
2. **App sends multipart/form-data** request to `/upload/avatar`
3. **Backend validates** file type and size
4. **Backend generates unique filename** to prevent conflicts
5. **Backend saves file** to `uploads/avatars/` directory
6. **Backend updates database** with avatar URL
7. **Backend returns** updated user profile with new avatar URL
8. **App displays** the new avatar using the returned URL

## File Storage

- **Location**: `uploads/avatars/`
- **Filename format**: `avatar_{userId}_{randomHash}.{extension}`
- **Example**: `avatar_123_a1b2c3d4e5f6g7h8.jpg`
- **Access URL**: `http://localhost:3000/uploads/avatars/avatar_123_a1b2c3d4e5f6g7h8.jpg`

## Supported File Types

✅ JPEG (.jpg, .jpeg)  
✅ PNG (.png)  
✅ GIF (.gif)  
✅ WebP (.webp)  

## File Size Limit

- **Maximum**: 5MB per file
- Files larger than 5MB will be rejected

## Security Features

✅ **JWT Authentication** - Only authenticated users can upload  
✅ **File type validation** - Only image files allowed  
✅ **File size limit** - Prevents large file uploads  
✅ **Unique filenames** - Prevents file conflicts  
✅ **User-specific** - Each user can only update their own avatar  

---

## Testing with Postman

1. **Login** to get JWT token
2. **Copy the token** to `{{jwtToken}}` variable
3. **Select "Upload Avatar (Image File)"** request
4. **Click on "Body" tab** → "form-data"
5. **Select "file"** and choose an image file
6. **Send request**
7. **Check response** for avatar URL

The uploaded image will be accessible at:
```
http://localhost:3000/uploads/avatars/avatar_123_xxxxx.jpg
```

---

## Notes

- Avatar URL is automatically updated in the database
- Old avatar files are NOT automatically deleted (you may want to implement cleanup)
- Images are served as static files via `/uploads/` prefix
- For production, consider using cloud storage (S3, Cloudinary, etc.)
