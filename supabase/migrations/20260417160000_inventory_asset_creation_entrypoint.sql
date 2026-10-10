CREATE OR REPLACE FUNCTION private.slugify_text(p_value TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    v_slug TEXT;
BEGIN
    v_slug := lower(COALESCE(p_value, ''));
    v_slug := regexp_replace(v_slug, '[^a-z0-9\s-]', '', 'g');
    v_slug := regexp_replace(v_slug, '[\s_-]+', '-', 'g');
    v_slug := regexp_replace(v_slug, '^-+|-+$', '', 'g');

    IF v_slug = '' THEN
        v_slug := 'item';
    END IF;

    RETURN v_slug;
END;
$$;

CREATE OR REPLACE FUNCTION private.generate_unique_product_slug(p_base TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    v_base TEXT := private.slugify_text(p_base);
    v_slug TEXT := v_base;
    v_suffix INTEGER := 2;
BEGIN
    WHILE EXISTS (
        SELECT 1
        FROM public.products
        WHERE slug = v_slug
    ) LOOP
        v_slug := v_base || '-' || v_suffix::TEXT;
        v_suffix := v_suffix + 1;
    END LOOP;

    RETURN v_slug;
END;
$$;

CREATE OR REPLACE FUNCTION private.create_inventory_asset_internal(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    v_item_type TEXT := NULLIF(TRIM(COALESCE(p_payload ->> 'item_type', '')), '');
    v_name TEXT := NULLIF(TRIM(COALESCE(p_payload ->> 'name', '')), '');
    v_sku TEXT := NULLIF(TRIM(COALESCE(p_payload ->> 'sku', '')), '');
    v_unit TEXT := NULLIF(TRIM(COALESCE(p_payload ->> 'unit', '')), '');
    v_branch_id UUID := NULLIF(TRIM(COALESCE(p_payload ->> 'branch_id', '')), '')::UUID;
    v_is_active BOOLEAN := COALESCE((p_payload ->> 'is_active')::BOOLEAN, TRUE);
    v_category_id UUID := NULLIF(TRIM(COALESCE(p_payload ->> 'category_id', '')), '')::UUID;
    v_price_display TEXT := NULLIF(TRIM(COALESCE(p_payload ->> 'price_display', '')), '');
    v_price_value NUMERIC(10, 2) := NULLIF(TRIM(COALESCE(p_payload ->> 'price_value', '')), '')::NUMERIC;
    v_description TEXT := NULLIF(TRIM(COALESCE(p_payload ->> 'description', '')), '');
    v_currency TEXT := NULLIF(TRIM(COALESCE(p_payload ->> 'currency', '')), '');
    v_slug TEXT := NULLIF(TRIM(COALESCE(p_payload ->> 'slug', '')), '');
    v_images TEXT[] := ARRAY(
        SELECT jsonb_array_elements_text(COALESCE(p_payload -> 'images', '[]'::JSONB))
    );
    v_inventory_item_id UUID;
    v_product_id UUID;
BEGIN
    IF v_item_type NOT IN ('retail_product', 'consumable') THEN
        RAISE EXCEPTION 'Unsupported inventory item type: %', COALESCE(v_item_type, '<null>');
    END IF;

    IF v_name IS NULL THEN
        RAISE EXCEPTION 'Asset name is required.';
    END IF;

    IF v_unit IS NULL THEN
        RAISE EXCEPTION 'Unit is required.';
    END IF;

    IF v_branch_id IS NULL THEN
        RAISE EXCEPTION 'Branch is required.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.branches
        WHERE id = v_branch_id
          AND COALESCE(is_active, TRUE) = TRUE
    ) THEN
        RAISE EXCEPTION 'Selected branch is invalid or inactive.';
    END IF;

    IF v_item_type = 'retail_product' THEN
        IF v_category_id IS NULL THEN
            RAISE EXCEPTION 'Category is required for retail products.';
        END IF;

        IF v_price_display IS NULL THEN
            RAISE EXCEPTION 'Display price is required for retail products.';
        END IF;

        IF v_currency IS NULL THEN
            v_currency := 'AED';
        END IF;

        IF v_slug IS NULL THEN
            v_slug := private.generate_unique_product_slug(v_name);
        ELSE
            v_slug := private.generate_unique_product_slug(v_slug);
        END IF;

        INSERT INTO public.products (
            category_id,
            branch_id,
            name,
            slug,
            description,
            price_display,
            price_value,
            unit_price,
            currency,
            rating,
            images,
            is_featured,
            is_active
        )
        VALUES (
            v_category_id,
            v_branch_id,
            v_name,
            v_slug,
            v_description,
            v_price_display,
            v_price_value,
            v_price_value,
            v_currency,
            5.0,
            CASE
                WHEN COALESCE(array_length(v_images, 1), 0) = 0 THEN NULL
                ELSE v_images
            END,
            FALSE,
            v_is_active
        )
        RETURNING id
        INTO v_product_id;
    END IF;

    INSERT INTO public.inventory_items (
        product_id,
        name,
        sku,
        item_type,
        unit,
        is_active
    )
    VALUES (
        v_product_id,
        v_name,
        v_sku,
        v_item_type,
        v_unit,
        v_is_active
    )
    RETURNING id
    INTO v_inventory_item_id;

    INSERT INTO public.branch_inventory (
        branch_id,
        inventory_item_id,
        on_hand,
        low_stock_threshold
    )
    VALUES (
        v_branch_id,
        v_inventory_item_id,
        0,
        0
    )
    ON CONFLICT (branch_id, inventory_item_id) DO NOTHING;

    RETURN jsonb_build_object(
        'inventory_item_id', v_inventory_item_id,
        'product_id', v_product_id,
        'branch_id', v_branch_id,
        'item_type', v_item_type
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_inventory_asset(p_payload JSONB)
RETURNS JSONB
LANGUAGE sql
SET search_path = ''
AS $$
    SELECT private.create_inventory_asset_internal(p_payload);
$$;

CREATE OR REPLACE FUNCTION private.sync_inventory_item_from_product()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    v_inventory_item_id UUID;
BEGIN
    SELECT id
    INTO v_inventory_item_id
    FROM public.inventory_items
    WHERE product_id = NEW.id;

    IF v_inventory_item_id IS NULL THEN
        RETURN NEW;
    END IF;

    UPDATE public.inventory_items
    SET
        name = NEW.name,
        is_active = NEW.is_active,
        updated_at = NOW()
    WHERE id = v_inventory_item_id;

    IF NEW.branch_id IS NOT NULL THEN
        INSERT INTO public.branch_inventory (
            branch_id,
            inventory_item_id,
            on_hand,
            low_stock_threshold
        )
        VALUES (
            NEW.branch_id,
            v_inventory_item_id,
            0,
            0
        )
        ON CONFLICT (branch_id, inventory_item_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_inventory_item_from_product_trigger
    ON public.products;

CREATE TRIGGER sync_inventory_item_from_product_trigger
AFTER UPDATE OF name, is_active, branch_id
ON public.products
FOR EACH ROW
EXECUTE FUNCTION private.sync_inventory_item_from_product();

REVOKE ALL ON FUNCTION private.slugify_text(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.generate_unique_product_slug(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.create_inventory_asset_internal(JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.sync_inventory_item_from_product() FROM PUBLIC;

REVOKE ALL ON FUNCTION public.create_inventory_asset(JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_inventory_asset(JSONB) FROM anon;
REVOKE ALL ON FUNCTION public.create_inventory_asset(JSONB) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.create_inventory_asset(JSONB) TO service_role;
