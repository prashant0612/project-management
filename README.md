# Project Management App

A full-stack project management application with role-based access control.

## Features

- User authentication with JWT
- Role-based access (Admin, Manager, Member)
- Project and task management
- Kanban board view
- Task status tracking
- Dashboard with statistics

## Tech Stack

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT Authentication
- bcryptjs for password hashing

### Frontend
- Next.js 14
- Tailwind CSS
- React Hooks
- Axios for API calls
- date-fns for date formatting

## Project Structure
project-management-app/
├── backend/ # Node.js + Express backend
├── frontend/ # Next.js frontend
└── README.md


## Installation

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local or Atlas)

### Backend Setup

1. Navigate to backend folder:
```bash
cd backend

2. Install dependencies:
npm install

3.start Server
npm run dev