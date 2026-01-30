
# Plan: Konfiguracja Codemagic CI/CD dla BaBaGu

## Co zostanie stworzone

Plik `codemagic.yaml` w głównym katalogu projektu, który skonfiguruje automatyczne budowanie:
- **Android**: APK (debug) i AAB (release dla Google Play)
- **iOS**: IPA z automatycznym podpisywaniem przez App Store Connect API

---

## Zawartość pliku codemagic.yaml

Plik będzie zawierał:

### 1. Workflow Android
- Instalacja zależności Node.js (npm install)
- Budowanie aplikacji web (npm run build)
- Dodanie platformy Android (npx cap add android)
- Synchronizacja Capacitor (npx cap sync android)
- Budowanie APK/AAB przez Gradle
- Publikowanie artefaktów

### 2. Workflow iOS (z automatycznym podpisywaniem)
- Instalacja zależności Node.js
- Budowanie aplikacji web
- Dodanie platformy iOS (npx cap add ios)
- Synchronizacja Capacitor (npx cap sync ios)
- Instalacja CocoaPods
- **Automatyczne podpisywanie** przez App Store Connect API
- Budowanie IPA przez xcodebuild
- Publikowanie artefaktów

---

## Wymagana konfiguracja w Codemagic Dashboard

Po dodaniu pliku do repozytorium, w ustawieniach aplikacji w Codemagic należy skonfigurować:

### Dla iOS (automatyczne podpisywanie):
1. **App Store Connect API Key** - plik .p8 z Apple Developer Portal
2. **Key ID** - identyfikator klucza
3. **Issuer ID** - identyfikator wydawcy

### Dla Android (opcjonalnie dla Google Play):
1. **Keystore file** - plik .jks/.keystore do podpisywania release
2. **Keystore password**
3. **Key alias i password**

---

## Zmienne środowiskowe używane w pliku

| Zmienna | Opis | Gdzie ustawić |
|---------|------|---------------|
| `APP_STORE_CONNECT_KEY_IDENTIFIER` | Key ID z Apple | Codemagic → Settings |
| `APP_STORE_CONNECT_ISSUER_ID` | Issuer ID z Apple | Codemagic → Settings |
| `APP_STORE_CONNECT_PRIVATE_KEY` | Zawartość pliku .p8 | Codemagic → Settings |
| `CM_KEYSTORE` | Keystore dla Android (base64) | Codemagic → Settings |
| `CM_KEYSTORE_PASSWORD` | Hasło do keystore | Codemagic → Settings |
| `CM_KEY_ALIAS` | Alias klucza | Codemagic → Settings |
| `CM_KEY_PASSWORD` | Hasło klucza | Codemagic → Settings |

---

## Struktura pliku

```text
codemagic.yaml
├── workflows:
│   ├── android-workflow
│   │   ├── name: "Android Build"
│   │   ├── instance_type: mac_mini_m2
│   │   ├── environment (Node 20, Java 17)
│   │   ├── scripts (install, build, cap sync, gradle)
│   │   └── artifacts (APK, AAB)
│   │
│   └── ios-workflow
│       ├── name: "iOS Build"
│       ├── instance_type: mac_mini_m2
│       ├── environment (Node 20, Xcode latest)
│       ├── integrations: app_store_connect
│       ├── scripts (install, build, cap sync, pod install, xcodebuild)
│       └── artifacts (IPA)
```

---

## Sekcja techniczna

### Kluczowe komendy w workflow:

**Android:**
```bash
npm install
npm run build
npx cap add android || true
npx cap sync android
cd android && ./gradlew assembleRelease
```

**iOS:**
```bash
npm install
npm run build
npx cap add ios || true
npx cap sync ios
cd ios/App && pod install
xcode-project use-profiles
xcode-project build-ipa --workspace "App.xcworkspace" --scheme "App"
```

### Automatyczne podpisywanie iOS:
- Wykorzystuje **App Store Connect API** (nie wymaga .p12)
- Codemagic automatycznie generuje certyfikaty i profile
- Wymagane uprawnienia: Admin lub App Manager w App Store Connect

---

## Po implementacji

1. **Push pliku do GitHub** - wypchnij zmiany do repozytorium
2. **Konfiguracja Codemagic**:
   - Kliknij "Check for configuration file"
   - Dodaj App Store Connect API credentials
   - (Opcjonalnie) Dodaj Android keystore dla release builds
3. **Uruchom build** - wybierz workflow i uruchom
