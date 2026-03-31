CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, user_type, first_name, surname, phone, email, gender, university, year_of_study)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'user_type',
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'surname',
    NEW.raw_user_meta_data->>'phone',
    NEW.email,
    NEW.raw_user_meta_data->>'gender',
    NEW.raw_user_meta_data->>'university',
    NEW.raw_user_meta_data->>'year_of_study'
  );
  RETURN NEW;
END;
$function$;