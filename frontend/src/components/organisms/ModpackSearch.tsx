"use client";

import { useState } from "react";
import { Search, Loader2, SlidersHorizontal } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/lib/hooks/useLanguage";

interface ModpackSearchProps {
  onSearch: (query: string, sortField: number, sortOrder: "asc" | "desc") => void;
  isLoading?: boolean;
}

export function ModpackSearch({ onSearch, isLoading }: ModpackSearchProps) {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<number>(2); // 2 = Popularity
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = () => {
    onSearch(searchQuery, sortField, sortOrder);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
          <input
            type="text"
            placeholder={t("searchModpacks")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyPress}
            className="mc-input w-full h-10 pl-10 pr-3 text-sm"
            disabled={isLoading}
          />
        </div>
        <button onClick={handleSearch} disabled={isLoading} className="mc-btn mc-btn-emerald px-6">
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("search")}
        </button>
        <button onClick={() => setShowFilters(!showFilters)} className="mc-btn px-4">
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </div>

      {showFilters && (
        <div className="mc-panel grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
          <div className="space-y-2">
            <label className="text-sm text-gray-300 font-medium">{t("sortBy")}</label>
            <Select value={sortField.toString()} onValueChange={(value) => setSortField(parseInt(value))}>
              <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                <SelectItem value="1">{t("featured")}</SelectItem>
                <SelectItem value="2">{t("popularity")}</SelectItem>
                <SelectItem value="3">{t("lastUpdated")}</SelectItem>
                <SelectItem value="4">{t("name")}</SelectItem>
                <SelectItem value="6">{t("totalDownloads")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-300 font-medium">{t("sortOrder")}</label>
            <Select value={sortOrder} onValueChange={(value: "asc" | "desc") => setSortOrder(value)}>
              <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                <SelectItem value="desc">{t("descending")}</SelectItem>
                <SelectItem value="asc">{t("ascending")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}

