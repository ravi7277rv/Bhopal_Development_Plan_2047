import React from "react";
import {
  HolidayVillage,
  CropSquare,
  KeyboardArrowDown,
} from "@mui/icons-material";
import { Select, MenuItem } from "@mui/material";
import { KhasraInput } from "../forms/KhasraInput";

interface MapFilterBarProps {
  villages: string[];
  khasraNumbers: string[];
  selectedVillage: string;
  selectedKhasra: string;
  onVillageChange: (v: string) => void;
  onKhasraChange: (v: string) => void;
  /** "onMap" = horizontal cards; "stacked" = vertical layout for drawers */
  variant?: "onMap" | "stacked";
}

const MapFilterBar: React.FC<MapFilterBarProps> = ({
  villages,
  khasraNumbers,
  selectedVillage,
  selectedKhasra,
  onVillageChange,
  onKhasraChange,
  variant = "onMap",
}) => {
  const stacked = variant === "stacked";


  const wrapperClass = stacked
    ? "flex flex-col gap-3 w-full"
    : "flex flex-wrap items-end gap-2";

  return (
    <div className={wrapperClass}>
      {/* ============ VILLAGE CARD ============ */}
    
      <div>
        
        <KhasraInput
          value={selectedVillage}
          options={villages}
          placeholder={" Select Village"}
          width={"100%"}
          onChange={onVillageChange}
        />
      </div>

      {/* ============ KHASRA CARD ============ */}

      <div>
        <KhasraInput
          value={selectedKhasra}
          options={khasraNumbers}
          onChange={onKhasraChange}
        />
      </div>
    </div>
  );
};

export default MapFilterBar;
