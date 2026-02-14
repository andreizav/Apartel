# ApartEl PMS

ApartEl is a modern Property Management System (PMS) designed specifically for apartels and short-term rentals. Built with **Angular 21** (Standalone, Zoneless) and **TailwindCSS**, it offers a sleek, high-performance interface for managing properties, bookings, and operations.

## 🚀 Features

- **Multi-Calendar**: Visual booking management across all properties with fullscreen mode, drag-select date ranges, and real-time occupancy tracking.
- **Channel Manager**: Sync availability and rates with OTAs (Online Travel Agencies). Includes a Channel Simulator for testing.
- **Property Management**: Manage units with an Overview dashboard featuring OTA listing embeds (Airbnb, Booking.com), performance stats, inventory tracking, and P&L per unit.
- **Operations**:
  - **Staff Management**: Track staff tasks and schedules.
  - **Client Management**: CRM for guest details, communication history, and booking records.
  - **Communications**: Integrated messaging system (WhatsApp, Telegram).
- **Financials**:
  - **Dashboard**: Real-time overview of occupancy, revenue, and key metrics with interactive charts.
  - **P&L**: Profit and Loss reporting with multi-currency support (USD, EUR, UAH) and period-based filtering.
- **Authentication**: Secure JWT-based login and role-based access.

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Angular 21 (Standalone Components, Zoneless Change Detection) |
| **Styling** | TailwindCSS 3.4 |
| **Visualization** | D3.js 7.9 |
| **Data** | RxJS, XLSX (Excel export/import) |
| **Backend** | NestJS 11 (TypeScript) |
| **Database** | SQLite via Prisma ORM |
| **Architecture** | SPA + REST API |

## 🏁 Getting Started

### Prerequisites
- **Node.js**: Latest LTS recommended

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/andreizav/ApartEl.git
    cd ApartEl
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    cd server-nest && npm install && cd ..
    ```

3.  **Set up the database:**
    ```bash
    cd server-nest
    cp .env.example .env    # Configure your environment
    npx prisma generate
    npx prisma db push      # Sync schema with dev.db
    cd ..
    ```

### Running Locally

**Start both frontend and backend concurrently:**
```bash
npm start
```

Or run them separately:

```bash
# Backend API (http://localhost:4000)
npm run server

# Frontend (http://localhost:3000)
npm run dev
```

### Default Login
- **Email**: `alice@demo.com`
- **Password**: `password`

## 📂 Project Structure

```
ApartEl/
├── server-nest/              # NestJS Backend API
│   ├── prisma/               # Prisma Schema & SQLite DB
│   │   └── schema.prisma     # Database Models
│   ├── src/                  # Source code
│   │   ├── modules/          # Feature modules
│   │   └── shared/           # Shared services
│   └── main.ts               # Server entry point
├── src/
│   ├── app/                  # Angular Application Source
│   │   ├── channel-manager/  # OTA channel management
│   │   ├── channel-simulator/# Channel testing simulator
│   │   ├── clients/          # Client CRM
│   │   ├── communications/   # Messaging system
│   │   ├── dashboard/        # Analytics & home dashboard
│   │   ├── db-simulator/     # Real-time DB viewer
│   │   ├── inventory/        # Inventory management
│   │   ├── login/            # Authentication
│   │   ├── multi-calendar/   # Booking calendar (fullscreen)
│   │   ├── pnl/              # Profit & Loss reports
│   │   ├── properties/       # Property & unit management
│   │   ├── settings/         # App settings
│   │   ├── staff/            # Staff management
│   │   └── shared/           # Services, models, pipes
│   └── environments/         # Environment configurations
└── angular.json              # Angular CLI configuration
```

## 🔒 Security & Best Practices

- **Environment Variables**: Never commit `.env` files. Use `.env.example` as a template.
- **Authentication**: JWT-based authentication handled by the backend.
- **Database**: Prisma provides type-safe access to SQLite.

## 📡 API Endpoints

The `server-nest/` app provides the following RESTful endpoints:

- **Auth**: `POST /api/auth/login`, `POST /api/auth/register`
- **Core**: `GET /api/bootstrap`, `POST /api/bootstrap/reset`
- **Properties**: `GET/PUT /api/portfolio`, `DELETE /api/portfolio/units/:id`
- **Bookings**: `GET/POST /api/bookings`
- **CRM**: `GET/POST/PATCH/DELETE /api/clients`, `GET/POST/PATCH/DELETE /api/staff`
- **Finance**: `GET/POST /api/transactions`, `GET/PUT /api/inventory`
- **Channels**: `GET/PUT /api/channels/mappings|ical|ota`, `POST /api/channels/sync`
- **Settings**: `GET/PUT /api/settings`, `GET/PATCH /api/tenants/me`
