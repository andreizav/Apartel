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
- **Backend**: Node.js (Express)
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

2.  **Install Frontend Dependencies:**
    ```bash
    npm install
    ```

3.  **Install Backend Dependencies:**
    ```bash
    cd server
    npm install
    cd ..
    ```

### Running Locally

You need to run both the backend API and the frontend application.

#### 1. Start the Backend Server
The server handles data persistence (JSON file-based) and API endpoints.

```bash
# From the project root
npm run server
```
*API runs at `http://localhost:4000`*

**Note:** Ensure you have a `.env` file in the `server/` directory. You can copy `server/.env.example` to `server/.env`.
```env
PORT=4000
JWT_SECRET=your_secret_key
CORS_ORIGIN=http://localhost:4200
```

#### 2. Start the Frontend Application
In a new terminal window:

```bash
# From the project root
npm run dev
```
*App runs at `http://localhost:4200`*

### Default Login
- **Email**: `alice@demo.com`
- **Password**: *(Check server seed data or use default if applicable)*

## 📂 Project Structure

```
d:\Projects\apartel.1.0\
├── server/                 # Node.js Express API
│   ├── data.json           # File-based database
│   └── index.js            # Server entry point
├── src/
│   ├── app/                # Angular Application Source
│   │   ├── channel-manager # Channel management features
│   │   ├── dashboard       # Analytics dashboard
│   │   ├── multi-calendar  # Booking calendar
│   │   ├── properties      # Property management
│   │   └── ...             # Other feature modules
│   ├── environments/       # Environment configurations
│   └── ...
└── angular.json            # Angular CLI configuration
```

## 🔒 Security & Best Practices

- **Environment Variables**: Never commit `.env` files.
- **Authentication**: JWT-based authentication is handled by the backend.
- **State Management**: Frontend uses local services; sensitive data is persisted only on the server.

## 📡 API Endpoints

The `server/` app provides the following RESTful endpoints:

- **Auth**: `POST /api/auth/login`, `POST /api/auth/register`
- **Core**: `GET /api/bootstrap` (Initial data load)
- **Properties**: `GET/PUT /api/portfolio`, `DELETE /api/portfolio/units/:id`
- **Bookings**: `GET/POST /api/bookings`
- **CRM**: `GET/POST/PATCH/DELETE /api/clients`, `GET/POST/PATCH/DELETE /api/staff`
- **Finance**: `GET/POST /api/transactions`, `GET/PUT /api/inventory`
- **Channels**: `GET/PUT /api/channels/mappings|ical|ota`, `POST /api/channels/sync`
- **Settings**: `GET/PUT /api/settings`, `GET/PATCH /api/tenants/me`
