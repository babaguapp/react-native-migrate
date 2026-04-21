

## Wgranie poprawki crasha na telefon

Zmiana w `src/components/PushNotificationHandler.tsx` (FIREBASE_CONFIGURED = false) jest już w kodzie, ale telefon nadal ma starą wersję APK. Trzeba zbudować, zsynchronizować i przeinstalować.

### Kroki do wykonania w PowerShell

```powershell
# 1. Pobierz najnowsze zmiany z Lovable
git pull

# 2. Zbuduj webową część apki (kompiluje TS → JS do folderu dist/)
npm run build

# 3. Skopiuj dist/ do natywnego projektu Android
npx cap sync android

# 4. Zbuduj APK i zainstaluj na telefonie (telefon podłączony USB)
cd android
./gradlew installDebug
```

### Co się stanie

- `npm run build` — Vite skompiluje React/TS do statycznych plików w `dist/`
- `npx cap sync android` — Capacitor skopiuje `dist/` do `android/app/src/main/assets/public/` (to czyta WebView)
- `./gradlew installDebug` — zbuduje APK i zainstaluje na podłączonym telefonie

### Po instalacji

Otwórz apkę BaBaGu, zaloguj się — **nie powinno być crasha**. Push notifications nie będą działać (są wyłączone), ale reszta apki tak.

### Jeśli chcesz włączyć push w przyszłości

Trzeba dodać `google-services.json` z Firebase Console do `android/app/`, a potem zmienić `FIREBASE_CONFIGURED = true` w `PushNotificationHandler.tsx` i powtórzyć kroki 2-4.

### Zasada na przyszłość

| Co zmieniłeś | Co musisz zrobić |
|---|---|
| Kod w `src/` (TS/React) | `npm run build` + `npx cap sync` + `./gradlew installDebug` |
| `capacitor.config.ts` | `npx cap sync` + `./gradlew installDebug` |
| Pliki natywne (`android/`) | tylko `./gradlew installDebug` |
| `google-services.json` | tylko `./gradlew installDebug` |

