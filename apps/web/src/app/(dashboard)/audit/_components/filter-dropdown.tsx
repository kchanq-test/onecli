"use client";

import { Button } from "@onecli/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@onecli/ui/components/dropdown-menu";
import { Badge } from "@onecli/ui/components/badge";
import { ChevronDown } from "lucide-react";

export interface FilterDropdownProps {
  label: string;
  options: readonly string[];
  selected: string[];
  onSelectionChange: (next: string[]) => void;
  formatOption?: (value: string) => string;
  renderOption?: (value: string, formatted: string) => React.ReactNode;
}

export const FilterDropdown = ({
  label,
  options,
  selected,
  onSelectionChange,
  formatOption = (v) => v,
  renderOption,
}: FilterDropdownProps) => {
  const toggle = (value: string) => {
    onSelectionChange(
      selected.includes(value)
        ? selected.filter((s) => s !== value)
        : [...selected, value],
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          {label}
          {selected.length > 0 && (
            <Badge
              variant="secondary"
              className="size-5 justify-center rounded-full px-0 text-xs"
            >
              {selected.length}
            </Badge>
          )}
          <ChevronDown className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option}
            checked={selected.includes(option)}
            onSelect={(e) => e.preventDefault()}
            onCheckedChange={() => toggle(option)}
          >
            {renderOption
              ? renderOption(option, formatOption(option))
              : formatOption(option)}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
