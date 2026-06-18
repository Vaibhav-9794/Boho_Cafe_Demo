"use client";

import { useState, useMemo, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronDown, X, Sparkles } from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";
import { menuItems, type MenuItem } from "@/data/menu";
import { menuGroups, type MenuGroup, type MenuSubcategory } from "@/data/menuStructure";
import { fadeInUp } from "@/lib/animations";

// ─── Types ────────────────────────────────────────────
type DietFilter = "all" | "veg" | "nonveg";

// ─── Item Card (memoized) ─────────────────────────────
const MenuItemCard = memo(function MenuItemCard({ item }: { item: MenuItem }) {
  return (
    <div className="group flex gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-transparent hover:border-[rgba(198,169,98,0.2)] hover:bg-[rgba(255,255,255,0.04)] transition-all duration-300">
      {/* Image */}
      {item.image && (
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-lg overflow-hidden">
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
          {/* Veg/Non-Veg Badge */}
          <div className="absolute top-1.5 left-1.5">
            <div
              className={item.isVeg ? "badge-veg" : "badge-nonveg"}
              title={item.isVeg ? "Vegetarian" : "Non-Vegetarian"}
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-[family-name:var(--font-playfair)] text-sm sm:text-base font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-champagne)] transition-colors duration-300 leading-snug">
            {!item.image && (
              <span className="inline-block mr-1.5">
                <span
                  className={`inline-block w-2.5 h-2.5 rounded-sm border-2 ${
                    item.isVeg ? "border-green-500" : "border-red-500"
                  }`}
                  style={{ verticalAlign: "middle" }}
                />
              </span>
            )}
            {item.name}
          </h4>
          <span className="text-[var(--color-gold)] font-[family-name:var(--font-playfair)] text-sm sm:text-base font-bold whitespace-nowrap">
            ₹{item.price}
          </span>
        </div>
        <p className="text-[var(--color-text-muted)] text-xs sm:text-sm leading-relaxed line-clamp-2 mt-1">
          {item.description}
        </p>
        {item.isPopular && (
          <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider bg-gradient-to-r from-[var(--color-gold-dark)] to-[var(--color-gold)] text-[var(--color-dark)] w-fit">
            <Sparkles className="w-2.5 h-2.5" />
            Popular
          </span>
        )}
      </div>
    </div>
  );
});

// ─── Subcategory Accordion ────────────────────────────
function SubcategoryAccordion({
  sub,
  items,
  isOpen,
  onToggle,
}: {
  sub: MenuSubcategory;
  items: MenuItem[];
  isOpen: boolean;
  onToggle: () => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="border-b border-[rgba(255,255,255,0.06)] last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-4 px-4 sm:px-5 text-left group/sub hover:bg-[rgba(255,255,255,0.02)] transition-colors duration-200"
      >
        <div className="flex items-center gap-3">
          <span className="font-[family-name:var(--font-playfair)] text-base sm:text-lg font-semibold text-[var(--color-champagne)] group-hover/sub:text-[var(--color-gold)] transition-colors duration-300">
            {sub.label}
          </span>
          <span className="text-[var(--color-text-muted)] text-xs bg-[rgba(255,255,255,0.05)] px-2 py-0.5 rounded-full">
            {items.length}
          </span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-[var(--color-text-muted)] group-hover/sub:text-[var(--color-gold)] transition-colors duration-300" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-2 sm:px-3 pb-4 grid grid-cols-1 xl:grid-cols-2 gap-2">
              {items.map((item) => (
                <MenuItemCard key={item.id} item={item} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Mobile Group Accordion ───────────────────────────
function MobileGroupAccordion({
  group,
  getSubItems,
  isOpen,
  onToggle,
  openSubs,
  onToggleSub,
}: {
  group: MenuGroup;
  getSubItems: (sub: MenuSubcategory) => MenuItem[];
  isOpen: boolean;
  onToggle: () => void;
  openSubs: Set<string>;
  onToggleSub: (id: string) => void;
}) {
  const totalItems = group.subcategories.reduce(
    (sum, sub) => sum + getSubItems(sub).length,
    0
  );

  if (totalItems === 0) return null;

  return (
    <div className="glass rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-4 px-5 text-left group/grp"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl sm:text-2xl">{group.icon}</span>
          <div>
            <span className="font-[family-name:var(--font-playfair)] text-lg font-semibold text-[var(--color-champagne)] group-hover/grp:text-[var(--color-gold)] transition-colors duration-300">
              {group.label}
            </span>
            <span className="block text-[var(--color-text-muted)] text-xs mt-0.5">
              {totalItems} items · {group.subcategories.filter(s => getSubItems(s).length > 0).length} categories
            </span>
          </div>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-5 h-5 text-[var(--color-text-muted)] group-hover/grp:text-[var(--color-gold)] transition-colors duration-300" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-[rgba(255,255,255,0.06)]">
              {group.subcategories.map((sub) => {
                const items = getSubItems(sub);
                return (
                  <SubcategoryAccordion
                    key={sub.id}
                    sub={sub}
                    items={items}
                    isOpen={openSubs.has(sub.id)}
                    onToggle={() => onToggleSub(sub.id)}
                  />
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Menu Section ────────────────────────────────
export default function MenuSection() {
  const [activeGroupId, setActiveGroupId] = useState(menuGroups[0].id);
  const [openSubcategories, setOpenSubcategories] = useState<Set<string>>(new Set());
  const [openGroupsMobile, setOpenGroupsMobile] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [dietFilter, setDietFilter] = useState<DietFilter>("all");
  const [showPopular, setShowPopular] = useState(false);

  const isSearching = searchQuery.trim().length > 0;

  // Filter function
  const filterItem = useCallback(
    (item: MenuItem) => {
      if (dietFilter === "veg" && !item.isVeg) return false;
      if (dietFilter === "nonveg" && item.isVeg) return false;
      if (showPopular && !item.isPopular) return false;
      return true;
    },
    [dietFilter, showPopular]
  );

  // Get items for a subcategory
  const getSubcategoryItems = useCallback(
    (sub: MenuSubcategory) =>
      menuItems.filter(
        (item) =>
          sub.originalCategories.includes(item.category) && filterItem(item)
      ),
    [filterItem]
  );

  // Search results (flat, across all items)
  const searchResults = useMemo(() => {
    if (!isSearching) return [];
    const q = searchQuery.toLowerCase().trim();
    return menuItems.filter((item) => {
      if (!filterItem(item)) return false;
      return (
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, isSearching, filterItem]);

  // Active group
  const activeGroup =
    menuGroups.find((g) => g.id === activeGroupId) || menuGroups[0];

  // Toggle subcategory accordion
  const toggleSubcategory = useCallback((subId: string) => {
    setOpenSubcategories((prev) => {
      const next = new Set(prev);
      if (next.has(subId)) next.delete(subId);
      else next.add(subId);
      return next;
    });
  }, []);

  // Toggle mobile group accordion
  const toggleGroupMobile = useCallback((groupId: string) => {
    setOpenGroupsMobile((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }, []);

  // Select group on desktop
  const selectGroup = useCallback((groupId: string) => {
    setActiveGroupId(groupId);
    setOpenSubcategories(new Set());
  }, []);

  // Clear search
  const clearSearch = useCallback(() => setSearchQuery(""), []);

  // Count items per group (for sidebar badge)
  const groupItemCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const group of menuGroups) {
      counts[group.id] = group.subcategories.reduce(
        (sum, sub) => sum + getSubcategoryItems(sub).length,
        0
      );
    }
    return counts;
  }, [getSubcategoryItems]);

  return (
    <section
      id="menu"
      className="relative py-[var(--section-padding)] bg-[var(--color-dark)] overflow-hidden"
    >
      {/* Background texture */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIwLjUiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')]" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <SectionHeading
          subtitle="Culinary Delights"
          title="Our Menu"
          description="A curated selection of continental, Asian & fusion dishes crafted with passion and the finest ingredients"
        />

        {/* Search Bar */}
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="max-w-lg mx-auto mb-6"
        >
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)] group-focus-within:text-[var(--color-gold)] transition-colors duration-300" />
            <input
              type="text"
              placeholder="Search dishes, categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-10 py-3.5 rounded-full bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-gold)] focus:ring-1 focus:ring-[var(--color-gold)]/30 transition-all duration-300 font-[family-name:var(--font-inter)] text-sm"
            />
            {isSearching && (
              <button
                onClick={clearSearch}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-gold)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </motion.div>

        {/* Filter Pills */}
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="flex items-center justify-center gap-2 sm:gap-3 mb-10 flex-wrap"
        >
          {/* Diet Filters */}
          <button
            onClick={() => setDietFilter(dietFilter === "veg" ? "all" : "veg")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 ${
              dietFilter === "veg"
                ? "bg-green-500/20 border border-green-500/50 text-green-400"
                : "bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--color-text-secondary)] hover:border-green-500/30 hover:text-green-400"
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-sm border-2 border-green-500 inline-block" />
            Veg
          </button>
          <button
            onClick={() =>
              setDietFilter(dietFilter === "nonveg" ? "all" : "nonveg")
            }
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 ${
              dietFilter === "nonveg"
                ? "bg-red-500/20 border border-red-500/50 text-red-400"
                : "bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--color-text-secondary)] hover:border-red-500/30 hover:text-red-400"
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-sm border-2 border-red-500 inline-block" />
            Non-Veg
          </button>
          {/* Popular Filter */}
          <button
            onClick={() => setShowPopular(!showPopular)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 ${
              showPopular
                ? "bg-gradient-to-r from-[var(--color-gold-dark)]/20 to-[var(--color-gold)]/20 border border-[var(--color-gold)]/50 text-[var(--color-gold)]"
                : "bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-gold)]/30 hover:text-[var(--color-gold)]"
            }`}
          >
            <Sparkles className="w-3 h-3" />
            Popular
          </button>

          {/* Active filter count */}
          {(dietFilter !== "all" || showPopular) && (
            <button
              onClick={() => {
                setDietFilter("all");
                setShowPopular(false);
              }}
              className="text-[var(--color-text-muted)] text-xs hover:text-[var(--color-gold)] transition-colors underline underline-offset-2"
            >
              Clear filters
            </button>
          )}
        </motion.div>

        {/* ─── Search Results (flat list) ─── */}
        <AnimatePresence mode="wait">
          {isSearching ? (
            <motion.div
              key="search-results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-4 flex items-center justify-between">
                <p className="text-[var(--color-text-secondary)] text-sm">
                  <span className="text-[var(--color-gold)] font-semibold">
                    {searchResults.length}
                  </span>{" "}
                  result{searchResults.length !== 1 ? "s" : ""} for &ldquo;
                  <span className="text-[var(--color-champagne)]">
                    {searchQuery}
                  </span>
                  &rdquo;
                </p>
              </div>

              {searchResults.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {searchResults.map((item) => (
                    <MenuItemCard key={item.id} item={item} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Search className="w-10 h-10 text-[var(--color-text-muted)] mb-3 opacity-40" />
                  <h3 className="font-[family-name:var(--font-playfair)] text-lg text-[var(--color-text-secondary)] mb-1">
                    No items found
                  </h3>
                  <p className="text-[var(--color-text-muted)] text-sm max-w-sm">
                    Try a different search term or clear your filters.
                  </p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="menu-browse"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* ─── Desktop Layout: Sidebar + Content ─── */}
              <div className="hidden lg:grid lg:grid-cols-[260px_1fr] gap-8">
                {/* Sidebar */}
                <div className="sticky top-24 self-start space-y-1.5">
                  <p className="text-[var(--color-text-muted)] text-[10px] uppercase tracking-[0.2em] font-semibold mb-3 px-3">
                    Categories
                  </p>
                  {menuGroups.map((group) => {
                    const count = groupItemCounts[group.id];
                    if (count === 0) return null;
                    const isActive = activeGroupId === group.id;

                    return (
                      <button
                        key={group.id}
                        onClick={() => selectGroup(group.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all duration-300 ${
                          isActive
                            ? "bg-gradient-to-r from-[rgba(198,169,98,0.12)] to-[rgba(198,169,98,0.04)] border border-[rgba(198,169,98,0.25)] shadow-[0_0_20px_rgba(198,169,98,0.08)]"
                            : "hover:bg-[rgba(255,255,255,0.03)] border border-transparent"
                        }`}
                      >
                        <span className="text-xl">{group.icon}</span>
                        <div className="flex-1 min-w-0">
                          <span
                            className={`block text-sm font-semibold transition-colors duration-300 ${
                              isActive
                                ? "text-[var(--color-gold)]"
                                : "text-[var(--color-text-secondary)] hover:text-[var(--color-champagne)]"
                            }`}
                          >
                            {group.label}
                          </span>
                          <span className="text-[var(--color-text-muted)] text-[10px] mt-0.5 block">
                            {count} items
                          </span>
                        </div>
                        {isActive && (
                          <div className="w-1.5 h-8 rounded-full bg-gradient-to-b from-[var(--color-gold)] to-[var(--color-gold-dark)]" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Content Area */}
                <div className="glass rounded-2xl overflow-hidden">
                  {/* Group Header */}
                  <div className="px-6 py-5 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{activeGroup.icon}</span>
                      <div>
                        <h3 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[var(--color-champagne)]">
                          {activeGroup.label}
                        </h3>
                        <p className="text-[var(--color-text-muted)] text-xs mt-0.5">
                          {activeGroup.subcategories.filter(
                            (s) => getSubcategoryItems(s).length > 0
                          ).length}{" "}
                          categories · {groupItemCounts[activeGroup.id]} items
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Subcategory Accordions */}
                  <div>
                    {activeGroup.subcategories.map((sub) => {
                      const items = getSubcategoryItems(sub);
                      return (
                        <SubcategoryAccordion
                          key={sub.id}
                          sub={sub}
                          items={items}
                          isOpen={openSubcategories.has(sub.id)}
                          onToggle={() => toggleSubcategory(sub.id)}
                        />
                      );
                    })}
                  </div>

                  {/* Empty state for group */}
                  {groupItemCounts[activeGroup.id] === 0 && (
                    <div className="py-16 text-center">
                      <p className="text-[var(--color-text-muted)] text-sm">
                        No items match your current filters.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* ─── Mobile Layout: Nested Accordions ─── */}
              <div className="lg:hidden space-y-3">
                {menuGroups.map((group) => (
                  <MobileGroupAccordion
                    key={group.id}
                    group={group}
                    getSubItems={getSubcategoryItems}
                    isOpen={openGroupsMobile.has(group.id)}
                    onToggle={() => toggleGroupMobile(group.id)}
                    openSubs={openSubcategories}
                    onToggleSub={toggleSubcategory}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
