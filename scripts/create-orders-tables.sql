-- Create orders and order_items tables with proper schema and RLS policies

-- Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned')),
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    shipping_address JSONB NOT NULL,
    billing_address JSONB NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'credit_card' CHECK (payment_method IN ('credit_card', 'debit_card', 'paypal', 'cash_on_delivery', 'bank_transfer')),
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    tracking_number TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    product_name TEXT NOT NULL,
    product_image TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);

-- Enable Row Level Security
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Vendors can view orders for their products" ON public.orders;
DROP POLICY IF EXISTS "Users can insert their own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update their own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can update all orders" ON public.orders;
DROP POLICY IF EXISTS "Vendors can update orders for their products" ON public.orders;
DROP POLICY IF EXISTS "Users can delete their own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can delete all orders" ON public.orders;

DROP POLICY IF EXISTS "Users can view order items for their orders" ON public.order_items;
DROP POLICY IF EXISTS "Admins can view all order items" ON public.order_items;
DROP POLICY IF EXISTS "Vendors can view order items for their products" ON public.order_items;
DROP POLICY IF EXISTS "Users can insert order items for their orders" ON public.order_items;
DROP POLICY IF EXISTS "Admins can insert order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can update order items for their orders" ON public.order_items;
DROP POLICY IF EXISTS "Admins can update all order items" ON public.order_items;
DROP POLICY IF EXISTS "Vendors can update order items for their products" ON public.order_items;
DROP POLICY IF EXISTS "Users can delete order items for their orders" ON public.order_items;
DROP POLICY IF EXISTS "Admins can delete all order items" ON public.order_items;

-- Orders table policies
-- View policies
CREATE POLICY "Users can view their own orders" ON public.orders
    FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Admins can view all orders" ON public.orders
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Vendors can view orders for their products" ON public.orders
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.order_items oi
            JOIN public.products p ON oi.product_id = p.id
            JOIN public.shops s ON p.shop_id = s.id
            JOIN public.profiles pr ON s.owner_id = pr.id
            WHERE oi.order_id = orders.id AND pr.id = auth.uid() AND pr.role = 'vendor'
        )
    );

-- Insert policies
CREATE POLICY "Users can insert their own orders" ON public.orders
    FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Admins can insert orders" ON public.orders
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Update policies
CREATE POLICY "Users can update their own orders" ON public.orders
    FOR UPDATE USING (auth.uid() = customer_id);

CREATE POLICY "Admins can update all orders" ON public.orders
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Vendors can update orders for their products" ON public.orders
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.order_items oi
            JOIN public.products p ON oi.product_id = p.id
            JOIN public.shops s ON p.shop_id = s.id
            JOIN public.profiles pr ON s.owner_id = pr.id
            WHERE oi.order_id = orders.id AND pr.id = auth.uid() AND pr.role = 'vendor'
        )
    );

-- Delete policies
CREATE POLICY "Users can delete their own orders" ON public.orders
    FOR DELETE USING (auth.uid() = customer_id);

CREATE POLICY "Admins can delete all orders" ON public.orders
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Order items table policies
-- View policies
CREATE POLICY "Users can view order items for their orders" ON public.order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE id = order_items.order_id AND customer_id = auth.uid()
        )
    );

CREATE POLICY "Admins can view all order items" ON public.order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Vendors can view order items for their products" ON public.order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.products p
            JOIN public.shops s ON p.shop_id = s.id
            JOIN public.profiles pr ON s.owner_id = pr.id
            WHERE p.id = order_items.product_id AND pr.id = auth.uid() AND pr.role = 'vendor'
        )
    );

-- Insert policies
CREATE POLICY "Users can insert order items for their orders" ON public.order_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE id = order_items.order_id AND customer_id = auth.uid()
        )
    );

CREATE POLICY "Admins can insert order items" ON public.order_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Update policies
CREATE POLICY "Users can update order items for their orders" ON public.order_items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE id = order_items.order_id AND customer_id = auth.uid()
        )
    );

CREATE POLICY "Admins can update all order items" ON public.order_items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Vendors can update order items for their products" ON public.order_items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.products p
            JOIN public.shops s ON p.shop_id = s.id
            JOIN public.profiles pr ON s.owner_id = pr.id
            WHERE p.id = order_items.product_id AND pr.id = auth.uid() AND pr.role = 'vendor'
        )
    );

-- Delete policies
CREATE POLICY "Users can delete order items for their orders" ON public.order_items
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE id = order_items.order_id AND customer_id = auth.uid()
        )
    );

CREATE POLICY "Admins can delete all order items" ON public.order_items
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for orders table
DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON public.orders TO authenticated;
GRANT ALL ON public.order_items TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Insert sample data for testing (optional)
INSERT INTO public.orders (id, customer_id, status, total_amount, shipping_address, billing_address, payment_method, payment_status, tracking_number, notes) VALUES
(
    '550e8400-e29b-41d4-a716-446655440001',
    (SELECT id FROM public.profiles LIMIT 1),
    'delivered',
    299.99,
    '{"full_name": "John Doe", "address_line1": "123 Main St", "city": "New York", "state": "NY", "postal_code": "10001", "country": "USA"}',
    '{"full_name": "John Doe", "address_line1": "123 Main St", "city": "New York", "state": "NY", "postal_code": "10001", "country": "USA"}',
    'credit_card',
    'paid',
    'TRK123456789',
    'Delivered successfully'
),
(
    '550e8400-e29b-41d4-a716-446655440002',
    (SELECT id FROM public.profiles LIMIT 1),
    'pending',
    149.50,
    '{"full_name": "Jane Smith", "address_line1": "456 Oak Ave", "city": "Los Angeles", "state": "CA", "postal_code": "90210", "country": "USA"}',
    '{"full_name": "Jane Smith", "address_line1": "456 Oak Ave", "city": "Los Angeles", "state": "CA", "postal_code": "90210", "country": "USA"}',
    'paypal',
    'pending',
    NULL,
    'Processing order'
)
ON CONFLICT (id) DO NOTHING;

-- Insert sample order items
INSERT INTO public.order_items (order_id, product_id, quantity, unit_price, total_price, product_name, product_image) VALUES
(
    '550e8400-e29b-41d4-a716-446655440001',
    (SELECT id FROM public.products LIMIT 1),
    2,
    149.99,
    299.98,
    'Sample Product 1',
    'https://example.com/image1.jpg'
),
(
    '550e8400-e29b-41d4-a716-446655440002',
    (SELECT id FROM public.products LIMIT 1),
    1,
    149.50,
    149.50,
    'Sample Product 2',
    'https://example.com/image2.jpg'
)
ON CONFLICT (id) DO NOTHING; 