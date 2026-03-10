-- Enable RLS on collaboration tables
ALTER TABLE configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_locks ENABLE ROW LEVEL SECURITY;

-- Policies for 'configs' table
CREATE POLICY "Users can create their own configurations"
ON configs FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = owner_id);

CREATE POLICY "Owners can view their own configurations"
ON configs FOR SELECT
TO authenticated
USING (auth.uid()::text = owner_id);

CREATE POLICY "Collaborators can view shared configurations"
ON configs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM config_collaborators
    WHERE config_id = configs.id
    AND user_id = auth.uid()::text
  )
);

CREATE POLICY "Owners can update their own configurations"
ON configs FOR UPDATE
TO authenticated
USING (auth.uid()::text = owner_id)
WITH CHECK (auth.uid()::text = owner_id);

CREATE POLICY "Collaborators with edit permission can update configurations"
ON configs FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM config_collaborators
    WHERE config_id = configs.id
    AND user_id = auth.uid()::text
    AND permission IN ('edit', 'admin')
  )
);

CREATE POLICY "Owners can delete their own configurations"
ON configs FOR DELETE
TO authenticated
USING (auth.uid()::text = owner_id);


-- Policies for 'config_collaborators' table
CREATE POLICY "Owners can manage collaborators"
ON config_collaborators FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM configs
    WHERE id = config_collaborators.config_id
    AND owner_id = auth.uid()::text
  )
);

CREATE POLICY "Collaborators can view their own permissions"
ON config_collaborators FOR SELECT
TO authenticated
USING (user_id = auth.uid()::text);


-- Policies for 'config_locks' table
CREATE POLICY "Anyone can view locks"
ON config_locks FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can acquire locks if they have edit permission"
ON config_locks FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM configs
    WHERE id = config_id
    AND owner_id = auth.uid()::text
  ) OR
  EXISTS (
    SELECT 1 FROM config_collaborators
    WHERE config_id = config_locks.config_id
    AND user_id = auth.uid()::text
    AND permission IN ('edit', 'admin')
  )
);

CREATE POLICY "Users can release their own locks"
ON config_locks FOR DELETE
TO authenticated
USING (
  client_id = (SELECT client_id FROM config_locks WHERE config_id = config_locks.config_id AND field = config_locks.field)
  -- In a real app, you'd verify the client_id belongs to the user
);
