# MediSocial

## Description

MediSocial is a professional social networking web application specifically designed for the medical and dental community. It aims to connect professionals, facilitate collaboration, and provide a platform for sharing knowledge and expertise, combining features from platforms like LinkedIn and Instagram within a user-friendly interface.

**Current Core Features:**

*   OTP (SMS) based Authentication
*   User Profiles (View, Edit Name/Bio/Skills, Avatar Upload)
*   Follow/Unfollow System (with Follower/Following Lists & Counts)
*   User Search (by Name or Skill)
*   Post Creation (Text & Image)
*   Post Feed (Following + Own Posts) with Pagination
*   Post Display on Profiles (Grid View)
*   Post View Modal with Edit/Delete options (for own posts)
*   Post Like/Unlike System
*   Basic Comment System (with 1-level Replies & Likes)

## Tech Stack

*   **Backend:** Laravel (PHP Framework)
*   **Frontend:** React (TypeScript) with Vite
*   **UI Library:** Material UI (MUI)
*   **Database:** MySQL (or PostgreSQL)
*   **API Style:** RESTful API with Laravel Sanctum (SPA Authentication)
*   **SMS Provider:** sms.ir (Integration needed)

## Project Setup & Installation

**(This section needs detailed steps based on your final setup)**

**Prerequisites:**

*   PHP (Specify version, e.g., >= 8.2)
*   Composer
*   Node.js & npm/yarn
*   MySQL (or chosen database)
*   A web server (like Nginx or Apache, or use `php artisan serve` for development)
*   An account with `sms.ir` for OTP functionality.

**Backend Setup (Laravel):**

1.  Clone the repository: `git clone <repository-url>`
2.  Navigate to the backend directory: `cd <backend-folder-name>` (e.g., `medical-social-app`)
3.  Install PHP dependencies: `composer install`
4.  Copy `.env.example` to `.env`: `cp .env.example .env`
5.  Generate application key: `php artisan key:generate`
6.  **Configure `.env`:**
    *   Set `APP_URL` (e.g., `http://localhost:8000`)
    *   Set `FRONTEND_URL` (e.g., `http://localhost:5173`)
    *   Configure `DB_*` variables for your database connection.
    *   Configure `SANCTUM_STATEFUL_DOMAINS` (e.g., `localhost:5173`).
    *   Configure `SESSION_DOMAIN` (e.g., `localhost`).
    *   **Add `SMS_IR_*` variables:** (Add variables needed for `sms.ir` API Key, Line Number etc.)
7.  Run database migrations: `php artisan migrate`
8.  (Optional) Seed the database (e.g., for skills): `php artisan db:seed`
9.  Create the storage symlink: `php artisan storage:link`
10. (If using Queue for notifications later): Configure queue driver in `.env` and run `php artisan queue:work`.
11. Start the Laravel development server: `php artisan serve` (or configure your web server).

**Frontend Setup (React):**

1.  Navigate to the frontend directory: `cd <frontend-folder-name>` (e.g., `frontend`)
2.  Install Node.js dependencies: `npm install` (or `yarn install`)
3.  **Configure Environment Variables:**
    *   Create a `.env` file in the frontend root directory.
    *   Add `VITE_APP_URL=http://localhost:8000` (or your Laravel backend URL). Make sure the `APP_URL` constant in React components uses this variable (`import.meta.env.VITE_APP_URL`).
4.  Start the React development server: `npm run dev` (or `yarn dev`).

**Accessing the App:**

*   Open your browser and navigate to the frontend URL (e.g., `http://localhost:5173`).
*   The Admin Panel (if Filament is setup) is usually at `<backend-url>/admin` (e.g., `http://localhost:8000/admin`).

## Key Project Structure Points

*   **Backend (`medical-social-app`):** Standard Laravel structure.
    *   `app/Http/Controllers/Api/`: Controllers handling API requests.
    *   `app/Models/`: Eloquent models.
    *   `app/Policies/`: Authorization policies.
    *   `routes/api.php`: API route definitions.
    *   `database/migrations/`: Database schema migrations.
    *   (If using Filament) `app/Filament/`: Filament resources and configuration.
*   **Frontend (`frontend`):** React/Vite structure.
    *   `src/pages/`: Components representing full pages/views.
    *   `src/components/`: Reusable UI components (e.g., `PostCard`, `UserList`, `CommentSection`).
    *   `src/context/AuthContext.tsx`: Global state management for authentication.
    *   `src/api/axiosConfig.ts`: Axios instance configuration.
    *   `src/types/`: TypeScript type definitions (Recommended).

## Future Development / TODOs

*   Implement Comment Replies (multi-level).
*   Implement Comment Edit/Delete.
*   Implement Post Image Update/Delete.
*   Complete Admin Panel (User Management, Post Management, etc.).
*   Implement User Profile Picture Upload UI in Edit Profile.
*   Implement Notification System (In-app & SMS).
*   Implement User Settings Page.
*   Implement Content Moderation.
*   Implement "Forgot Password" (if using password login later).
*   Integrate with `sms.ir` for OTP and notifications.
*   Refactor API responses using Laravel API Resources.
*   Improve UI/UX (Skeleton loaders, animations, theming).
*   Add Unit and Feature Tests.
*   Deployment setup.
*   (Add other specific features like Education, Forms, WooCommerce integration here).

## Contribution

(Add guidelines if you plan for others to contribute).

---