"use client";

import { useState } from "react";
import { Search, Loader2, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder={t("searchModpacks")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
            disabled={isLoading}
          />
        </div>
        <Button
          onClick={handleSearch}
          disabled={isLoading}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-minecraft px-6"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("search")}
        </Button>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-emerald-400 hover:border-emerald-500"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </Button>
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-800/60 rounded-lg border border-gray-700">
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

