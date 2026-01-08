# TailorAI

TailorAI is a modern web application designed for premium outfit generation and user management. It features a robust backend powered by Fastify, PostgreSQL for data persistence, and integrated AI-driven image generation using OpenAI's DALL-E.

## Features

- **User Authentication**: Secure Login/Signup with support for:
  - Google OAuth 2.0
  - Apple SignIn
  - Local Email/Password
- **AI Image Generation**: Specialized scripts to generate high-quality outfit images using OpenAI.
- **Project Management**: Creation and management of slide projects (slide decks).
- **Dashboard**: A clean interface for managing user profiles and projects.
- **Docker Ready**: Fully containerized environment for easy deployment.

## Technology Stack

- **Backend**: [Fastify](https://www.fastify.io/) (TypeScript)
- **Database**: [PostgreSQL](https://www.postgresql.org/)
- **Authentication**: Passport.js + JWT
- **AI**: OpenAI API (DALL-E)
- **Templating**: EJS
- **Containerization**: Docker & Docker Compose

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)
- OpenAI API Key
- Google Cloud Console Credentials (for OAuth)

### Environment Variables

Create a `.env` file in the root directory and add the following:

```env
FASTIFY_PORT=3000
HOST=http://localhost:3000
COOKIE_SECRET=your_cookie_secret_at_least_32_chars
OPENAI_API_KEY=your_openai_api_key

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Database
DB_HOST=localhost (set to 'postgres' if using Docker)
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=tailorai_db
DB_PORT=5433
```

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/md-fahad-ali/tailorai.git
    cd tailorai
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Run migrations / Init DB**:
    If running locally, ensure PostgreSQL is running and execute `db/init.sql`.

4.  **Start the development server**:
    ```bash
    npm run dev
    ```

## Docker Usage

The project is fully containerized. You can start the server and the PostgreSQL database with a single command:

```bash
docker-compose up --build
```

This will:
-   Start a **PostgreSQL** instance on port `5432`.
-   Run initial database setup from `db/init.sql`.
-   Start the **Fastify server** on port `3000`.

## Scripts

- `npm run build`: Compiles TypeScript to JavaScript.
- `npm run dev`: Starts the server in development mode with `nodemon`.
- `npm run start`: Builds and starts the production server.
- `scripts/backup.sh`: Utility for database backups.

## License

ISC
