-- Test database connection and basic operations

-- Test 1: Check if we can connect and query basic tables
SELECT 'Connection test' as test_name, 'SUCCESS' as status;

-- Test 2: Check if profiles table exists and has data
SELECT 
    'Profiles table' as test_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') 
        THEN 'EXISTS' 
        ELSE 'MISSING' 
    END as status,
    (SELECT COUNT(*) FROM public.profiles) as row_count;

-- Test 3: Check if orders table exists
SELECT 
    'Orders table' as test_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') 
        THEN 'EXISTS' 
        ELSE 'MISSING' 
    END as status,
    (SELECT COUNT(*) FROM public.orders) as row_count;

-- Test 4: Check if order_items table exists
SELECT 
    'Order_items table' as test_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_items') 
        THEN 'EXISTS' 
        ELSE 'MISSING' 
    END as status,
    (SELECT COUNT(*) FROM public.order_items) as row_count;

-- Test 5: Try to insert a test order (if tables exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') THEN
        INSERT INTO public.orders (
            customer_id, 
            status, 
            total_amount, 
            shipping_address, 
            billing_address, 
            payment_method, 
            payment_status
        ) VALUES (
            (SELECT id FROM public.profiles LIMIT 1),
            'pending',
            99.99,
            '{"full_name": "Test User", "address_line1": "123 Test St", "city": "Test City", "state": "TS", "postal_code": "12345", "country": "USA"}',
            '{"full_name": "Test User", "address_line1": "123 Test St", "city": "Test City", "state": "TS", "postal_code": "12345", "country": "USA"}',
            'credit_card',
            'pending'
        ) ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Test order inserted successfully';
    ELSE
        RAISE NOTICE 'Orders table does not exist';
    END IF;
END $$;

-- Test 6: Try to query orders with join
SELECT 
    'Orders query test' as test_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') 
        THEN 'SUCCESS' 
        ELSE 'FAILED - Table missing' 
    END as status,
    (SELECT COUNT(*) FROM public.orders) as total_orders; 