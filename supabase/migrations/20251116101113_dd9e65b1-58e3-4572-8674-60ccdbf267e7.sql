-- Add room_configurations column to properties table
ALTER TABLE properties ADD COLUMN room_configurations JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN properties.room_configurations IS 'Array of room configurations with capacity: [{"room_number": "1", "capacity": 2}]';