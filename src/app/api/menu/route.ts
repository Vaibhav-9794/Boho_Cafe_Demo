import { NextRequest, NextResponse } from "next/server";
import { createServerClient, MenuItem } from "@/lib/supabase";

// GET: Public menu — returns items grouped by category
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const showAll = searchParams.get("all") === "true";

    const supabase = createServerClient();

    let query = supabase
      .from("menu_items")
      .select("*")
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true });

    if (!showAll) {
      query = query.eq("is_available", true);
    }

    // Always exclude soft-deleted items from public view
    query = query.or("is_deleted.is.null,is_deleted.eq.false");

    const { data: items, error } = await query;

    if (error) {
      return NextResponse.json({ success: false, message: "Failed to fetch menu." }, { status: 500 });
    }

    const menuItems = (items || []) as MenuItem[];

    // Extract unique categories in order of appearance
    const categories: string[] = [];
    for (const item of menuItems) {
      if (!categories.includes(item.category)) {
        categories.push(item.category);
      }
    }

    return NextResponse.json({ success: true, items: menuItems, categories });
  } catch {
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}
