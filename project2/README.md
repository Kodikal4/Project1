# Anna Johnson Flooring Sales & Installation

A full-stack web application for managing flooring catalog items, client project requests (with room dimensions and site photos), version-controlled quotes with waste-factor calculations, order creation, negotiation messaging, and version-controlled billing with disputes and payments.

## Tech Stack
- **Frontend:** HTML, CSS, Vanilla JavaScript (`index.html`, `styles.css`, `app.js`)
- **Backend:** Node.js, Express, Multer (photo uploads), `mysql2`
- **Database:** MySQL (`flooring_business`)

## Database Schema Overview
Enforces foreign key relationships across:
- `clients` and `flooring_products`
- `flooring_requests`, `room_areas`, and `project_photos`
- `quotes`, `quote_items`, and `negotiation_messages`
- `orders`
- `bills`, `bill_disputes`, and `payments`

## Setup & Installation

1. **Clone the repository and navigate to the project folder:**
   ```bash
   git clone <your-repo-url>
   cd <your-project-folder>
   ```

2. **Create the MySQL database and run the schema script:**
   ```sql
   CREATE DATABASE IF NOT EXISTS flooring_business;
   USE flooring_business;
   -- Run your schema .sql file here
   ```

3. **Configure environment variables:**
   Create a `.env` file (do not commit this file) with your MySQL credentials:
   ```env
   PORT=5000
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=flooring_business
   ```

4. **Install dependencies and start the server:**
   ```bash
   npm install
   node server.js
   ```
   Open `index.html` (or serve it via your static/local server) and switch between **Client View** and **Contractor View** as needed.

## End-to-End Workflow
1. **Catalog:** Add or view flooring products (`price_per_sqft`, waste percentage, box coverage).
2. **Project Request:** Submit a request with a valid `client_id`, address, and one or more rooms (length × width calculates square footage) plus optional photos (up to 5).
3. **Quotes & Negotiation:** Generate a quote version for a `request_id` (material quantity scales with `total_requested_area * (1 + waste_percentage / 100)`), exchange negotiation messages, and accept a quote to create an `orders` record.
4. **Billing, Disputes & Payments:** Switch to **Contractor View** on the **Billing** tab to generate a bill version using the `order_id`, then use the resulting `bill_id` (not `order_id`) when submitting dispute notes or recording payments.

## Key API Endpoints
- `GET /api/products`, `POST /api/products`
- `GET /api/requests`, `POST /api/requests`
- `GET /api/quotes`, `POST /api/quotes`, `POST /api/quotes/:quoteId/accept`
- `GET /api/requests/:requestId/messages`, `POST /api/requests/:requestId/messages`
- `GET /api/bills`, `POST /api/bills`, `POST /api/bills/:billId/disputes`, `POST /api/bills/:billId/pay`
