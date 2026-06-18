import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { checkStaffAuth, unauthorized, logAudit } from "@/lib/auth";

const ALLOWED_PATCH_FIELDS = new Set([
  "name", "category", "price", "description", "is_available",
  "is_veg", "is_popular", "image_url", "sort_order", "is_deleted",
]);

// GET: List all menu items ordered by category, sort_order
export async function GET(request: NextRequest) {
  const auth = await checkStaffAuth(request, ["OWNER"]);
  if (!auth.authenticated) {
    return unauthorized();
  }

  try {
    const { searchParams } = new URL(request.url);
    const showArchived = searchParams.get("showArchived") === "true";

    const supabase = createServerClient();

    let query = supabase
      .from("menu_items")
      .select("*")
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true });

    if (showArchived) {
      query = query.eq("is_deleted", true);
    } else {
      query = query.or("is_deleted.is.null,is_deleted.eq.false");
    }

    const { data: items, error } = await query;

    if (error) {
      return NextResponse.json({ success: false, message: "Failed to fetch menu items." }, { status: 500 });
    }

    return NextResponse.json({ success: true, items: items || [] });
  } catch {
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}

// POST: Create a new menu item
export async function POST(request: NextRequest) {
  const auth = await checkStaffAuth(request, ["OWNER"]);
  if (!auth.authenticated) {
    return unauthorized();
  }

  try {
    const body = await request.json();
    const { name, category, price, description, is_available, is_veg, is_popular, image_url } = body;

    if (!name || !category || price === undefined) {
      return NextResponse.json(
        { success: false, message: "name, category, and price are required." },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Get the next sort_order for this category
    const { data: lastItem } = await supabase
      .from("menu_items")
      .select("sort_order")
      .eq("category", category)
      .order("sort_order", { ascending: false })
      .limit(1)
      .single();

    const nextSortOrder = (lastItem?.sort_order ?? 0) + 1;

    const { data: item, error } = await supabase
      .from("menu_items")
      .insert({
        name,
        category,
        price,
        description: description || "",
        is_available: is_available ?? true,
        is_veg: is_veg ?? false,
        is_popular: is_popular ?? false,
        image_url: image_url || "",
        sort_order: nextSortOrder,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, message: "Failed to create menu item." }, { status: 500 });
    }

    await logAudit({
      actorEmail: auth.email || "unknown",
      actorRole: auth.role || "OWNER",
      action: "MENU_ITEM_CREATED",
      details: `Created menu item: ${name} (${category}, ₹${price})`,
      targetId: item?.id,
    });

    return NextResponse.json({ success: true, item });
  } catch {
    return NextResponse.json({ success: false, message: "Invalid request body." }, { status: 400 });
  }
}

// PATCH: Update a menu item
export async function PATCH(request: NextRequest) {
  const auth = await checkStaffAuth(request, ["OWNER"]);
  if (!auth.authenticated) {
    return unauthorized();
  }

  try {
    const body = await request.json();
    const { id, action, ...rawFields } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: "id is required." }, { status: 400 });
    }

    const supabase = createServerClient();

    // Handle restore action
    if (action === "restore") {
      const { data: item, error } = await supabase
        .from("menu_items")
        .update({ is_deleted: false })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ success: false, message: "Failed to restore menu item." }, { status: 500 });
      }

      await logAudit({
        actorEmail: auth.email || "unknown",
        actorRole: auth.role || "OWNER",
        action: "MENU_ITEM_RESTORED",
        details: `Restored menu item: ${item?.name || id}`,
        targetId: id,
      });

      return NextResponse.json({ success: true, item });
    }

    // Whitelist fields for update
    const fieldsToUpdate: Record<string, unknown> = {};
    for (const key of Object.keys(rawFields)) {
      if (ALLOWED_PATCH_FIELDS.has(key)) {
        fieldsToUpdate[key] = rawFields[key];
      }
    }

    if (Object.keys(fieldsToUpdate).length === 0) {
      return NextResponse.json({ success: false, message: "No valid fields to update." }, { status: 400 });
    }

    const { data: item, error } = await supabase
      .from("menu_items")
      .update(fieldsToUpdate)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, message: "Failed to update menu item." }, { status: 500 });
    }

    await logAudit({
      actorEmail: auth.email || "unknown",
      actorRole: auth.role || "OWNER",
      action: "MENU_UPDATED",
      details: `Updated menu item: ${item?.name || id} — fields: ${Object.keys(fieldsToUpdate).join(", ")}`,
      targetId: id,
    });

    return NextResponse.json({ success: true, item });
  } catch {
    return NextResponse.json({ success: false, message: "Invalid request body." }, { status: 400 });
  }
}

// DELETE: Soft-delete a menu item (sets is_deleted = true)
export async function DELETE(request: NextRequest) {
  const auth = await checkStaffAuth(request, ["OWNER"]);
  if (!auth.authenticated) {
    return unauthorized();
  }

  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: "id is required." }, { status: 400 });
    }

    const supabase = createServerClient();

    const { data: item, error } = await supabase
      .from("menu_items")
      .update({ is_deleted: true })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, message: "Failed to delete menu item." }, { status: 500 });
    }

    await logAudit({
      actorEmail: auth.email || "unknown",
      actorRole: auth.role || "OWNER",
      action: "MENU_ITEM_DELETED",
      details: `Soft-deleted menu item: ${item?.name || id}`,
      targetId: id,
    });

    return NextResponse.json({ success: true, message: "Menu item archived." });
  } catch {
    return NextResponse.json({ success: false, message: "Invalid request body." }, { status: 400 });
  }
}
