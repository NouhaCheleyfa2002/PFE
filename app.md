# EduShare App Documentation

## App Structure

- **backend/** (NestJS API)
  - `src/`
    - `auth/` — authentication, registration, JWT, role-based access
    - `notification/` — notification queue (BullMQ)
    - `upload/` — file upload logic
    - `admin/` — admin-only endpoints (worker tasks, user management)
    - `app.module.ts` — main module wiring
    - `main.ts` — app bootstrap
  - `.env` — environment variables (admin credentials, DB, etc)
- **front/** (Next.js React frontend)
  - `app/`
    - `auth/` — login/register page
    - `dashboard/` — main dashboard (role-based layout)
      - `admin/` — admin-only pages (worker tasks, users)
      - `library/`, `resources/`, etc — teacher/student content
    - `student/` — student dashboard
  - `components/` — UI components (Sidebar, Navbar, AuthScreen, etc)
  - `lib/` — auth logic, context, utilities

## Need of the App

EduShare is a platform for educational content sharing and management. It provides:
- **Role-based access**: Admin, Teacher, Student
- **Admin**: Can manage users, view all courses, monitor worker tasks (background jobs)
- **Teacher**: Can upload courses, build exams, manage resources
- **Student**: Can access library, view assignments, resources
- **Worker queue**: For background jobs (notifications, uploads, etc)

## User Flow

1. **First Launch**
   - Backend checks for admin in DB (using credentials from `.env`). If not found, creates one.
2. **Authentication**
   - User visits `/auth` and logs in (admin, teacher, or student)
   - On login, JWT is issued with user role
3. **Dashboard**
   - Sidebar and dashboard content are role-based:
     - **Admin**: Dashboard, Users, All Courses, Worker Tasks, Settings
     - **Teacher**: Dashboard, Library, My Resources, Upload, Exam Builder, AI Generator, Question Bank, Analytics, Settings
     - **Student**: Dashboard, My Courses, Assignments, Settings
4. **Admin Worker Tasks**
   - Admin can view `/dashboard/admin` to see all background jobs (BullMQ queue)
5. **Logout**
   - User can log out, clearing JWT and user info from local storage
