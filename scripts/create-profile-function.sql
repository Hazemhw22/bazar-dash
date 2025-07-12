-- Function to create a profile with proper role assignment
CREATE OR REPLACE FUNCTION create_user_profile(
    user_id UUID,
    user_email TEXT,
    user_full_name TEXT,
    user_role TEXT DEFAULT 'customer'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Insert the profile with the specified role
    INSERT INTO profiles (
        id,
        email,
        full_name,
        role,
        created_at,
        updated_at
    ) VALUES (
        user_id,
        user_email,
        user_full_name,
        user_role,
        NOW(),
        NOW()
    );
    
    -- Log the creation for debugging
    RAISE NOTICE 'Profile created for user % with role %', user_email, user_role;
    
EXCEPTION
    WHEN unique_violation THEN
        RAISE NOTICE 'Profile already exists for user %', user_email;
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating profile: %', SQLERRM;
        RAISE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_user_profile(UUID, TEXT, TEXT, TEXT) TO authenticated;

-- Create a trigger to automatically create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Create a default profile for new users
    -- The role will be set to 'customer' by default
    -- Admin users should be created through the signup form or admin panel
    INSERT INTO profiles (
        id,
        email,
        full_name,
        role,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        'customer', -- Default role
        NOW(),
        NOW()
    );
    
    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        -- Profile already exists, do nothing
        RETURN NEW;
    WHEN OTHERS THEN
        -- Log error but don't fail the user creation
        RAISE NOTICE 'Error creating profile for user %: %', NEW.email, SQLERRM;
        RETURN NEW;
END;
$$;

-- Create the trigger (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'on_auth_user_created'
    ) THEN
        CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW EXECUTE FUNCTION handle_new_user();
    END IF;
END
$$; 