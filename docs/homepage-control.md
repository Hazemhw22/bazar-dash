# Homepage Control System

This document explains how to use the Homepage Control system in Bazar-eCommerce to manage the content displayed to customers on the main homepage.

## Overview

The Homepage Control system allows administrators to manage three main types of content:

1. **Special Offers** - Promotional banners and deals
2. **Featured Products** - Products highlighted on the homepage
3. **Featured Stores** - Stores showcased to customers

## Setup

### 1. Database Setup

Run the SQL script to create the required tables:

```bash
# Execute the SQL script in your Supabase database
psql -h your-supabase-host -U your-username -d your-database -f scripts/create-homepage-tables.sql
```

Or copy and paste the contents of `scripts/create-homepage-tables.sql` into your Supabase SQL editor.

### 2. Access the Control Panel

Navigate to `/dashboard/homepage` in your admin dashboard to access the homepage control panel.

## Features

### Special Offers Management

**Create Offers:**
- Click "Add Offer" to create a new promotional offer
- Fill in the offer details:
  - **Title**: The main headline for the offer
  - **Description**: Detailed description of the offer
  - **Image URL**: Optional banner image for the offer
  - **Link URL**: Where customers will be directed when they click the offer
  - **Start Date**: When the offer becomes active (optional)
  - **End Date**: When the offer expires (optional)
  - **Active**: Toggle to enable/disable the offer

**Manage Offers:**
- Edit existing offers by clicking the edit button
- Delete offers by clicking the delete button
- Toggle offer visibility using the Active switch

### Featured Products Management

**Add Featured Products:**
- Click "Add Product" to feature a product on the homepage
- Select a product from the dropdown list
- Set the display position (1 = first, 2 = second, etc.)
- Toggle the Active switch to enable/disable

**Manage Featured Products:**
- Reorder products by changing their position numbers
- Remove products from the featured list
- Edit product settings

### Featured Stores Management

**Add Featured Stores:**
- Click "Add Store" to feature a store on the homepage
- Select a store from the dropdown list
- Set the display position
- Toggle the Active switch

**Manage Featured Stores:**
- Reorder stores by changing their position numbers
- Remove stores from the featured list
- Edit store settings

## Database Schema

### homepage_offers
```sql
- id: UUID (Primary Key)
- title: VARCHAR(255) NOT NULL
- description: TEXT
- image_url: TEXT
- link_url: TEXT
- is_active: BOOLEAN DEFAULT true
- start_date: DATE
- end_date: DATE
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### homepage_featured_products
```sql
- id: UUID (Primary Key)
- product_id: UUID (Foreign Key to products.id)
- position: INTEGER DEFAULT 1
- is_active: BOOLEAN DEFAULT true
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### homepage_featured_stores
```sql
- id: UUID (Primary Key)
- store_id: UUID (Foreign Key to stores.id)
- position: INTEGER DEFAULT 1
- is_active: BOOLEAN DEFAULT true
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

## API Functions

The system includes utility functions in `lib/homepage.ts`:

### For Public Display
- `getActiveOffers()` - Get active offers for homepage display
- `getFeaturedProducts()` - Get featured products
- `getFeaturedStores()` - Get featured stores
- `getHomepageContent()` - Get all homepage content at once

### For Management
- `createOffer(offerData)` - Create a new offer
- `updateOffer(id, offerData)` - Update an existing offer
- `deleteOffer(id)` - Delete an offer
- `addFeaturedProduct(productId, position)` - Add a featured product
- `removeFeaturedProduct(id)` - Remove a featured product
- `addFeaturedStore(storeId, position)` - Add a featured store
- `removeFeaturedStore(id)` - Remove a featured store

## Security

The system includes Row Level Security (RLS) policies:

- **Admins**: Full access to create, read, update, and delete all content
- **Vendors**: Read-only access to view featured products and stores
- **Customers**: Read-only access to view all content

## Best Practices

1. **Offers**:
   - Keep offer titles concise and compelling
   - Use high-quality images for better visual appeal
   - Set appropriate start and end dates for time-sensitive offers
   - Regularly review and update offers

2. **Featured Products**:
   - Feature your best-selling or most popular products
   - Keep the list manageable (5-10 products recommended)
   - Update regularly to keep content fresh

3. **Featured Stores**:
   - Showcase stores with good ratings and reviews
   - Include a mix of different store types
   - Update the list periodically

## Troubleshooting

### Common Issues

1. **Offers not displaying**: Check if the offer is active and within the date range
2. **Products not showing**: Verify the product exists and is active
3. **Stores not appearing**: Ensure the store is active and has the required information

### Error Messages

- "Failed to load homepage data": Check database connection and permissions
- "Failed to save offer": Verify all required fields are filled
- "Product already featured": Each product can only be featured once

## Integration with Frontend

To display the homepage content on your customer-facing website, use the utility functions:

```typescript
import { getHomepageContent } from '@/lib/homepage';

// In your homepage component
const { offers, featuredProducts, featuredStores } = await getHomepageContent();
```

This will provide you with all the active content that should be displayed to customers. 