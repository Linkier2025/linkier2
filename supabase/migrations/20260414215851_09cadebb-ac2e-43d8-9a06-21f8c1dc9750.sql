-- Storage: update avatars bucket with MIME type and size restrictions
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'],
    file_size_limit = 2097152
WHERE id = 'avatars';

-- Storage: update property-images bucket with MIME type and size restrictions
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'],
    file_size_limit = 5242880
WHERE id = 'property-images';