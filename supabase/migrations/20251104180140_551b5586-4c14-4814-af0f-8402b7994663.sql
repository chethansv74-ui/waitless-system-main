-- Create enum for token status
CREATE TYPE token_status AS ENUM ('waiting', 'called', 'serving', 'completed', 'cancelled');

-- Create enum for user roles
CREATE TYPE app_role AS ENUM ('admin', 'staff', 'user');

-- Create services table
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  average_wait_time INTEGER DEFAULT 15,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create tokens table
CREATE TABLE public.tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_number INTEGER NOT NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
  status token_status DEFAULT 'waiting',
  customer_name TEXT,
  customer_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  called_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- Enable RLS
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS Policies for services (public read, admin write)
CREATE POLICY "Anyone can view active services"
  ON public.services FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage services"
  ON public.services FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for tokens (public read, insert; admin manage)
CREATE POLICY "Anyone can view tokens"
  ON public.tokens FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create tokens"
  ON public.tokens FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can manage tokens"
  ON public.tokens FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete tokens"
  ON public.tokens FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- RLS Policies for user_roles (admin only)
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to get next token number
CREATE OR REPLACE FUNCTION public.get_next_token_number(service_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  next_number INTEGER;
BEGIN
  SELECT COALESCE(MAX(token_number), 0) + 1 INTO next_number
  FROM public.tokens
  WHERE service_id = service_uuid
  AND DATE(created_at) = CURRENT_DATE;
  RETURN next_number;
END;
$$;

-- Insert default services
INSERT INTO public.services (name, description, average_wait_time) VALUES
  ('General Consultation', 'General medical consultation and checkups', 20),
  ('Billing & Payment', 'Payment processing and billing inquiries', 10),
  ('Registration', 'New patient registration and document verification', 15),
  ('Pharmacy', 'Medication pickup and consultation', 12);

-- Enable realtime for tokens table
ALTER TABLE public.tokens REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tokens;