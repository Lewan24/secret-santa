# Secret Santa 🎄

Polskojęzyczna aplikacja do rodzinnego losowania prezentów. React + TypeScript + Vite, Express, lokalny JSON i prywatne zaproszenia QR. Jeden serwer, jeden port, jeden kontener. Bez kont uczestników, zewnętrznych usług i baz danych.

Oryginalna specyfikacja została zachowana w [REQUIREMENTS.md](REQUIREMENTS.md).

## Lokalny test — npm run dev

Wymagany **Node.js 24** i npm. Z katalogu projektu:

```sh
npm ci
npm run dev
```

Otwórz **http://localhost:5173**, panel organizatora: **http://localhost:5173/admin**.
Domyślne hasło wyłącznie do lokalnych testów: **`santa-local-2026`**.

To polecenie uruchamia Express i Vite w jednym serwerze na porcie 5173. Nie wymaga `npm run build`, Dockera ani osobnego terminala dla frontendu. Zmiany React/CSS odświeżają się przez HMR; po zmianach backendu zatrzymaj proces (Ctrl+C) i ponownie wykonaj `npm run dev`.

Tryb dev **nie wczytuje `.env`** i nie korzysta z produkcyjnych danych. Domyślna baza to `./data-dev/database.json`, zdjęcia `./data-dev/photos`. Jeżeli chcesz zmienić ustawienia, skopiuj `.env.development.example` do `.env.development.local` (PowerShell: `Copy-Item .env.development.example .env.development.local`) i ustaw:

```dotenv
ADMIN_PASSWORD=santa-local-2026
PUBLIC_BASE_URL=http://localhost:5173
PORT=5173
DATA_DIR=./data-dev
DEV_HOST=127.0.0.1
TRUST_PROXY=
```

Plik jest opcjonalny; bez niego powyższe wartości są ustawieniami domyślnymi. Zmienne już ustawione w terminalu mają pierwszeństwo — usuń stare `PUBLIC_BASE_URL`, `PORT` i `ADMIN_PASSWORD` z sesji terminala, jeżeli zmieniają konfigurację. Adres wpisany w przeglądarce musi odpowiadać `PUBLIC_BASE_URL` (również `localhost` vs `127.0.0.1`), bo serwer sprawdza źródło żądań.

Do testu telefonu w tej samej sieci ustaw `DEV_HOST=0.0.0.0` i `PUBLIC_BASE_URL=http://ADRES_IP_KOMPUTERA:5173`. Otwórz ten sam adres także na komputerze przed wydawaniem QR. Dostęp wymaga, aby zapora pozwalała na połączenia do tego portu. Lokalne hasło jest publicznym przykładem — wybierz własne przed udostępnieniem serwera innym osobom.

## Docker Compose — gotowa aplikacja

Wymagania: Docker Engine / Docker Desktop z działającym silnikiem Linux oraz Docker Compose v2.

1. Skopiuj `.env.example` do `.env`:

   ```sh
   cp .env.example .env
   ```

   PowerShell: `Copy-Item .env.example .env`.

2. Ustaw w `.env`:

   ```dotenv
   ADMIN_PASSWORD='twoje-dlugie-prywatne-haslo'
   PUBLIC_BASE_URL=http://localhost:3000
   ```

   Hasło musi mieć co najmniej 12 znaków. Nie ma hasła domyślnego. Adres musi być osiągalny dla uczestników, bez ścieżki, parametrów i fragmentu. Do testu na swoim komputerze użyj `http://localhost:3000`; takich QR nie rozdawaj rodzinie. W sieci domowej podaj adres serwera, np. `http://192.168.1.20:3000`. W Internecie używaj HTTPS.

   Hasło zapisuj w pojedynczych cudzysłowach, zwłaszcza jeśli zawiera `#` lub `$`, aby Node i Compose odczytywały je identycznie. Nie korzystaj z przykładowego hasła developerskiego w produkcji.

3. Uruchom:

   ```sh
   docker compose up -d --build
   ```

4. Dla powyższej konfiguracji otwórz **http://localhost:3000/admin** i zaloguj się hasłem `ADMIN_PASSWORD` z `.env`.

Compose wczytuje hasło i publiczny adres z `.env`, a nie z pliku developerskiego. Nie wpisuj sekretów bezpośrednio do `docker-compose.yml`. Kontener nie uruchamia Vite, tylko zbudowaną aplikację i Express na porcie 3000.

**Nie ustawiaj `https://localhost` do lokalnego testu.** Kontener sam nie obsługuje TLS. HTTPS wymaga działającego reverse proxy; przy błędnym protokole lub porcie logowanie nie zadziała, a ciasteczka Secure nie zostaną przesłane przez HTTP.

Nie przygotowujesz bazy. Serwer tworzy `/app/data/database.json` i `/app/data/photos` automatycznie. Domyślny nazwany wolumen `santa-data` umożliwia zapis użytkownikowi `node` również na Linuxie, bez przygotowywania uprawnień katalogu hosta. Nie uruchamiaj wielu replik ani procesów współdzielących bazę.

`docker compose ps` pokazuje healthcheck. `GET /health` zwraca `{"status":"ok"}`. Logi: `docker compose logs -f`. Zatrzymanie: `docker compose down`. Nie używaj `down -v`, jeśli chcesz zachować dane.

### Opcjonalny katalog na hoście

Jeżeli wolisz dane bezpośrednio w `./data`:

```sh
docker compose -f docker-compose.yml -f docker-compose.bind.yml up -d --build
```

Na Linuxie wcześniej utwórz `data/photos` i nadaj katalogowi `data` prawo zapisu dla UID/GID `1000:1000`. Docker Desktop dla Windows udostępnia katalog przez Docker. Domyślny wolumen i katalog hosta to osobne magazyny — przenieś backup przed przełączeniem.

## Pracownia elfów

1. Zaloguj się pod `/admin` hasłem z `ADMIN_PASSWORD`.
2. Otwórz „Nowe wydarzenie”, podaj nazwę i utwórz wydarzenie.
3. Dodaj uczestników. Dwie osoby mogą mieć to samo imię — każda otrzyma inny identyfikator.
4. Opcjonalnie przypisz zdjęcia i dodaj wykluczenia w zakładce „Zasady losowania”. Wykluczenie A → B jest kierunkowe; dla partnerów dodaj również B → A.
5. Domyślnie wykluczone są wzajemne pary; potrzebujesz minimum trzech osób. Możesz dopuścić pary, aby losować z dwiema osobami. Limit wydarzenia: 60 uczestników.
6. W zakładce „Losowanie” potwierdź gotowość i rozpocznij losowanie. Operacja jest atomowa; zwykłe ponowienie żądania nie losuje drugi raz. Świadome ponowne losowanie ma osobny przycisk opisany poniżej. Niemożliwe ograniczenia dają czytelny komunikat. Wyszukiwanie ma limit czasu i liczby kroków.
7. Wydaj kody pojedynczo lub wszystkim. Pobierz PNG, skopiuj linki albo wydrukuj karteczki. Kody można wydać przed losowaniem — uczestnik zobaczy wtedy ekran oczekiwania z przyciskiem odświeżenia.

**Zapisz kody przed opuszczeniem strony.** Token i QR są zwracane tylko przy wydaniu; frontend trzyma je w pamięci bieżącej strony. Po odświeżeniu nie można odzyskać starego tokenu ze skrótu. Nowe wydanie unieważnia poprzedni kod i sesje tej osoby w wydarzeniu, zachowując wynik. „Unieważnij” blokuje kod bez wydawania nowego. Pobranie PNG i druk nie wysyłają kolejnych żądań z tokenem. Druk zawiera imię, QR i instrukcję, bez wyników. Widok drukuje wszystkie aktualnie wydane kody.

Po losowaniu **zawsze możesz edytować imię i zdjęcie** przyciskiem „Edytuj / zdjęcie”. Nie zmienia to przydziałów, QR ani sesji. Dodawanie i usuwanie uczestników oraz zmiana wykluczeń pozostają zablokowane. Organizator nie ma endpointu ani widoku zbiorczych wyników. Właściciel techniczny serwera ma dostęp do przydziałów w pliku bazy.

### Przelosowanie i usuwanie wydarzeń

W zakładce „Losowanie” wybierz **„🎲 Przelosuj wszystko”** i potwierdź zastąpienie wyników. Zachowujemy osoby, zdjęcia, ograniczenia i kody QR. Nowy wynik musi różnić się od poprzedniego jako całość; niektóre osoby mogą ponownie otrzymać tego samego odbiorcę. Jeśli nie istnieje żadna alternatywa (np. dwie osoby), dotychczasowy wynik zostaje bez zmian. Kolejne równoczesne żądanie dla tej samej wersji jest odrzucane. Każde udane losowanie trafia do historii w JSON.

Uprzedź uczestników, którzy już odkryli wyniki. Otwarta strona sprawdza wersję po powrocie do okna i co 30 sekund, ukrywa stary wynik oraz proponuje odkrycie nowego prezentu. Przycisk „Pokaż jeszcze raz” również pobiera aktualny wynik.

Obok wyboru wydarzenia znajduje się **„🗑 Usuń wydarzenie”**. Po potwierdzeniu bezpowrotnie usuwa ono uczestników tego wydarzenia, tokeny, wyniki, historię oraz sesje. Pliki zdjęć pozostają na dysku, ponieważ mogą być używane w innych edycjach. Jeśli wydarzenie było podstawą kolejnej edycji, jej zapisane wykluczenia poprzednich przydziałów pozostają aktywne.

### Następny rok

Tworząc nowe wydarzenie, wybierz kopiowanie z zakończonej edycji. Skopiowane zostaną identyfikatory osób, nazwy, zdjęcia i wykluczenia. Przydziały z wybranej poprzedniej edycji są dodatkowo wykluczone. Wydaj nowe kody. Poprzednia edycja zachowuje wyniki i zaproszenia.

## Uczestnicy i zdjęcia

Uczestnik skanuje QR lub otwiera prywatny link. Serwer wymienia token na sesję HttpOnly i przekierowuje na `/`, usuwając token z widocznego adresu. Po otwarciu prezentu pokazuje tylko jego odbiorcę. „Pokaż jeszcze raz” powtarza efekt, nie losowanie. Sesja uczestnika trwa 30 dni; ważny kod umożliwia ponowne logowanie. Sesja organizatora trwa 12 godzin. Każdy może się wylogować.

Zdjęcia JPG/JPEG, PNG i WebP umieszczaj w `/app/data/photos`. Dla domyślnego wolumenu:

```sh
docker compose cp ./anna.jpg secret-santa:/app/data/photos/anna.jpg
```

Plik musi być czytelny dla użytkownika `node` (np. uprawnienia `644`). W trybie bind skopiuj go do `./data/photos/anna.jpg`. W panelu wpisz `anna.jpg` w polu uczestnika. Nazwa może zawierać litery ASCII, cyfry, `_`, `-` i kropkę; bez katalogów i `..`. Brak zdjęcia wyświetla ilustrację Mikołaja.

Zdjęcia nie są publiczne. `/api/me/photo` ustala odbiorcę na podstawie sesji, bez identyfikatora i ścieżki od użytkownika. Serwer blokuje też dowiązania prowadzące poza katalog zdjęć.

### Żarty, teksty i obrazki w tle

Wszystkie losowe teksty są w jednym pliku: **`client/public/content-pool.json`**. Przy każdym wejściu na stronę aplikacja losuje z list m.in.: nagłówek strony głównej (`kickers`), powitanie (`greetings`, znacznik `{name}`), żarty (`jokes`), rady elfów (`tips`), teksty pod imieniem wylosowanej osoby (`revealQuips`, znaczniki `{recipient}`), komunikaty podczas otwierania prezentu (`openingMessages`), teksty przed losowaniem (`waitingMessages`, `readyMessages`), komentarze Mikołaja po szturchnięciu prezentu (`giftClicks`), teksty latającego Mikołaja (`santaQuips`) i komentarze do odliczania do Wigilii (`countdown`). Lista `decor` to ścieżki do obrazków, które bujają się w tle (6 losowych przy każdym wejściu). Wystarczy dopisać nowy wpis do dowolnej listy. Uszkodzony wpis jest pomijany, a pusta lub błędna lista wraca do wartości domyślnej. W dev odśwież stronę; Docker wymaga `docker compose up -d --build`.

Mikołaj na saniach przelatuje przez ekran raz w jedną, raz w drugą stronę (nie na stronie organizatora). Grafikę zmienisz w `client/public/assets/decor/sleigh.svg`; własne obrazki do tła dodaj do `client/public/assets/decor/` i wpisz do `decor`. Przycisk „Spokojny tryb” i ustawienie `prefers-reduced-motion` wyłączają latającego Mikołaja i animacje.

### Własna pula memów i GIF-ów

Edytuj **`client/public/media-pool.json`**. Ekran uczestnika losuje jeden blok przy załadowaniu; „Inny żart 🎲” wybiera kolejny. Domyślna pula zawiera zewnętrzne GIF-y z GIPHY i własne lokalne ilustracje. Adresy obrazów są osadzane bezpośrednio, bez iframe, skryptów reklamowych ani przekazywania imienia czy wyniku dostawcy grafiki. Przeglądarka pobiera obraz od jego dostawcy, z wyłączonym nagłówkiem Referer. Niedostępny obraz zastępuje lokalny kot.

Przykładowy wpis do tablicy JSON:

```json
{
  "src": "https://twoj-serwis.example/smieszny-renifer.gif",
  "poster": "/assets/jokes/reindeer.svg",
  "type": "gif",
  "alt": "Renifer po świątecznych zakupach",
  "caption": "Ja po zakupie ostatniego prezentu o 23:59.",
  "icon": "🦌",
  "credit": "Autor grafiki",
  "sourceUrl": "https://twoj-serwis.example/strona-autora"
}
```

`src` musi być bezpośrednim linkiem HTTPS do obrazu/GIF-a albo ścieżką lokalną zaczynającą się od `/`. Link do strony GIPHY nie jest linkiem do obrazu — użyj jej adresu pliku GIF. `poster` to statyczny obraz używany zamiast animacji w spokojnym trybie; bez niego GIF zastąpi lokalna ilustracja. Dla statycznych memów ustaw `type: "image"`. `alt` i `caption` są wymagane; ikona i informacje o autorze są opcjonalne. Pusta lub niepoprawna pula daje lokalny obrazek zastępczy. Obsługujemy do 50 wpisów.

Lokalne pliki możesz dodawać do `client/public/assets/memes/` i podawać np. `/assets/memes/moj-mem.jpg`. Aby wyłączyć zewnętrzne grafiki, pozostaw wyłącznie wpisy z lokalnymi `src` i `poster`. W dev wystarczy odświeżyć stronę po zmianie JSON; Docker wymaga `docker compose up -d --build`, a `npm start` ponownego `npm run build`.

Źródła domyślnych GIF-ów: [Noam Sussman](https://giphy.com/gifs/animation-funny-dance-l2JhGa1nx4ir3zj20), [Mauro Gatti](https://giphy.com/gifs/christmas-xmas-santa-claus-xTk9ZLRMhW9wrSUf4c), [JustViral](https://giphy.com/gifs/justviralnet-cat-mood-festive-KzKHlzSlfHZV44EdTy). Odnośnik do autora jest również widoczny na karcie.

## Konfiguracja i reverse proxy

| Zmienna           | Znaczenie                                                                                                   |
| ----------------- | ----------------------------------------------------------------------------------------------------------- |
| `ADMIN_PASSWORD`  | Wymagane hasło organizatora, min. 12 znaków; nie trafia do JSON ani frontendu.                              |
| `PUBLIC_BASE_URL` | Wymagany publiczny adres aplikacji. Źródło adresów QR i dozwolonego Origin. HTTPS włącza ciasteczka Secure. |
| `PORT`            | Domyślnie 3000. Compose ustawia 3000 wewnątrz kontenera.                                                    |
| `DATA_DIR`        | Lokalnie `./data`, w kontenerze `/app/data`.                                                                |
| `TRUST_PROXY`     | Domyślnie puste. Lista zaufanych adresów/CIDR proxy, oddzielonych przecinkami.                              |

Wystaw aplikację przez własny reverse proxy z TLS. Fragment Nginx (zakłada istniejący certyfikat i proxy na hoście):

```nginx
server {
    listen 443 ssl;
    server_name swieta.example.pl;
    ssl_certificate /etc/letsencrypt/live/swieta.example.pl/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/swieta.example.pl/privkey.pem;
    # URI /invite/TOKEN nie może trafiać do logów.
    access_log off;
    error_log /var/log/nginx/santa-error.log crit;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $remote_addr;
    }
}
```

Ustaw `PUBLIC_BASE_URL=https://swieta.example.pl`. Ustaw `TRUST_PROXY` tylko na faktyczny adres proxy widoczny przez kontener, bez globalnego `true` czy `0.0.0.0/0`. Proxy musi nadpisywać nagłówki klienta. Przy proxy na hoście ogranicz publikację portu w Compose do `127.0.0.1:3000:3000`, aby nie można było ominąć proxy z Internetu. Przy proxy w Dockerze użyj prywatnej sieci i zaufanego adresu proxy. Nie loguj pełnych URI zaproszeń także w load balancerze, analityce i monitoringu.

Aplikacja używa SHA-256 dla 256-bitowych losowych tokenów dostępu i sesji, HttpOnly, SameSite=Lax, kontroli Origin i tokenów CSRF, limitów żądań i logowania, nagłówków Helmet, `Referrer-Policy: no-referrer` i `Cache-Control: no-store`. Nie zapisuje wyników ani tokenów w localStorage. QR to klucz dostępu — przekaż go tylko właściwej osobie. Zmiana domeny wymaga nowych QR; wyniki pozostają bez zmian.

## Backup i odtwarzanie

JSON, sesje i zdjęcia to prywatne dane. Backup przechowuj bezpiecznie. Zatrzymaj serwer przed kopiowaniem:

```sh
docker compose stop
docker compose cp secret-santa:/app/data ./backup-2026-12-01
docker compose start
```

Dla bind skopiuj cały `./data` po zatrzymaniu serwera. Odtwarzanie na istniejącym kontenerze:

```sh
docker compose stop
docker compose cp ./backup-2026-12-01/. secret-santa:/app/data
docker compose start
```

Sprawdź układ backupu: `database.json` ma trafić bezpośrednio do `/app/data`, zdjęcia do `/app/data/photos`. Zachowaj kopię bieżących danych i uprawnienia użytkownika `node` (UID 1000). Nie edytuj bazy podczas pracy serwera. Niepoprawny JSON przerywa start zamiast nadpisywać bazę. Atomowy zapis nie zastępuje backupu na wypadek awarii dysku.

### Aktualizacja

Wykonaj backup, pobierz nową wersję źródeł i uruchom `docker compose up -d --build`. Wolumen pozostaje na miejscu.

### Zmiana hasła organizatora

Zmień `ADMIN_PASSWORD` w `.env` i wykonaj `docker compose up -d --force-recreate`. Dotychczasowe sesje administratora przestaną działać — są powiązane ze skrótem wersji hasła. Kody uczestników i wyniki nie zmienią się.

## Wersja produkcyjna bez Dockera

Wymagany Node.js 24 i npm. Utwórz `.env`, ustaw hasło oraz `PUBLIC_BASE_URL=http://localhost:3000`:

```sh
npm ci
npm test
npm run build
npm start
```

Frontend i API działają na porcie 3000. `npm start` wczytuje `.env` (zmienne procesu mają pierwszeństwo) i wymaga wcześniejszego `npm run build`. Do pracy nad frontendem użyj opisanego wyżej `npm run dev`, który wczytuje osobną konfigurację i nie wymaga kompilacji.

### Najczęstsze problemy

| Objaw                                                   | Sprawdź                                                                                                        |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| „Nieprawidłowe źródło żądania”                          | Otwórz dokładny adres `PUBLIC_BASE_URL`, z właściwym protokołem, hostem i portem.                              |
| Logowanie udane, ale sesja znika                        | Dla zwykłego lokalnego HTTP adres musi zaczynać się od `http://`, nie `https://`.                              |
| Stary QR nie działa                                     | Adres zmienił się między trybami albo kod został ponownie wydany. Wydaj nowy QR we właściwej wersji aplikacji. |
| Port zajęty                                             | Zatrzymaj poprzedni proces; w dev zmień razem `PORT` i port w `PUBLIC_BASE_URL`.                               |
| Dev pokazuje inne wydarzenia niż Docker                 | To zamierzone: `data-dev` i wolumen Dockera to osobne magazyny.                                                |
| Docker nie może połączyć się z silnikiem                | Uruchom Docker Desktop w trybie Linux containers; sprawdź `docker info`.                                       |
| Po zmianie `.env` konfiguracja Dockera się nie zmieniła | Wykonaj `docker compose up -d --force-recreate`.                                                               |

## Struktura i weryfikacja

```text
client/src/          React: strony, komponenty, hooki (pula treści, odkrywanie wyniku)
client/public/       Ilustracje SVG, content-pool.json, media-pool.json
server/app.ts        REST API, sesje, CSRF, QR, bezpieczne zdjęcia
server/index.ts      Konfiguracja, start i łagodne wyłączenie
server/storage/      Kolejka, kopia stanu, fsync pliku i atomowy rename
server/services/     Losowy backtracking z ograniczeniami i limitem pracy
shared/              Typy danych
tests/               Testy algorytmu, dysku i HTTP
REQUIREMENTS.md      Oryginalna specyfikacja
```

`npm test` weryfikuje poprawność losowania, duplikaty, losowanie siebie i wzajemne pary, wykluczenia, brak rozwiązania, równoczesne zapisy, restart magazynu, błędy zapisu i uszkodzoną bazę, równoczesne losowania, QR, prywatność API, CSRF, zdjęcia, rotację i unieważnianie tokenów, wylogowanie i nową edycję bez poprzednich przydziałów. `npm run build` sprawdza TypeScript i buduje frontend oraz backend. Docker uruchamia testy w etapie budowania.

Kolejka modyfikuje kopię stanu, zapisuje i synchronizuje plik tymczasowy, atomowo zastępuje JSON, a dopiero po sukcesie podmienia pamięć. Nieudana operacja nie zatruwa kolejki. Losowanie i kontrola jednorazowości odbywają się w tej samej transakcji. SIGTERM zamyka serwer i czeka na obsługę żądań oraz kolejkę zapisów.
