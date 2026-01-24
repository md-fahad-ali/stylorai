-- 1. Add the search_vector column
ALTER TABLE products ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 2. Create the GIN Index for blazing fast search
CREATE INDEX IF NOT EXISTS idx_products_search_vector ON products USING GIN(search_vector);

-- 3. Create a function to convert row data into the vector
CREATE OR REPLACE FUNCTION products_search_vector_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    to_tsvector('english',
      COALESCE(NEW.name, '') || ' ' ||
      LEFT(COALESCE(NEW.description, ''), 1000) || ' ' ||
      COALESCE(NEW.color, '') || ' ' ||
      COALESCE(NEW.material, '') || ' ' ||
      COALESCE(NEW.category, '') || ' ' ||
      COALESCE(NEW.pattern, '') || ' ' ||
      COALESCE(NEW.gender, '')
    );
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- 4. Create the Trigger to run before INSERT or UPDATE
DROP TRIGGER IF EXISTS tsvectorupdate ON products;
CREATE TRIGGER tsvectorupdate BEFORE INSERT OR UPDATE
ON products FOR EACH ROW EXECUTE PROCEDURE products_search_vector_trigger();

-- 5. Update existing records (in case migration runs on populated DB)
UPDATE products SET search_vector = to_tsvector('english',
      COALESCE(name, '') || ' ' ||
      LEFT(COALESCE(description, ''), 1000) || ' ' ||
      COALESCE(color, '') || ' ' ||
      COALESCE(material, '') || ' ' ||
      COALESCE(category, '') || ' ' ||
      COALESCE(pattern, '') || ' ' ||
      COALESCE(gender, '')
);
