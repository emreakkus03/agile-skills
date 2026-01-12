# 💧 Gent Waterpunten

A Next.js application that maps free drinking water spots in Ghent using public data from Stad Gent. It includes features for users to find and navigate to fountains, and an admin interface to manage issue reports and generate QR codes for physical signage.

## Features

### Public View
- **Interactive Map**: Displays all drinking water locations in Ghent using Leaflet.
- **Details & Navigation**: Click any point to see details and get direct navigation via Google Maps.
- **Usage Tracking**: Anonymous tracking of how many times navigation is requested for each fountain.
- **Reporting**: Users can report issues (broken, dirty, low pressure) directly from the app.
- **QR Support**: URL parameter support (`?id=...`) for opening specific water points, used for QR codes on physical fountains.

### Admin Dashboard (`/admin`)
- **Issue Management**: View and dismiss user-reported issues.
- **QR Generator**: Search for any water point and generate a printable QR code sticker.
- **Analytics**: View usage statistics to see which fountains are most frequently navigated to.

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Maps**: [Leaflet](https://leafletjs.com/) & [React-Leaflet](https://react-leaflet.js.org/)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL)
- **Data Source**: [Open Data Stad Gent](https://data.stad.gent/explore/dataset/drinkwaterplekken-gent/)

## Getting Started

### Prerequisites
- Node.js 18+
- A Supabase project

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd water-gent
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) to see the map.
   Open [http://localhost:3000/admin](http://localhost:3000/admin) to access the dashboard.

## Database Schema

The application expects the following Supabase tables:

- **`reports`**: Stores issue reports from users.
  - `id`, `created_at`, `waterpunt_id`, `issue_type`, `description`, `status`
- **`waterpoint_usage`**: Logs interactions for analytics.
  - `id`, `created_at`, `waterpoint_id`
- **`issue_types`** (Optional): Configurable list of issue categories.

## License

This project is for educational/demo purposes. Data provided by **Stad Gent Open Data Portal**.
