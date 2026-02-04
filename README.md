# ApartEl PMS

ApartEl is a modern Property Management System (PMS) designed specifically for apartels and short-term rentals. Built with **Angular 21** (Standalone, Zoneless) and **TailwindCSS**, it offers a sleek, high-performance interface for managing properties, bookings, and operations.

## 🚀 Features

- **Multi-Calendar**: Visual management of bookings across all properties.
- **Channel Manager**: Sync availability and rates with OTAs (Online Travel Agencies). includes a Channel Simulator for testing.
- **Property Management**: Manage units, inventory, and property details.
- **Operations**:
  - **Staff Management**: Track staff tasks and schedules.
  - **Client Management**: CRM for guest details and history.
  - **Communications**: Integrated messaging system.
- **Financials**:
  - **Dashboard**: Real-time overview of occupancy and revenue.
  - **P&L**: Profit and Loss reporting and analytics.
- **Authentication**: Secure login and role-based access.

## 🛠️ Tech Stack

- **Frontend**: Angular 21 (Standalone Components, Zoneless Change Detection)
- **Styling**: TailwindCSS
- **Visualization**: D3.js (for charts and analytics)
- **Data Handling**: RxJS, XLSX (Excel export/import)
- **Backend**: NestJS (TypeScript)
- **Architecture**: Single Page Application (SPA) with server-side data persistence.

## 🏁 Getting Started

### Prerequisites
- **Node.js**: Ensure Node.js (Latest LTS recommended) is installed.

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/andreizav/ApartEl.git
    cd ApartEl
    ```

2.  **Install Application Dependencies:**
    ```bash
    npm install
    ```

3.  **Install Backend Dependencies:**
    ```bash
    cd server-nest
    npm install
    cd ..
    ```

### Running Locally

You need to run both the backend API and the frontend application.

#### 1. Start the Backend Server
The server handles data persistence using Prisma with a local SQLite database.

First, set up your environment:
1. Create a `.env` file in the `server-nest/` directory (see `.env.example`).
2. Run database setup:
```bash
cd server-nest
npx prisma generate
npx prisma db push # Sync schema with dev.db
```

Then start the server:
```bash
# From the project root
npm run server
```
*API runs at `http://localhost:4000`*

#### 2. Start the Frontend Application
In a new terminal window:

```bash
# From the project root
npm run dev
```
*App runs at `http://localhost:3000`*

### Default Login
- **Email**: `alice@demo.com`
- **Password**: `password` (if prompted, check `BootstrapService` for demo data)

## 📂 Project Structure

```
d:\Projects\ApartEl\
├── server-nest/            # NestJS Backend API
│   ├── prisma/             # Prisma Schema & SQLite DB
│   │   └── schema.prisma   # Database Models
│   ├── src/                # Source code
│   │   ├── modules/        # Feature modules
│   │   └── shared/         # Shared services
│   └── main.ts             # Server entry point
├── src/
│   ├── app/                # Angular Application Source
│   │   ├── channel-manager # Channel management features
│   │   ├── dashboard       # Analytics dashboard
│   │   ├── multi-calendar  # Booking calendar
│   │   ├── properties      # Property management
│   │   ├── db-simulator    # Real-time DB viewer
│   │   └── ...             # Other feature modules
│   ├── environments/       # Environment configurations
│   └── ...
└── angular.json            # Angular CLI configuration
```

## 🔒 Security & Best Practices

- **Environment Variables**: Never commit `.env` files. Use `.env.example` as a template.
- **Authentication**: JWT-based authentication is handled by the backend.
- **Database**: Prisma provides type-safe access to SQLite.

## 📡 API Endpoints

The `server-nest/` app provides the following RESTful endpoints:

- **Auth**: `POST /api/auth/login`, `POST /api/auth/register`
- **Core**: `GET /api/bootstrap`, `POST /api/bootstrap/reset` (Populate demo data)
- **Properties**: `GET/PUT /api/portfolio`, `DELETE /api/portfolio/units/:id`
- **Bookings**: `GET/POST /api/bookings`
- **CRM**: `GET/POST/PATCH/DELETE /api/clients`, `GET/POST/PATCH/DELETE /api/staff`
- **Finance**: `GET/POST /api/transactions`, `GET/PUT /api/inventory`
- **Channels**: `GET/PUT /api/channels/mappings|ical|ota`, `POST /api/channels/sync`
- **Settings**: `GET/PUT /api/settings`, `GET/PATCH /api/tenants/me`
