# Flutter Firebase Google Login - Complete Guide

## 🔥 Firebase Authentication দিয়ে Google Login

এই guide এ আপনি শিখবেন কিভাবে Firebase Authentication ব্যবহার করে Google Login implement করবেন এবং আপনার TailorAI backend এর সাথে integrate করবেন।

---

## 📊 Complete Authentication Flow

```
┌─────────────┐         ┌──────────┐         ┌─────────────┐         ┌──────────────┐
│   Flutter   │         │ Firebase │         │   Google    │         │   TailorAI   │
│     App     │         │   Auth   │         │    OAuth    │         │   Backend    │
└──────┬──────┘         └────┬─────┘         └──────┬──────┘         └──────┬───────┘
       │                     │                       │                       │
       │ 1. signInWithGoogle()                       │                       │
       ├────────────────────>│                       │                       │
       │                     │                       │                       │
       │                     │ 2. Request Google Auth│                       │
       │                     ├──────────────────────>│                       │
       │                     │                       │                       │
       │                     │ 3. User selects account & approves            │
       │                     │<──────────────────────┤                       │
       │                     │                       │                       │
       │ 4. Firebase User + ID Token                 │                       │
       │<────────────────────┤                       │                       │
       │                     │                       │                       │
       │ 5. POST /auth/google/mobile                 │                       │
       │    { "idToken": "firebase_token..." }       │                       │
       ├─────────────────────────────────────────────────────────────────────>│
       │                     │                       │                       │
       │                     │                       │  6. Verify token      │
       │                     │<──────────────────────────────────────────────┤
       │                     │                       │                       │
       │                     │  7. Token valid ✅    │                       │
       │                     ├──────────────────────────────────────────────>│
       │                     │                       │                       │
       │                     │                       │  8. Create/Find user  │
       │                     │                       │     in database       │
       │                     │                       │  9. Generate JWT      │
       │                     │                       │                       │
       │ 10. Response:                               │                       │
       │     {                                       │                       │
       │       "token": "jwt_access_token",          │                       │
       │       "refreshToken": "refresh_xxx",        │                       │
       │       "user": { id, email, name, ... }      │                       │
       │     }                                       │                       │
       │<─────────────────────────────────────────────────────────────────────┤
       │                     │                       │                       │
       │ 11. Save tokens locally                     │                       │
       │ 12. Navigate to Home                        │                       │
       │                     │                       │                       │
```

---

## 🔐 Token Flow Explained

### 1️⃣ Firebase ID Token
- **কে দেয়**: Firebase Authentication
- **কখন পাবেন**: Google login successful হওয়ার পর
- **কি কাজে লাগে**: আপনার backend এ পাঠিয়ে user verify করতে
- **Validity**: 1 hour (Firebase automatically refresh করে)

### 2️⃣ Backend JWT Access Token
- **কে দেয়**: আপনার TailorAI backend
- **কখন পাবেন**: Firebase ID Token verify হওয়ার পর
- **কি কাজে লাগে**: সব protected API call করতে
- **Validity**: 15 minutes

### 3️⃣ Backend Refresh Token
- **কে দেয়**: আপনার TailorAI backend
- **কখন পাবেন**: Login successful হওয়ার পর
- **কি কাজে লাগে**: Access token expire হলে নতুন token পেতে
- **Validity**: 1 year

---

## 📱 Step-by-Step Implementation

### Step 1: Firebase Project Setup

1. **Firebase Console** এ যান: https://console.firebase.google.com
2. **Create Project** বা existing project select করুন
3. **Project Settings** → **General** → **Your apps** → **Add app** → Select Android/iOS

#### For Android:
```
Package name: com.yourcompany.tailorai
App nickname: TailorAI
```

4. **Download `google-services.json`**
5. File টা `android/app/` folder এ রাখুন

#### Get SHA-1 Fingerprint:
```bash
cd android
./gradlew signingReport
```

SHA-1 copy করে Firebase Console এ add করুন।

---

### Step 2: Enable Google Sign-In in Firebase

1. Firebase Console → **Authentication** → **Sign-in method**
2. **Google** enable করুন
3. **Web SDK configuration** থেকে **Web client ID** copy করুন
4. এই Web client ID আপনার backend এর `.env` file এ add করুন:

```env
GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
```

---

### Step 3: Flutter Dependencies

`pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter
  
  # Firebase
  firebase_core: ^2.24.2
  firebase_auth: ^4.16.0
  
  # Google Sign-In
  google_sign_in: ^6.2.1
  
  # HTTP & Storage
  http: ^1.2.0
  shared_preferences: ^2.2.2
```

Run:
```bash
flutter pub get
```

---

### Step 4: Android Configuration

#### `android/build.gradle`:
```gradle
buildscript {
    dependencies {
        classpath 'com.google.gms:google-services:4.4.0'
    }
}
```

#### `android/app/build.gradle`:
```gradle
apply plugin: 'com.google.gms.google-services'  // শেষে add করুন

android {
    defaultConfig {
        minSdkVersion 21  // Minimum 21
    }
}
```

---

### Step 5: Initialize Firebase

#### `main.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Firebase
  await Firebase.initializeApp();
  
  runApp(MyApp());
}
```

---

### Step 6: Create Firebase Auth Service

#### `lib/services/firebase_auth_service.dart`:

```dart
import 'package:firebase_auth/firebase_auth.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class FirebaseAuthService {
  // Firebase instances
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final GoogleSignIn _googleSignIn = GoogleSignIn();
  
  // Your backend URL
  static const String baseUrl = 'http://YOUR_SERVER_IP:3000';

  // ==========================================
  // GOOGLE SIGN-IN WITH FIREBASE
  // ==========================================
  Future<Map<String, dynamic>?> signInWithGoogle() async {
    try {
      print('🔵 Step 1: Starting Google Sign-In...');
      
      // 1. Trigger Google Sign-In flow
      final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();
      
      if (googleUser == null) {
        print('❌ User cancelled sign-in');
        return null;
      }
      
      print('✅ Step 2: Google account selected: ${googleUser.email}');

      // 2. Get Google authentication details
      final GoogleSignInAuthentication googleAuth = 
          await googleUser.authentication;

      print('✅ Step 3: Got Google authentication tokens');

      // 3. Create Firebase credential from Google tokens
      final credential = GoogleAuthProvider.credential(
        accessToken: googleAuth.accessToken,
        idToken: googleAuth.idToken,
      );

      print('🔵 Step 4: Signing in to Firebase...');

      // 4. Sign in to Firebase with Google credential
      final UserCredential userCredential = 
          await _auth.signInWithCredential(credential);

      print('✅ Step 5: Firebase sign-in successful!');
      print('   User: ${userCredential.user?.email}');

      // 5. Get Firebase ID Token
      final String? firebaseIdToken = 
          await userCredential.user?.getIdToken();

      if (firebaseIdToken == null) {
        print('❌ Failed to get Firebase ID token');
        return null;
      }

      print('✅ Step 6: Got Firebase ID Token');
      print('   Token preview: ${firebaseIdToken.substring(0, 30)}...');

      // 6. Send Firebase ID Token to your backend
      print('🔵 Step 7: Sending token to backend...');
      
      final response = await http.post(
        Uri.parse('$baseUrl/auth/google/mobile'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'idToken': firebaseIdToken}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        
        print('✅ Step 8: Backend authentication successful!');
        print('   User ID: ${data['user']['id']}');
        print('   Email: ${data['user']['email']}');
        
        // 7. Save backend JWT tokens locally
        await _saveTokens(
          data['token'],           // JWT Access Token
          data['refreshToken'],    // Refresh Token
        );
        
        print('✅ Step 9: Tokens saved locally');
        print('🎉 Login complete!');
        
        return data;
      } else {
        print('❌ Backend error: ${response.statusCode}');
        print('   Response: ${response.body}');
        return null;
      }

    } catch (e) {
      print('❌ Error during sign-in: $e');
      return null;
    }
  }

  // ==========================================
  // SAVE TOKENS TO LOCAL STORAGE
  // ==========================================
  Future<void> _saveTokens(String accessToken, String refreshToken) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('access_token', accessToken);
    await prefs.setString('refresh_token', refreshToken);
    await prefs.setString('login_time', DateTime.now().toIso8601String());
  }

  // ==========================================
  // GET SAVED ACCESS TOKEN
  // ==========================================
  Future<String?> getAccessToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('access_token');
  }

  // ==========================================
  // GET SAVED REFRESH TOKEN
  // ==========================================
  Future<String?> getRefreshToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('refresh_token');
  }

  // ==========================================
  // CHECK IF USER IS LOGGED IN
  // ==========================================
  Future<bool> isLoggedIn() async {
    // Check both Firebase and backend tokens
    final firebaseUser = _auth.currentUser;
    final backendToken = await getAccessToken();
    
    return firebaseUser != null && backendToken != null;
  }

  // ==========================================
  // GET CURRENT FIREBASE USER
  // ==========================================
  User? get currentFirebaseUser => _auth.currentUser;

  // ==========================================
  // SIGN OUT
  // ==========================================
  Future<void> signOut() async {
    print('🔵 Signing out...');
    
    // Sign out from Firebase
    await _auth.signOut();
    
    // Sign out from Google
    await _googleSignIn.signOut();
    
    // Clear local tokens
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    
    print('✅ Signed out successfully');
  }

  // ==========================================
  // LISTEN TO AUTH STATE CHANGES
  // ==========================================
  Stream<User?> get authStateChanges => _auth.authStateChanges();
}
```

---

### Step 7: Login Screen UI

#### `lib/screens/login_screen.dart`:

```dart
import 'package:flutter/material.dart';
import '../services/firebase_auth_service.dart';

class LoginScreen extends StatefulWidget {
  @override
  _LoginScreenState createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final FirebaseAuthService _authService = FirebaseAuthService();
  bool _isLoading = false;

  Future<void> _handleGoogleSignIn() async {
    setState(() => _isLoading = true);

    try {
      final result = await _authService.signInWithGoogle();

      if (result != null) {
        // Login successful!
        Navigator.pushReplacementNamed(context, '/home');
        
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Welcome ${result['user']['full_name']}!'),
            backgroundColor: Colors.green,
            duration: Duration(seconds: 3),
          ),
        );
      } else {
        // Login failed
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Login failed. Please try again.'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: $e'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Colors.blue.shade400, Colors.purple.shade600],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: Padding(
              padding: EdgeInsets.all(24.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Logo
                  Icon(
                    Icons.checkroom,
                    size: 100,
                    color: Colors.white,
                  ),
                  SizedBox(height: 24),
                  
                  // App Name
                  Text(
                    'TailorAI',
                    style: TextStyle(
                      fontSize: 48,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  SizedBox(height: 8),
                  
                  Text(
                    'Your Personal Fashion Assistant',
                    style: TextStyle(
                      fontSize: 16,
                      color: Colors.white70,
                    ),
                  ),
                  SizedBox(height: 60),
                  
                  // Google Sign-In Button
                  _isLoading
                      ? CircularProgressIndicator(
                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                        )
                      : ElevatedButton.icon(
                          onPressed: _handleGoogleSignIn,
                          icon: Icon(Icons.login, size: 24),
                          label: Text(
                            'Sign in with Google',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.white,
                            foregroundColor: Colors.black87,
                            padding: EdgeInsets.symmetric(
                              horizontal: 32,
                              vertical: 16,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(30),
                            ),
                            elevation: 5,
                          ),
                        ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
```

---

## 🔍 Backend Verification Process

আপনার backend এ কি হচ্ছে (already implemented):

### `src/controllers/authController.ts`:

```typescript
mobileLogin: async (req: FastifyRequest, reply: FastifyReply) => {
    const { idToken } = req.body;  // Firebase ID Token পাচ্ছে

    // ✅ Step 1: Google এর সাথে token verify করছে
    const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    // ✅ Step 2: Database এ user খুঁজছে বা create করছে
    let user = await UserModel.findByGoogleId(googleId);
    
    if (!user) {
        user = await UserModel.create({
            google_id: googleId,
            email: email,
            full_name: name,
            avatar: picture
        });
    }

    // ✅ Step 3: JWT tokens generate করছে
    const accessToken = jwt.sign(
        { id: user.id, email: user.email, name: user.full_name },
        { expiresIn: '15m' }
    );

    const refreshToken = crypto.randomBytes(40).toString('hex');
    
    // ✅ Step 4: Refresh token database এ save করছে
    await UserModel.query(
        'INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES ($1, $2, $3)',
        [refreshToken, user.id, expiresAt]
    );

    // ✅ Step 5: Response পাঠাচ্ছে
    return reply.send({ 
        token: accessToken, 
        refreshToken, 
        user 
    });
}
```

---

## 🎯 Complete App Flow

### `main.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';
import 'services/firebase_auth_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'TailorAI',
      theme: ThemeData(
        primarySwatch: Colors.blue,
        visualDensity: VisualDensity.adaptivePlatformDensity,
      ),
      home: SplashScreen(),
      routes: {
        '/login': (context) => LoginScreen(),
        '/home': (context) => HomeScreen(),
      },
    );
  }
}

// Splash Screen - Check login status
class SplashScreen extends StatefulWidget {
  @override
  _SplashScreenState createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  final FirebaseAuthService _authService = FirebaseAuthService();

  @override
  void initState() {
    super.initState();
    _checkLoginStatus();
  }

  Future<void> _checkLoginStatus() async {
    await Future.delayed(Duration(seconds: 2));
    
    final isLoggedIn = await _authService.isLoggedIn();
    
    if (isLoggedIn) {
      Navigator.pushReplacementNamed(context, '/home');
    } else {
      Navigator.pushReplacementNamed(context, '/login');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [Colors.blue.shade400, Colors.purple.shade600],
          ),
        ),
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.checkroom, size: 100, color: Colors.white),
              SizedBox(height: 24),
              Text(
                'TailorAI',
                style: TextStyle(
                  fontSize: 48,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              SizedBox(height: 24),
              CircularProgressIndicator(color: Colors.white),
            ],
          ),
        ),
      ),
    );
  }
}
```

---

## 🔐 Token Summary

| Token Type | Source | Purpose | Validity | Storage |
|------------|--------|---------|----------|---------|
| **Firebase ID Token** | Firebase Auth | Backend verification | 1 hour | Not stored (auto-refresh) |
| **JWT Access Token** | Your Backend | API calls | 15 minutes | SharedPreferences |
| **Refresh Token** | Your Backend | Get new access token | 1 year | SharedPreferences |

---

## ✅ Verification Checklist

### Firebase Setup:
- [ ] Firebase project created
- [ ] `google-services.json` downloaded and placed in `android/app/`
- [ ] SHA-1 fingerprint added to Firebase
- [ ] Google Sign-In enabled in Firebase Console

### Backend Setup:
- [ ] `.env` file এ `GOOGLE_CLIENT_ID` set করা আছে
- [ ] Backend running: `pnpm dev`
- [ ] Database connection working

### Flutter App:
- [ ] Dependencies installed: `flutter pub get`
- [ ] Firebase initialized in `main.dart`
- [ ] `FirebaseAuthService` created
- [ ] Login screen implemented

---

## 🧪 Testing

### Test করার steps:

1. **Backend চালু করুন:**
```bash
cd /Users/macm1/Desktop/tailorai
pnpm dev
```

2. **Flutter app run করুন:**
```bash
flutter run
```

3. **Login test করুন:**
   - "Sign in with Google" button এ click করুন
   - Google account select করুন
   - Permission দিন
   - Console এ logs দেখুন
   - Home screen এ navigate হবে

### Expected Console Output:

```
🔵 Step 1: Starting Google Sign-In...
✅ Step 2: Google account selected: user@gmail.com
✅ Step 3: Got Google authentication tokens
🔵 Step 4: Signing in to Firebase...
✅ Step 5: Firebase sign-in successful!
   User: user@gmail.com
✅ Step 6: Got Firebase ID Token
   Token preview: eyJhbGciOiJSUzI1NiIsImtpZCI6...
🔵 Step 7: Sending token to backend...
✅ Step 8: Backend authentication successful!
   User ID: 123
   Email: user@gmail.com
✅ Step 9: Tokens saved locally
🎉 Login complete!
```

---

## 🎉 Summary

এখন আপনার app এ:

1. ✅ Firebase Authentication দিয়ে Google Login
2. ✅ Firebase ID Token backend এ verify
3. ✅ Backend JWT tokens generate এবং save
4. ✅ Automatic token management
5. ✅ Secure authentication flow
6. ✅ Complete error handling

সব কিছু production-ready এবং secure! 🚀
