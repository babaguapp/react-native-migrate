

# Mapa Spotkań z Precyzyjnym Wyborem Lokalizacji

## Problem
Obecnie geocoding działa tylko na poziomie miasta (np. "Warszawa"), więc wszystkie spotkania z tego samego miasta mają identyczne współrzędne i nakładałyby się na mapie.

## Rozwiązanie
Dodanie możliwości wyboru konkretnego adresu lub miejsca przy tworzeniu spotkania, z autouzupełnianiem adresów.

---

## Wizualizacja nowego formularza

```text
+------------------------------------------+
|  [<]  Utwórz spotkanie                   |
+------------------------------------------+
|                                          |
|  Kategoria                               |
|  [🎾 Sport                          ▼]  |
|                                          |
|  Aktywność                               |
|  [Tenis                             ▼]  |
|                                          |
|  📍 Lokalizacja                          |
|  [Hala sportowa Torwar, Warszawa    🔍] |
|  +------------------------------------+  |
|  | 📍 Hala Torwar, Łazienkowska 6a   |  |
|  | 📍 Hala Sportowa, Wawelska 5      |  |
|  | 📍 Park Skaryszewski, Warszawa    |  |
|  +------------------------------------+  |
|                                          |
|  📅 Data spotkania                       |
|  [15 lutego 2026                    📅] |
|                                          |
|  ...                                     |
+------------------------------------------+
```

---

## Zakres zmian

### 1. Baza danych
Dodanie nowej kolumny `address` do tabeli `meetings`:

| Kolumna | Typ | Opis |
|---------|-----|------|
| `address` | TEXT (nullable) | Szczegółowy adres/nazwa miejsca |

Pole `city` pozostaje jako backup i dla kompatybilności wstecznej.

### 2. Nowy komponent - AddressAutocomplete
Komponent wyszukiwania adresu z autouzupełnianiem, korzystający z Nominatim API (OpenStreetMap):

| Cecha | Opis |
|-------|------|
| Wyszukiwanie | Minimum 3 znaki, debounce 300ms |
| Sugestie | Lista rozwijana z propozycjami adresów |
| Dane zwrotne | Pełny adres + współrzędne lat/lon |
| Ograniczenie | Wyniki tylko z Polski |

Plik: `src/components/location/AddressAutocomplete.tsx`

### 3. Modyfikacja formularza CreateMeeting
Zamiana prostego pola "Miasto" na komponent AddressAutocomplete:

- Użytkownik wpisuje nazwę miejsca/adresu
- Pojawiają się sugestie z Nominatim
- Po wybraniu zapisujemy: adres, miasto (wyekstrahowane), lat, lon
- Pole "Miasto" pozostaje ukryte ale wypełniane automatycznie

### 4. Rozszerzenie Edge Function - geocode-address
Nowa funkcja lub rozszerzenie istniejącej do wyszukiwania adresów (nie tylko miast):

```text
Request:  { query: "Hala Torwar Warszawa" }
Response: {
  results: [
    {
      displayName: "Hala Torwar, Łazienkowska 6a, Warszawa",
      city: "Warszawa",
      latitude: 52.2167,
      longitude: 21.0333
    },
    ...
  ]
}
```

### 5. Aktualizacja wyświetlania
Na karcie spotkania i stronie szczegółów pokazujemy:
- Jeśli `address` istnieje → wyświetl adres
- Jeśli tylko `city` → wyświetl miasto (kompatybilność wsteczna)

---

## Struktura plików do utworzenia/modyfikacji

| Plik | Akcja |
|------|-------|
| `src/components/location/AddressAutocomplete.tsx` | Nowy - komponent autocomplete |
| `src/pages/CreateMeeting.tsx` | Modyfikacja - integracja autocomplete |
| `supabase/functions/geocode/index.ts` | Modyfikacja - obsługa wyszukiwania adresów |
| Migracja SQL | Nowa - dodanie kolumny `address` |
| `src/components/meetings/MeetingCard.tsx` | Modyfikacja - wyświetlanie adresu |
| `src/pages/MeetingDetails.tsx` | Modyfikacja - wyświetlanie adresu |

---

## Szczegóły techniczne

### Komponent AddressAutocomplete

```text
Props:
├── value: string (aktualny tekst)
├── onChange: (value: string) => void
├── onSelect: (result: AddressResult) => void
└── placeholder?: string

State:
├── suggestions: AddressResult[]
├── isLoading: boolean
├── showDropdown: boolean
└── selectedIndex: number (nawigacja klawiaturą)

AddressResult:
├── displayName: string
├── city: string
├── latitude: number
└── longitude: number
```

### Przepływ UX

1. Użytkownik wpisuje tekst (min. 3 znaki)
2. Po 300ms debounce → wywołanie API Nominatim
3. Wyświetlenie listy sugestii (max 5)
4. Kliknięcie lub Enter → wybór adresu
5. Wypełnienie ukrytych pól: city, latitude, longitude
6. Wyświetlenie wybranego adresu w input

### Obsługa błędów

- Brak wyników → "Nie znaleziono. Spróbuj inaczej"
- Błąd API → Fallback do ręcznego wpisania miasta
- Timeout → Retry z komunikatem

---

## Korzyści

1. **Precyzyjne lokalizacje na mapie** - markery nie nakładają się
2. **Lepsza informacja dla uczestników** - dokładny adres spotkania
3. **Wsteczna kompatybilność** - istniejące spotkania nadal działają
4. **Bez dodatkowych kosztów** - Nominatim jest darmowy

---

## Plan realizacji mapy (po implementacji adresów)

Po dodaniu precyzyjnych adresów, będziemy mogli zaimplementować mapę spotkań zgodnie z wcześniejszym planem, gdzie każde spotkanie będzie miało unikalne współrzędne.

