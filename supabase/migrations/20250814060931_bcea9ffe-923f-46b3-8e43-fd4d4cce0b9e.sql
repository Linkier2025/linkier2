-- Fix security vulnerability in device_names table
-- Add user_id column to link devices to users
ALTER TABLE public.device_names 
ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Allow read access to all" ON public.device_names;
DROP POLICY IF EXISTS "Allow insert/update to authenticated" ON public.device_names;
DROP POLICY IF EXISTS "Enable insert for anon" ON public.device_names;
DROP POLICY IF EXISTS "Enable update for anon" ON public.device_names;

-- Create secure RLS policies
CREATE POLICY "Users can view their own devices" 
ON public.device_names 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own devices" 
ON public.device_names 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own devices" 
ON public.device_names 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own devices" 
ON public.device_names 
FOR DELETE 
USING (auth.uid() = user_id);