# LeakChecker

Mobilna aplikacja menedżera haseł z weryfikacją wycieków.

## MVP Scope

- Logowanie / Rejestracja
- Sejf do przechowywania haseł
- Generator haseł + passphrase
- Sprawdzenie wycieków (email, hasło)
- Jednorazowe linki do przesyłania haseł
- Dark/Light mode

## Struktura Repo

``` bash
/backend       - API serwer
/mobile        - Aplikacja mobilna
/docs          - Dokumentacja
```

## Jak Uruchomić (dev)

#### 1. Utwórz plik .env
``` bash
cp .env.example .env
```
Obecnie ustawienia odczytywane są z pliku `.env`, który trzeba utworzyć w głównym folderze projektu.  
Projekt zawiera przykładowy plik `.env.example`, który należy dostosować do swoich potrzeb.

#### 2. Zbuduj kontenery Dockera
``` bash
docker compose build
``` 
Buduje obrazy dla backendu i bazy danych na podstawie plików `Dockerfile` i `docker-compose.yml`.

#### 3. Uruchom projekt
``` bash
docker compose up
``` 
Uruchamia aplikację backendową oraz bazę danych.

Baza danych PostgreSQL jest tworzona automatycznie przy uruchomieniu kontenera `db`.  
Nie wymaga ręcznej konfiguracji — Docker Compose korzysta z pliku `.env`, aby ustawić użytkownika, hasło i nazwę bazy.


#### 4. Sprawdź działanie backendu
Backend będzie dostępny pod adresem: `http://localhost:8000`

#### 5. Zatrzymanie projektu
``` bash
docker compose down
``` 
Zatrzymuje i usuwa kontenery (ale nie usuwa danych z wolumenu Postgresa).

#### 6. Usunięcie danych bazy (opcjonalne)
``` bash
docker compose down -v
``` 
Usuwa również wolumen postgres_data, czyli wszystkie dane bazy.

## Projekt Zarządzania

Backlog i Sprint Planning w GitHub Projects: https://github.com/users/Pkepowicz/projects/5
