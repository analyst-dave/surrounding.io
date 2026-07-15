CREATE OR REPLACE FUNCTION relocate_dummy_nodes(center_lat DOUBLE PRECISION, center_lng DOUBLE PRECISION)
RETURNS void AS $$
DECLARE
    dummy_node RECORD;
    new_lat DOUBLE PRECISION;
    new_lng DOUBLE PRECISION;
BEGIN
    -- Relocate all profiles except the current user
    FOR dummy_node IN 
        SELECT id FROM public.profiles 
        WHERE id != auth.uid()
    LOOP
        -- Randomize within ~0.015 degrees (approx 1 mile)
        new_lat := center_lat + (random() * 0.03 - 0.015);
        new_lng := center_lng + (random() * 0.03 - 0.015);
        
        UPDATE public.profiles
        SET 
            last_location_lat = new_lat,
            last_location_lng = new_lng
        WHERE id = dummy_node.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
