"use client";

import { FC } from "react";
import { ChevronRight, Home, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BreadcrumbsProps {
  path: string;
  onNavigate: (path: string) => void;
  onNavigateUp: () => void;
}

export const Breadcrumbs: FC<BreadcrumbsProps> = ({ path, onNavigate, onNavigateUp }) => {
  const parts = path.split("/").filter(Boolean);

  const handleCrumbClick = (index: number) => {
    const newPath = parts.slice(0, index + 1).join("/");
    onNavigate(newPath);
  };

  return (
    <div className="flex items-center gap-1 px-3 py-2 bg-gray-800/30 border-b border-gray-700/50 text-sm select-none">
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-gray-400 hover:text-white hover:bg-gray-700/50"
        onClick={onNavigateUp}
        disabled={!path}
      >
        <ArrowUp className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-1 overflow-x-auto">
        <button
          onClick={() => onNavigate("")}
          className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-700/50 text-gray-300 hover:text-white transition-colors"
        >
          <Home className="h-4 w-4" />
          <span>root</span>
        </button>

        {parts.map((part, index) => (
          <div key={index} className="flex items-center">
            <ChevronRight className="h-4 w-4 text-gray-600" />
            <button
              onClick={() => handleCrumbClick(index)}
              className="px-2 py-1 rounded hover:bg-gray-700/50 text-gray-300 hover:text-white transition-colors truncate max-w-[150px]"
              title={part}
            >
              {part}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

