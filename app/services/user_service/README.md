# User Service

Ein Java 21 + Spring Boot 3.x Microservice für Benutzerverwaltung und Authentifizierung mit JWT-Token-Support.

## 🚀 Features

- **Benutzerregistrierung und -anmeldung**
- **JWT-Token-basierte Authentifizierung**
- **Benutzerverwaltung (CRUD-Operationen)**
- **Passwort-Hashing mit BCrypt**
- **DynamoDB-Integration**
- **Spring Security-Konfiguration**
- **Docker-Support**
- **LocalStack-Integration für lokale Entwicklung**

## 🛠️ Tech Stack

- **Java 21**
- **Spring Boot 3.4.1**
- **Spring Security 6.x**
- **AWS SDK für DynamoDB**
- **JWT (JSON Web Tokens)**
- **BCrypt für Passwort-Hashing**
- **Gradle 8.11.1**
- **Docker**

## 📋 API Endpoints

### Authentifizierung
- `POST /api/v1/auth/register` - Benutzerregistrierung
- `POST /api/v1/auth/login` - Benutzeranmeldung
- `POST /api/v1/auth/validate` - Token-Validierung
- `GET /api/v1/auth/me` - Aktuelle Benutzerinformationen

### Benutzerverwaltung
- `GET /api/v1/users` - Alle Benutzer abrufen
- `GET /api/v1/users/active` - Alle aktiven Benutzer abrufen
- `GET /api/v1/users/{userId}` - Benutzer nach ID abrufen
- `GET /api/v1/users/username/{username}` - Benutzer nach Benutzername abrufen
- `GET /api/v1/users/email/{email}` - Benutzer nach E-Mail abrufen
- `PUT /api/v1/users/{userId}` - Benutzer aktualisieren
- `PATCH /api/v1/users/{userId}/activate` - Benutzer aktivieren
- `PATCH /api/v1/users/{userId}/deactivate` - Benutzer deaktivieren
- `DELETE /api/v1/users/{userId}` - Benutzer löschen

### System
- `GET /api/v1/hello` - Hello World Test-Endpoint
- `GET /actuator/health` - Health Check

## 🏃‍♂️ Lokale Entwicklung

### Voraussetzungen
- Java 21
- Docker & Docker Compose
- AWS CLI (für LocalStack-Tests)

### Mit Docker Compose starten
```bash
# Aus dem Projekt-Root-Verzeichnis
docker-compose up -d

# Logs verfolgen
docker-compose logs -f user-service
```

### Manuell starten
```bash
cd app/services/user_service

# Build
./gradlew build

# Run
./gradlew bootRun
```

## 🧪 Testing

### Health Check
```bash
curl http://localhost:8081/actuator/health
```

### Hello World
```bash
curl http://localhost:8081/api/v1/hello
```

### Benutzerregistrierung
```bash
curl -X POST http://localhost:8081/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'
```

### Benutzeranmeldung
```bash
curl -X POST http://localhost:8081/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "usernameOrEmail": "testuser",
    "password": "password123"
  }'
```

### Mit JWT-Token authentifizierte Anfrage
```bash
# Token aus Login-Response verwenden
curl -X GET http://localhost:8081/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

## 🗄️ DynamoDB Schema

### Users Tabelle
- **Partition Key**: `userId` (String)
- **Attribute**:
  - `email` (String, unique)
  - `username` (String, unique)
  - `passwordHash` (String)
  - `firstName` (String)
  - `lastName` (String)
  - `role` (String) - USER, ADMIN
  - `active` (Boolean)
  - `createdAt` (String, ISO timestamp)
  - `updatedAt` (String, ISO timestamp)

## 🔧 Konfiguration

### Umgebungsvariablen
```bash
# AWS/DynamoDB
AWS_REGION=us-east-1
AWS_DYNAMODB_ENDPOINT=http://localstack:4566
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test

# JWT
JWT_SECRET=myVerySecretKeyForJWTTokenGenerationThatShouldBeAtLeast256BitsLong
JWT_EXPIRATION=86400000

# Server
SERVER_PORT=8081
```

## 🐳 Docker

### Image bauen
```bash
docker build -t user-service .
```

### Container starten
```bash
docker run -p 8081:8081 \
  -e AWS_DYNAMODB_ENDPOINT=http://localstack:4566 \
  -e AWS_REGION=us-east-1 \
  user-service
```

## 📝 Test-Daten

Das `init-dynamodb.sh` Skript erstellt automatisch Test-Benutzer:

1. **Admin User**
   - Username: `admin`
   - Email: `admin@example.com`
   - Password: `password` (BCrypt-Hash)
   - Role: `ADMIN`

2. **Test User**
   - Username: `testuser`
   - Email: `user@example.com`
   - Password: `password` (BCrypt-Hash)
   - Role: `USER`

## 🔒 Sicherheit

- Passwörter werden mit BCrypt gehashed
- JWT-Token für stateless Authentifizierung
- CORS-Konfiguration für Frontend-Integration
- Spring Security für Endpoint-Schutz
- Input-Validierung mit Bean Validation

## 🚨 Troubleshooting

### Häufige Probleme

1. **DynamoDB-Verbindungsfehler**
   - Stelle sicher, dass LocalStack läuft
   - Prüfe die Endpoint-Konfiguration

2. **JWT-Token-Fehler**
   - Überprüfe das JWT-Secret
   - Stelle sicher, dass der Token im Authorization-Header steht

3. **Build-Fehler**
   - Stelle sicher, dass Java 21 installiert ist
   - Prüfe die Gradle-Wrapper-Berechtigungen

### Logs anzeigen
```bash
# Docker Compose
docker-compose logs user-service

# Gradle
./gradlew bootRun --debug
``` 