# GrimAIO - Roblox Script Key Shop

## Original Problem Statement
Create a website for Roblox script keys similar to GrimScripts with Stripe payment integration. Users can buy keys (Monthly €9.27 / Lifetime €17.38), and join Discord. Website name: GrimAIO.

## Architecture
- **Frontend**: React with Tailwind CSS, Shadcn UI components
- **Backend**: FastAPI with MongoDB
- **Payment**: Stripe integration via emergentintegrations
- **Styling**: Dark terminal/hacker theme with neon green (#00FF00) accents

## User Personas
1. **Gamers**: Roblox players looking for script automation tools
2. **Script Users**: Power users who need monthly or lifetime access

## Core Requirements (Static)
- [x] Product display with Monthly/Lifetime pricing
- [x] Quantity selector (1-10)
- [x] Shopping cart functionality
- [x] Stripe checkout integration
- [x] Discord join link
- [x] Script key generation on successful payment
- [x] Success page with key display

## What's Been Implemented (Jan 2026)
1. **Homepage** - Dark themed landing with product selection terminal
2. **Product Cards** - Monthly (€9.27) and Lifetime (€17.38) licenses
3. **Cart System** - Sheet-based cart with checkout
4. **Stripe Payment** - Full checkout flow with test keys
5. **Key Generation** - Automatic GRIM-XXXX-XXXX-XXXX format keys
6. **Success Page** - Shows purchased keys with copy functionality
7. **Discord Link** - https://discord.gg/t2VrGXbTV

## API Endpoints
- `GET /api/products` - List all products
- `GET /api/products/{id}` - Get single product
- `POST /api/checkout` - Create Stripe checkout session
- `GET /api/checkout/status/{session_id}` - Poll payment status
- `POST /api/webhook/stripe` - Stripe webhook handler

## Database Collections
- `payment_transactions` - Payment records
- `script_keys` - Generated script keys

## Prioritized Backlog
### P0 (Critical)
- None remaining

### P1 (Important)
- User authentication system
- Key redemption/validation API
- Admin dashboard for key management

### P2 (Nice to Have)
- Email notifications on purchase
- Multiple language support
- Key usage tracking

## Next Tasks
1. Add user authentication for key management
2. Build admin dashboard to view all purchases
3. Add key validation API for script integration
