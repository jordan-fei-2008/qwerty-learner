# GEMINI.md

## Project Overview

This project, **Qwerty Learner**, is a web application designed for keyboard workers to practice typing and memorize English words. It's particularly useful for developers who want to improve their typing speed and accuracy for both English and code.

The project is a monorepo with a React frontend and a Java Spring Boot backend.

### Frontend

The frontend is a modern React application built with Vite. It uses Tailwind CSS for styling and a variety of other libraries, including:

*   **State Management:** Jotai
*   **UI Components:** Headless UI, Radix UI
*   **Data Fetching:** SWR
*   **Database:** Dexie.js (IndexedDB wrapper)
*   **Routing:** React Router

### Backend

The backend is a Spring Boot application that provides a REST API for user authentication and data synchronization. It uses a SQLite database to store user data.

## Building and Running

### Prerequisites

*   Node.js and Yarn
*   Java 21 and Gradle

### Running the Backend

1.  Navigate to the `backend` directory:
    ```bash
    cd backend
    ```
2.  Run the application:
    ```bash
    ./gradlew bootRun
    ```
    The backend will be running on `http://localhost:8080`.

### Running the Frontend

1.  Navigate to the root directory of the project.
2.  Install the dependencies:
    ```bash
    yarn install
    ```
3.  Start the development server:
    ```bash
    yarn start
    ```
    The frontend will be running on `http://localhost:5173`.

## Development Conventions

### Linting and Formatting

The project uses ESLint for linting and Prettier for formatting. You can run the following commands to check and fix the code:

*   `yarn lint`
*   `yarn prettier`

### Testing

The project uses Playwright for end-to-end testing. You can run the tests with the following command:

```bash
yarn test:e2e
```

### Committing

The project uses Husky to run a pre-commit hook that formats the code with Prettier.
