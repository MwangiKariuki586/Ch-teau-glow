CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM anon;
REVOKE ALL ON SCHEMA private FROM authenticated;

ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS products_branch_id_idx
    ON public.products (branch_id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'products_active_requires_branch'
          AND conrelid = 'public.products'::regclass
    ) THEN
        ALTER TABLE public.products
            ADD CONSTRAINT products_active_requires_branch
            CHECK (COALESCE(is_active, false) = false OR branch_id IS NOT NULL)
            NOT VALID;
    END IF;
END $$;

ALTER TABLE public.inventory_movements
    ADD COLUMN IF NOT EXISTS dedupe_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS inventory_movements_dedupe_key_unique
    ON public.inventory_movements (dedupe_key);

CREATE UNIQUE INDEX IF NOT EXISTS inventory_items_product_id_unique
    ON public.inventory_items (product_id);

CREATE OR REPLACE FUNCTION private.finalize_order_checkout_session_internal(
    p_order_id UUID,
    p_stripe_checkout_session_id TEXT,
    p_stripe_payment_intent_id TEXT DEFAULT NULL,
    p_stripe_customer_id TEXT DEFAULT NULL,
    p_contact_email TEXT DEFAULT NULL,
    p_contact_name TEXT DEFAULT NULL,
    p_contact_phone TEXT DEFAULT NULL,
    p_shipping_address_line1 TEXT DEFAULT NULL,
    p_shipping_address_line2 TEXT DEFAULT NULL,
    p_shipping_city TEXT DEFAULT NULL,
    p_shipping_state TEXT DEFAULT NULL,
    p_shipping_postal_code TEXT DEFAULT NULL,
    p_shipping_country TEXT DEFAULT NULL,
    p_placed_at TIMESTAMPTZ DEFAULT NULL,
    p_pickup_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    v_order public.orders%ROWTYPE;
    v_existing_sale_count INTEGER;
    v_order_item_count INTEGER;
    v_missing_product_name TEXT;
    v_missing_branch_product_name TEXT;
    v_missing_inventory_product_name TEXT;
    v_insufficient_product_name TEXT;
    v_available_qty NUMERIC;
    v_required_qty NUMERIC;
    v_inserted_movement_count INTEGER := 0;
BEGIN
    SELECT *
    INTO v_order
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order % was not found.', p_order_id;
    END IF;

    SELECT COUNT(*)
    INTO v_order_item_count
    FROM public.order_items
    WHERE order_id = p_order_id;

    IF v_order_item_count = 0 THEN
        RAISE EXCEPTION 'Order % has no order items to finalize.', p_order_id;
    END IF;

    SELECT COUNT(*)
    INTO v_existing_sale_count
    FROM public.inventory_movements
    WHERE movement_type = 'sale'
      AND reference_type = 'order'
      AND reference_id = p_order_id;

    IF v_existing_sale_count > 0 THEN
        IF v_order.status <> 'paid' OR v_order.payment_status <> 'paid' THEN
            RAISE EXCEPTION 'Order % already has sale movements but is not marked paid.', p_order_id;
        END IF;

        RETURN jsonb_build_object(
            'status', 'already_processed',
            'order_id', p_order_id,
            'inserted_movements', 0
        );
    END IF;

    SELECT oi.product_name
    INTO v_missing_product_name
    FROM public.order_items oi
    WHERE oi.order_id = p_order_id
      AND oi.product_id IS NULL
    LIMIT 1;

    IF v_missing_product_name IS NOT NULL THEN
        RAISE EXCEPTION 'Order % contains an item without a product_id: %.', p_order_id, v_missing_product_name;
    END IF;

    SELECT oi.product_name
    INTO v_missing_branch_product_name
    FROM public.order_items oi
    LEFT JOIN public.products p
        ON p.id = oi.product_id
    WHERE oi.order_id = p_order_id
      AND (p.id IS NULL OR p.branch_id IS NULL)
    LIMIT 1;

    IF v_missing_branch_product_name IS NOT NULL THEN
        RAISE EXCEPTION 'Product % is missing a fulfillment branch assignment.', v_missing_branch_product_name;
    END IF;

    SELECT oi.product_name
    INTO v_missing_inventory_product_name
    FROM public.order_items oi
    LEFT JOIN public.inventory_items ii
        ON ii.product_id = oi.product_id
    WHERE oi.order_id = p_order_id
      AND ii.id IS NULL
    LIMIT 1;

    IF v_missing_inventory_product_name IS NOT NULL THEN
        RAISE EXCEPTION 'Product % is missing an inventory item mapping.', v_missing_inventory_product_name;
    END IF;

    WITH resolved_lines AS (
        SELECT
            p.branch_id,
            ii.id AS inventory_item_id
        FROM public.order_items oi
        JOIN public.products p
            ON p.id = oi.product_id
        JOIN public.inventory_items ii
            ON ii.product_id = oi.product_id
        WHERE oi.order_id = p_order_id
    )
    INSERT INTO public.branch_inventory (
        branch_id,
        inventory_item_id,
        on_hand,
        low_stock_threshold
    )
    SELECT DISTINCT
        branch_id,
        inventory_item_id,
        0,
        0
    FROM resolved_lines
    ON CONFLICT (branch_id, inventory_item_id) DO NOTHING;

    SELECT insufficient.product_name, insufficient.available_qty, insufficient.required_qty
    INTO v_insufficient_product_name, v_available_qty, v_required_qty
    FROM (
        SELECT
            resolved.product_name,
            bi.on_hand AS available_qty,
            resolved.required_qty
        FROM (
            SELECT
                oi.product_name,
                p.branch_id,
                ii.id AS inventory_item_id,
                SUM(oi.quantity)::NUMERIC AS required_qty
            FROM public.order_items oi
            JOIN public.products p
                ON p.id = oi.product_id
            JOIN public.inventory_items ii
                ON ii.product_id = oi.product_id
            WHERE oi.order_id = p_order_id
            GROUP BY oi.product_name, p.branch_id, ii.id
        ) AS resolved
        JOIN public.branch_inventory bi
            ON bi.branch_id = resolved.branch_id
           AND bi.inventory_item_id = resolved.inventory_item_id
        WHERE bi.on_hand < resolved.required_qty
        LIMIT 1
    ) AS insufficient;

    IF v_insufficient_product_name IS NOT NULL THEN
        RAISE EXCEPTION
            'Insufficient stock for product % (available %, required %).',
            v_insufficient_product_name,
            v_available_qty,
            v_required_qty;
    END IF;

    WITH aggregated_deductions AS (
        SELECT
            p.branch_id,
            ii.id AS inventory_item_id,
            SUM(oi.quantity)::NUMERIC AS quantity
        FROM public.order_items oi
        JOIN public.products p
            ON p.id = oi.product_id
        JOIN public.inventory_items ii
            ON ii.product_id = oi.product_id
        WHERE oi.order_id = p_order_id
        GROUP BY p.branch_id, ii.id
    ), inserted_movements AS (
        INSERT INTO public.inventory_movements (
            movement_type,
            branch_id,
            inventory_item_id,
            quantity_delta,
            reference_type,
            reference_id,
            actor_user_id,
            dedupe_key
        )
        SELECT
            'sale',
            deduction.branch_id,
            deduction.inventory_item_id,
            -deduction.quantity,
            'order',
            p_order_id,
            NULL,
            'order:' || p_order_id::TEXT || ':sale:' || deduction.inventory_item_id::TEXT
        FROM aggregated_deductions deduction
        ON CONFLICT (dedupe_key) DO NOTHING
        RETURNING branch_id, inventory_item_id, quantity_delta
    ), updated_inventory AS (
        UPDATE public.branch_inventory bi
        SET
            on_hand = bi.on_hand + movement_totals.total_delta,
            updated_at = NOW()
        FROM (
            SELECT
                branch_id,
                inventory_item_id,
                SUM(quantity_delta) AS total_delta
            FROM inserted_movements
            GROUP BY branch_id, inventory_item_id
        ) AS movement_totals
        WHERE bi.branch_id = movement_totals.branch_id
          AND bi.inventory_item_id = movement_totals.inventory_item_id
        RETURNING bi.branch_id
    )
    SELECT COUNT(*)
    INTO v_inserted_movement_count
    FROM inserted_movements;

    IF v_inserted_movement_count = 0 THEN
        RAISE EXCEPTION 'Order % did not insert any sale movements during finalization.', p_order_id;
    END IF;

    UPDATE public.orders
    SET
        stripe_checkout_session_id = COALESCE(p_stripe_checkout_session_id, stripe_checkout_session_id),
        stripe_payment_intent_id = COALESCE(p_stripe_payment_intent_id, stripe_payment_intent_id),
        stripe_customer_id = COALESCE(p_stripe_customer_id, stripe_customer_id),
        contact_email = COALESCE(p_contact_email, contact_email),
        contact_name = COALESCE(p_contact_name, contact_name),
        contact_phone = COALESCE(p_contact_phone, contact_phone),
        shipping_address_line1 = COALESCE(p_shipping_address_line1, shipping_address_line1),
        shipping_address_line2 = COALESCE(p_shipping_address_line2, shipping_address_line2),
        shipping_city = COALESCE(p_shipping_city, shipping_city),
        shipping_state = COALESCE(p_shipping_state, shipping_state),
        shipping_postal_code = COALESCE(p_shipping_postal_code, shipping_postal_code),
        shipping_country = COALESCE(p_shipping_country, shipping_country),
        placed_at = COALESCE(p_placed_at, placed_at),
        pickup_notes = COALESCE(p_pickup_notes, pickup_notes),
        status = 'paid',
        payment_status = 'paid'
    WHERE id = p_order_id;

    RETURN jsonb_build_object(
        'status', 'processed',
        'order_id', p_order_id,
        'inserted_movements', v_inserted_movement_count
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_order_checkout_session(
    p_order_id UUID,
    p_stripe_checkout_session_id TEXT,
    p_stripe_payment_intent_id TEXT DEFAULT NULL,
    p_stripe_customer_id TEXT DEFAULT NULL,
    p_contact_email TEXT DEFAULT NULL,
    p_contact_name TEXT DEFAULT NULL,
    p_contact_phone TEXT DEFAULT NULL,
    p_shipping_address_line1 TEXT DEFAULT NULL,
    p_shipping_address_line2 TEXT DEFAULT NULL,
    p_shipping_city TEXT DEFAULT NULL,
    p_shipping_state TEXT DEFAULT NULL,
    p_shipping_postal_code TEXT DEFAULT NULL,
    p_shipping_country TEXT DEFAULT NULL,
    p_placed_at TIMESTAMPTZ DEFAULT NULL,
    p_pickup_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql
SET search_path = ''
AS $$
    SELECT private.finalize_order_checkout_session_internal(
        p_order_id,
        p_stripe_checkout_session_id,
        p_stripe_payment_intent_id,
        p_stripe_customer_id,
        p_contact_email,
        p_contact_name,
        p_contact_phone,
        p_shipping_address_line1,
        p_shipping_address_line2,
        p_shipping_city,
        p_shipping_state,
        p_shipping_postal_code,
        p_shipping_country,
        p_placed_at,
        p_pickup_notes
    );
$$;

REVOKE ALL ON FUNCTION private.finalize_order_checkout_session_internal(
    UUID,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TIMESTAMPTZ,
    TEXT
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.finalize_order_checkout_session(
    UUID,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TIMESTAMPTZ,
    TEXT
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finalize_order_checkout_session(
    UUID,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TIMESTAMPTZ,
    TEXT
) FROM anon;
REVOKE ALL ON FUNCTION public.finalize_order_checkout_session(
    UUID,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TIMESTAMPTZ,
    TEXT
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_order_checkout_session(
    UUID,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TIMESTAMPTZ,
    TEXT
) TO service_role;
