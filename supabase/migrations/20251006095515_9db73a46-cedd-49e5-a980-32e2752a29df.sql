-- Add active_brand_id to profiles to track the currently selected brand
ALTER TABLE profiles ADD COLUMN active_brand_id uuid REFERENCES brands(id) ON DELETE SET NULL;

-- Add index for better performance
CREATE INDEX idx_profiles_active_brand ON profiles(active_brand_id);