
# Plan: Aktualizacja Node.js do wersji 22 w Codemagic

## Problem

Build zakończył się błędem:
```
[fatal] The Capacitor CLI requires NodeJS >=22.0.0
```

Plik `codemagic.yaml` używa Node.js 20, ale Capacitor CLI w wersji 8.x wymaga minimum Node.js 22.

---

## Co zostanie zmienione

Zaktualizuję wersję Node.js z `20` na `22` we wszystkich trzech workflow:

| Workflow | Linia | Stara wartość | Nowa wartość |
|----------|-------|---------------|--------------|
| android-workflow | 14 | `node: 20` | `node: 22` |
| ios-workflow | 88 | `node: 20` | `node: 22` |
| combined-workflow | 170 | `node: 20` | `node: 22` |

---

## Szczegóły techniczne

Zmiana w pliku `codemagic.yaml`:

```yaml
# Przed (w każdym workflow):
environment:
  node: 20

# Po:
environment:
  node: 22
```

Codemagic obsługuje Node.js 22 na maszynach `mac_mini_m2`, więc zmiana powinna zadziałać bez problemów.

---

## Po implementacji

1. Build zostanie ponownie zsynchronizowany z GitHub
2. Uruchom workflow ponownie w Codemagic
3. Krok "Sync Capacitor" powinien teraz przejść pomyślnie
