# Secret Santa, aplikacja do świątecznego losowania prezentów

Jesteś doświadczonym Full Stack Developerem. Twoim zadaniem jest stworzenie kompletnej, lekkiej aplikacji internetowej do organizowania świątecznego losowania prezentów w rodzinie.

Aplikacja ma być gotowa do uruchomienia w jednym kontenerze Docker, bez zewnętrznych baz danych i dodatkowej infrastruktury.

Zaimplementuj w pełni działający projekt, a nie sam szkielet lub makietę.

## 1. Technologie

Wykorzystaj:

- React + TypeScript + Vite jako frontend.
- Node.js + Express jako backend.
- Lokalny plik JSON jako trwały magazyn danych.
- Bibliotekę `qrcode` do generowania kodów QR.
- Node.js Crypto do generowania tokenów.
- Docker z wieloetapowym Dockerfile.
- Docker Compose do uruchamiania.

Nie wykorzystuj Cloudflare, PostgreSQL, MySQL, Redis, Prisma, Firebase ani innych usług zewnętrznych.

Nie twórz osobnych kontenerów dla frontendu i backendu.

Produkcyjny kontener ma uruchamiać jeden serwer Node.js, który obsługuje zarówno API, jak i statyczne pliki React.

Cała aplikacja musi działać na jednym porcie, domyślnie 3000.

## 2. Przechowywanie danych

Wszystkie dane mają być przechowywane w katalogu:

`/app/data`

Katalog będzie montowany jako Docker volume.

Przykładowo:

`./data:/app/data`

Podstawowe dane aplikacji przechowuj w:

`/app/data/database.json`

W JSON mają znajdować się:
- Wydarzenia świąteczne.
- Uczestnicy.
- Wykluczenia pomiędzy uczestnikami.
- Przydziały z losowania.
- Skróty tokenów dostępu.
- Informacje o aktywnych sesjach.
- Historia losowań.
- Informacje o stanie wydarzenia.

Przy pierwszym uruchomieniu aplikacja powinna automatycznie utworzyć katalog danych oraz poprawny, pusty plik JSON, jeśli jeszcze nie istnieje.

Nie nadpisuj istniejącego pliku podczas restartu kontenera.

Wymagania zapisu:

1. Zaimplementuj centralny moduł odpowiedzialny za odczytywanie i zapisywanie JSON.
2. Wykonuj modyfikacje sekwencyjnie za pomocą kolejki operacji.
3. Zapisuj dane do pliku tymczasowego, a następnie atomowo zastępuj plik docelowy.
4. Nie dopuszczaj do częściowych zapisów.
5. Zapewnij poprawną obsługę błędów systemu plików.
6. Zabezpiecz aplikację przed utratą zmian przy równoczesnych żądaniach.
7. Operacje zmieniające stan muszą aktualizować pamięć i plik w spójny sposób.
8. Jeśli zapis pliku się nie powiedzie, nie potwierdzaj operacji użytkownikowi.

Załóż, że działa tylko jedna instancja aplikacji i jeden proces backendu. Nie projektuj klastra ani wielu replik.

## 3. Zasady losowania

Każdy uczestnik kupuje prezent jednej osobie i otrzymuje prezent od jednej osoby.

Podstawowe zasady:

- Nikt nie może wylosować siebie.
- Każdy uczestnik ma dokładnie jednego odbiorcę.
- Każdy uczestnik jest odbiorcą dokładnie jednego prezentu.
- Ta sama osoba nie może zostać wylosowana przez dwie osoby.
- Domyślnie zabroń wzajemnych par A → B i B → A.
- Administrator może określić dodatkowe wykluczenia, np. partnerzy nie mogą losować siebie nawzajem.
- W przyszłych edycjach można wykluczyć przydziały z poprzedniego roku.

Algorytm musi działać po stronie backendu.

Wykorzystaj losowy algorytm wyszukiwania przydziałów z ograniczeniami, np. randomized backtracking.

Nie stosuj nieskończonych pętli ponawiających nieudane losowania.

Jeżeli dla danych ograniczeń nie da się wykonać poprawnego losowania, pokaż czytelny komunikat administratorowi.

Losowanie uruchamiane jest ręcznie przez administratora.

Wyniki zapisuj jednorazowo w pliku JSON.

Ponowne otwarcie aplikacji, restart kontenera czy ponowne zalogowanie nie mogą spowodować ponownego losowania.

Zaimplementuj serwerowe zabezpieczenie przed równoczesnym i ponownym uruchomieniem losowania.

Nie pozwalaj na częściowe zapisanie przydziałów.

## 4. Logowanie uczestników

Nie twórz tradycyjnego systemu kont z hasłami.

Każdy uczestnik otrzymuje indywidualny kod QR oraz odpowiadający mu link.

Przykład:

`https://swieta.example.pl/invite/LOSOWY_TOKEN`

Token musi być długi, losowy i kryptograficznie bezpieczny.

Proces autoryzacji:

1. Uczestnik skanuje kod QR.
2. Otwiera aplikację w przeglądarce.
3. Backend sprawdza token.
4. Jeśli token jest poprawny, tworzy sesję użytkownika.
5. Sesja jest zapisywana w ciasteczku HttpOnly.
6. Token jest usuwany z widocznego adresu przez przekierowanie.
7. Użytkownik widzi swój panel.

Sesja powinna działać między kolejnymi wizytami, a kod QR powinien umożliwiać ponowne zalogowanie po jej wygaśnięciu.

W bazie przechowuj wyłącznie skróty tokenów, generowane np. za pomocą SHA-256.

Nie zapisuj jawnych tokenów dostępu w pliku JSON.

Kod QR jest kluczem dostępu. Każda osoba posiadająca kod może zalogować się jako dany uczestnik, dlatego zadbaj o bezpieczeństwo tokenów.

Dodatkowo:

- Administrator może unieważnić token.
- Administrator może wygenerować nowy kod dla uczestnika.
- Poprzedni kod po unieważnieniu przestaje działać.
- Regeneracja kodu nie zmienia wyniku losowania.
- Uczestnik może się wylogować.
- Uczestnik nie może zobaczyć danych sesyjnych innych osób.

Podczas generowania nowego QR pokazuj nowy token tylko w odpowiedzi na tę operację.

Zadbaj o możliwość pobrania QR bez umieszczania tokenów w logach serwera.

## 5. Panel uczestnika

Po prawidłowym zalogowaniu użytkownik widzi:

- Świąteczny ekran powitalny.
- Swoje imię.
- Nazwę aktualnego wydarzenia.
- Duży przycisk „Odkryj, komu kupujesz prezent”.
- Animację odkrywania.
- Imię osoby wylosowanej.
- Możliwość ponownego wyświetlenia wyniku.
- Przycisk wylogowania.

Wynik jest pobierany z backendu na podstawie uwierzytelnionej sesji.

Nie przekazuj w zapytaniu identyfikatora uczestnika jako źródła autoryzacji.

Nie przesyłaj na frontend pełnej listy przydziałów.

Użytkownik nie może uzyskać informacji o przydziałach pozostałych osób przez manipulację adresem URL lub API.

## 6. Panel administratora

Utwórz panel pod adresem:

`/admin`

Administrator loguje się za pomocą hasła ustawionego w zmiennej środowiskowej `ADMIN_PASSWORD`.

Nie przechowuj hasła administratora w pliku JSON.

Zabezpiecz logowanie przed brute force, a operacje administracyjne przed CSRF.

Panel powinien umożliwiać:

- Utworzenie nowego wydarzenia.
- Dodanie uczestników.
- Edytowanie uczestników.
- Usuwanie uczestników przed losowaniem.
- Definiowanie wykluczeń.
- Wykonanie losowania.
- Wyświetlenie statusu losowania.
- Generowanie kodów QR.
- Pobieranie kodów QR.
- Drukowanie kodów QR.
- Kopiowanie prywatnych linków do schowka.
- Regenerowanie kodów dostępu.
- Tworzenie kolejnych edycji wydarzenia.

Kody QR powinny być opisane imieniem uczestnika.

Zaprojektuj widok drukowania, który pozwala wydrukować osobne karteczki dla każdej osoby.

Karteczka powinna zawierać imię, kod QR i krótki tekst, np. „Zeskanuj, aby sprawdzić, komu kupujesz prezent”.

Wynik losowania nie może być widoczny na drukowanych karteczkach.

Nie udostępniaj administratorowi domyślnego ekranu pokazującego wszystkie przydziały.

Po zakończeniu losowania zablokuj edycję listy uczestników oraz wykluczeń.

## 7. Generowanie kodów QR

Kody QR mają być generowane w panelu administratora.

Każdy QR zawiera pełny adres URL aplikacji wraz z indywidualnym tokenem.

Użyj zmiennej środowiskowej:

`PUBLIC_BASE_URL`

Przykład:

`PUBLIC_BASE_URL=https://swieta.example.pl`

Nie generuj kodów QR opartych na localhost, nazwie kontenera ani wewnętrznym adresie sieci Docker.

Zaimplementuj:

- Generowanie nowego QR.
- Pobieranie grafiki PNG.
- Kopiowanie linku.
- Widok wydruku.
- Regenerowanie QR przy utracie kodu.

Nie przechowuj obrazów QR w bazie danych.

Wystarczy wygenerować je na podstawie tokenu w momencie wydania lub regeneracji kodu.

Ze względów bezpieczeństwa nie zakładaj, że po zapisaniu samego skrótu tokenu będzie można ponownie odtworzyć stary kod. Zamiast tego zapewnij jednorazowy eksport wydanych kodów albo możliwość wygenerowania nowych.

## 8. Wygląd aplikacji, świąteczny klimat i humor

Aplikacja ma mieć bardzo wyraźny, radosny i zabawny klimat świąteczny. Chcę, aby korzystanie z niej było atrakcją samą w sobie, a nie tylko zwykłym wyświetleniem imienia wylosowanej osoby.

### Ogólny styl wizualny

- Motyw Bożego Narodzenia z dużą ilością świątecznych akcentów.
- Kolory: ciemna zieleń, czerwień, bordo, złoto, biel i delikatne ciepłe światło.
- W tle choinki, bombki, prezenty, śnieżynki, lampki i inne dekoracje.
- Animowany śnieg opadający w tle, wykonany wydajnie i bez ciężkich bibliotek.
- Świąteczne fonty na nagłówkach, ale czytelna typografia w pozostałych elementach.
- Przyjemne animacje przycisków, prezentów i kart.
- Responsywny interfejs przystosowany przede wszystkim do telefonów.

Nie ograniczaj wyglądu do prostego formularza i jednolitego tła. Aplikacja ma wyglądać jak dopracowana, humorystyczna świąteczna niespodzianka.

### Memy i zabawne grafiki

Dodaj zabawne obrazki, memy i humorystyczne teksty związane ze świętami.

Przykładowe pomysły:

- Mikołaj z podejrzliwą miną.
- Renifer wyglądający na zmęczonego przygotowaniami do świąt.
- Kot niszczący choinkę.
- Mikołaj obserwujący, czy ktoś nie oszukuje podczas losowania.
- Śmieszne komunikaty podczas odkrywania wyniku.

Przykładowe teksty:

- „Mikołaj już wie, komu kupujesz prezent. A Ty?”
- „Uwaga! Świąteczne przeznaczenie zostało ustalone.”
- „Elfy przeliczyły wszystko trzy razy. Chyba.”
- „Oby ta osoba nie zażyczyła sobie nowego iPhone'a.”
- „Budżet płacze, ale tradycja zobowiązuje.”
- „Ho ho ho! Teraz już się nie wykręcisz!”
- „Nie zdradzaj wyniku, bo Mikołaj patrzy 👀”
- „System elfów działa. Prosimy nie dokarmiać reniferów.”

Teksty mogą być wybierane losowo z przygotowanej listy.

Zadbaj o humorystyczny charakter aplikacji, ale bez obraźliwych treści.

Grafiki i memy umieść w lokalnym katalogu zasobów. Nie pobieraj ich dynamicznie z przypadkowych serwisów internetowych. Wykorzystuj zasoby z odpowiednimi prawami do użycia lub stwórz własne proste ilustracje SVG.

Przygotuj strukturę umożliwiającą łatwe dodawanie kolejnych obrazków bez modyfikowania logiki aplikacji.

### Ekran odkrywania wyniku

To najważniejszy ekran całej aplikacji i powinien być najbardziej efektowny.

Po zalogowaniu uczestnik widzi na środku ekranu duży, animowany prezent 🎁.

Pod prezentem znajduje się przycisk:

**„SPRAWDŹ, KOMU KUPUJESZ PREZENT 🎅”**

Po kliknięciu:

1. Prezent zaczyna się delikatnie trząść.
2. Pojawia się krótka świąteczna animacja.
3. Pudełko otwiera się, a na ekranie pojawiają się konfetti, śnieżynki albo złote gwiazdki.
4. Następuje efektowne odsłonięcie karty z wynikiem.
5. Na środku ekranu pojawia się bardzo duże imię wylosowanej osoby.

Przykładowy widok:

**🎄 TWOIM ŚWIĄTECZNYM WYBRAŃCEM JEST... 🎄**

# KASIA 🎁

*„Powodzenia, Mikołaju. Liczymy na Twoją kreatywność!”*

Wynik ma być najważniejszym wizualnie elementem ekranu.

Animacja odkrywania ma być wyłącznie efektem wizualnym. Przydział jest już wcześniej zapisany w JSON i nie może być losowany ponownie.

Dodaj możliwość ponownego obejrzenia animacji bez zmiany wyniku.

### Zdjęcia uczestników

Dodaj opcjonalną obsługę zdjęć uczestników.

Chcę mieć możliwość samodzielnego wrzucania zdjęć członków rodziny do katalogu aplikacji, bez konieczności przesyłania ich przez panel administracyjny.

Przygotuj katalog:

`/app/data/photos/`

Katalog ma znajdować się wewnątrz montowanego Docker volume, dzięki czemu zdjęcia pozostaną dostępne po ponownym uruchomieniu kontenera.

Każdy uczestnik powinien mieć unikalny identyfikator oraz opcjonalną nazwę pliku zdjęcia przypisaną do jego profilu.

Przykład:

```text
data/
├── database.json
└── photos/
    ├── anna.jpg
    ├── kasia.png
    ├── michal.webp
    └── tomek.jpg
```

W panelu administratora dodaj możliwość przypisania istniejącego zdjęcia do uczestnika poprzez wskazanie nazwy pliku.

Nie uzależniaj przypisania zdjęcia od imienia, ponieważ w rodzinie mogą występować osoby o takich samych imionach.

Obsługuj formaty JPG, PNG i WebP.

Zabezpiecz obsługę plików przed path traversal, odczytem dowolnych plików z dysku oraz dostępem do zdjęć osób niepowiązanych z zalogowanym użytkownikiem.

### Wyświetlanie zdjęcia w wyniku losowania

Jeżeli wylosowana osoba ma przypisane zdjęcie, pokaż je na ekranie wyniku.

Zdjęcie powinno:
- Zajmować dużą część centralnego obszaru.
- Mieć delikatne przyciemnienie albo gradient dla czytelności tekstu.
- Znajdować się za dużym napisem z imieniem wylosowanej osoby.
- Mieć świąteczną ramkę, lampki lub inne dekoracje.
- Pojawiać się z subtelną animacją.

Przykładowy układ:

- Świąteczne tło aplikacji.
- Duża karta z fotografią wylosowanej osoby.
- Na środku zdjęcia lub w jego dolnej części ogromny napis z imieniem.
- Dodatkowy zabawny świąteczny tekst.
- Dekoracje wokół karty.

Jeżeli zdjęcie nie istnieje, pokaż domyślną zabawną ilustrację Mikołaja, renifera albo prezentu.

Nie pokazuj zdjęć ani nazw plików innych osób przed ujawnieniem wyniku.

Dostęp do fotografii wylosowanej osoby powinien odbywać się przez uwierzytelniony endpoint backendu, z kontrolą uprawnień na podstawie sesji. Nie wystawiaj całego katalogu zdjęć jako publicznych plików statycznych.

### Dodatkowe efekty

Możesz dodać:

- Animowane lampki świąteczne na górze ekranu.
- Małego renifera poruszającego się po ekranie.
- Mikołaja pojawiającego się po odkryciu wyniku.
- Losowe świąteczne żarty.
- Animację spadających prezentów.
- Przycisk „Pokaż jeszcze raz”, który powtórzy animację odkrywania.
- Małe ukryte easter eggi.

Nie przesadzaj z efektami, aby aplikacja była płynna na telefonach.

Uszanuj ustawienie `prefers-reduced-motion` i pozwól użytkownikowi wyłączyć intensywne animacje.

### Priorytety wyglądu

1. Wyraźny świąteczny charakter.
2. Efektowny ekran odkrywania wyniku.
3. Duże imię wylosowanej osoby.
4. Opcjonalne zdjęcie osoby jako tło karty.
5. Zabawne grafiki, memy i teksty.
6. Płynne animacje.
7. Responsywność.
8. Prostota korzystania.

Zależy mi, aby aplikacja wywoływała uśmiech i była małą świąteczną atrakcją dla całej rodziny.

## 9. Struktura projektu

Zaproponuj czytelną strukturę, zbliżoną do:

```text
secret-santa/
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── api/
│   │   └── styles/
│   └── index.html
├── server/
│   ├── index.ts
│   ├── routes/
│   ├── services/
│   ├── middleware/
│   └── storage/
├── shared/
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── .env.example
├── .gitignore
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

Możesz dostosować strukturę, jeśli poprawi to czytelność.

## 10. Docker

Przygotuj wieloetapowy Dockerfile.

Etap budowania:

1. Instalacja zależności.
2. Kompilacja TypeScript.
3. Zbudowanie frontendu React.
4. Przygotowanie produkcyjnego backendu.

Etap produkcyjny:

1. Minimalny obraz Node.js.
2. Tylko niezbędne zależności.
3. Zbudowany frontend.
4. Zbudowany backend.
5. Uruchomienie serwera na porcie 3000.
6. Użycie nieuprzywilejowanego użytkownika.
7. Poprawne uprawnienia do katalogu danych.

Nie uruchamiaj Vite Development Server w produkcji.

Przygotuj docker-compose.yml:

```yaml
services:
  secret-santa:
    build: .
    container_name: secret-santa
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      PORT: 3000
      DATA_DIR: /app/data
      PUBLIC_BASE_URL: ${PUBLIC_BASE_URL}
      ADMIN_PASSWORD: ${ADMIN_PASSWORD}
    volumes:
      - ./data:/app/data
```

Przygotuj plik `.env.example`.

Przygotuj healthcheck lub endpoint `/health`.

Aplikacja musi poprawnie obsługiwać SIGTERM i kończyć aktywne operacje zapisu przed wyłączeniem.

## 11. Bezpieczeństwo

Wprowadź:

- Bezpieczne tokeny o odpowiedniej entropii.
- SHA-256 do przechowywania skrótów losowych tokenów.
- Sesje w ciasteczkach HttpOnly.
- Secure dla połączeń HTTPS.
- SameSite=Lax lub bardziej restrykcyjną politykę, jeśli jest zgodna z przepływem logowania.
- Ochronę CSRF.
- Rate limiting.
- Walidację danych.
- Bezpieczną autoryzację API.
- Cache-Control: no-store dla prywatnych odpowiedzi.
- Blokadę dostępu HTTP do plików JSON.
- Brak ujawniania tokenów w logach.
- Brak sekretów w frontendzie.
- Bezpieczne nagłówki HTTP.

Nie zapisuj wyników ani tokenów w localStorage.

Przy korzystaniu z reverse proxy uwzględnij bezpieczną konfigurację zaufanych proxy.

Nie implementuj niepotrzebnie rozbudowanego systemu użytkowników.

## 12. Testy

Przygotuj testy obejmujące:

- Poprawne losowanie.
- Brak duplikatów.
- Brak losowania samego siebie.
- Brak wzajemnych par.
- Wykluczenia.
- Sytuację bez możliwego rozwiązania.
- Ponowne uruchomienie aplikacji.
- Trwałość JSON.
- Równoczesne operacje zapisu.
- Odporność na równoczesne żądania losowania.
- Logowanie tokenem.
- Dostęp tylko do własnego wyniku.
- Regenerowanie tokenu.
- Unieważnienie poprzedniego tokenu.
- Wylogowanie.
- Obsługę błędów zapisu danych.

## 13. README

Przygotuj dokumentację zawierającą:

- Wymagania.
- Instalację.
- Konfigurację `.env`.
- Uruchomienie przez Docker Compose.
- Lokalizację pliku JSON.
- Instrukcję wykonywania backupu.
- Instrukcję aktualizacji aplikacji.
- Instrukcję zmiany hasła administratora.
- Instrukcję wystawienia za reverse proxy.
- Opis tworzenia wydarzenia i rozdawania kodów QR.

Aplikacja ma działać po wykonaniu:

```bash
docker compose up -d --build
```

Bez ręcznego przygotowywania bazy danych i bez uruchamiania dodatkowych usług.

## 14. Oczekiwany rezultat

Zaimplementuj kompletną aplikację gotową do użycia.

Kolejność:

1. Zaprojektuj strukturę projektu.
2. Zaimplementuj magazyn JSON.
3. Zaimplementuj algorytm losowania.
4. Zaimplementuj autoryzację i sesje.
5. Zaimplementuj REST API.
6. Zaimplementuj frontend React.
7. Zaimplementuj panel administratora.
8. Dodaj generowanie QR.
9. Przygotuj Dockerfile i Docker Compose.
10. Dodaj testy.
11. Uruchom testy i kompilację.
12. Popraw napotkane błędy.
13. Przygotuj dokumentację.

Nie kończ po wygenerowaniu projektu.

Zweryfikuj, czy aplikacja jest gotowa do uruchomienia jednym poleceniem Docker Compose.

Priorytety:
1. Prostota.
2. Poprawność losowania.
3. Poufność wyników.
4. Trwałość pliku JSON.
5. Działające logowanie przez QR.
6. Łatwa obsługa przez rodzinę.

