import React, { useState } from 'react';
import {
    Search,
    Logout,
    AccountCircle,
    Place,        // for TAHsil icon (pin/location)
    HolidayVillage, // for Village icon (house)
    CropSquare,   // placeholder for the grid/square icon in Khasra label
} from '@mui/icons-material';
import {
    Select,
    Menu,
    MenuItem,
    IconButton,
    Autocomplete,
    TextField,
    Box,
} from '@mui/material';

import { useAuth } from '../../context/AuthContext';
import { KhasraInput } from '../forms/KhasraInput';

interface HeaderProps {
    tehsils: string[];
    villages: string[];
    khasraNumbers: string[];
    selectedTehsil: string;
    selectedVillage: string;
    selectedKhasra: string;
    onTehsilChange: (v: string) => void;
    onVillageChange: (v: string) => void;
    onKhasraChange: (v: string) => void;
}

const Header: React.FC<HeaderProps> = ({
    tehsils,
    villages,
    khasraNumbers,
    selectedTehsil,
    selectedVillage,
    selectedKhasra,
    onTehsilChange,
    onVillageChange,
    onKhasraChange,
}) => {
    debugger
    // Inside Header component:
    const { user, logout } = useAuth();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    console.log("These are the khasra no. :", khasraNumbers)
    return (
        <header className="bg-brand-dark text-white flex items-center justify-between px-4 h-20 shadow-md z-30 relative">
            {/* Left: Branding */}
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                    <span className="text-brand-dark font-bold text-xs">BDP</span>
                </div>
                <div>
                    <h1 className="text-lg font-bold leading-tight">
                        BHOPAL DEVELOPMENT PLAN - 2047 (DRAFT)
                    </h1>
                    <div className="text-sm text-gray-300">
                        Objections & Suggestions on the Draft Development Plan
                    </div>
                </div>
            </div>

            {/* Right: Filters */}
            <div className="flex items-end gap-3">
                {/* --- Tehsil --- */}
                <div className="flex flex-col">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-white mb-1.5">
                        <Place sx={{ fontSize: 14 }} />
                        <span>Tahsil</span>
                    </label>
                    <Select
                        value={selectedTehsil}
                        onChange={(e) => onTehsilChange(e.target.value)}
                        displayEmpty
                        size="small"
                        className="bg-white text-gray-700"
                        sx={{
                            width: 140,
                            height: 36,
                            borderRadius: '4px',
                            fontSize: 14,
                            '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                            '& .MuiSelect-select': { py: 0.75, color: '#1f2937' },
                        }}
                    >
                        <MenuItem value=""><em>All Tehsils</em></MenuItem>
                        {tehsils.map((t) => (
                            <MenuItem 
                            key={t} 
                            value={t}
                            >{t}</MenuItem>
                        ))}
                    </Select>
                </div>

                {/* --- Village --- */}
                <div className="flex flex-col">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-white mb-1.5">
                        <HolidayVillage sx={{ fontSize: 14 }} />
                        <span>Village</span>
                    </label>
                    <Select
                        value={selectedVillage}
                        onChange={(e) => onVillageChange(e.target.value)}
                        displayEmpty
                        size="small"
                        className="bg-white text-gray-700"
                        sx={{
                            width: 160,
                            height: 36,
                            borderRadius: '4px',
                            fontSize: 14,
                            '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                            '& .MuiSelect-select': { py: 0.75, color: '#1f2937' },
                        }}
                    >
                        <MenuItem value=""><em>All Villages</em></MenuItem>
                        {villages.map((v) => (
                            <MenuItem key={v} value={v} >{v}</MenuItem>
                        ))}
                    </Select>
                </div>

                {/* --- Khasra No. --- */}
                <div className="flex flex-col">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-white mb-1.5">
                        <CropSquare sx={{ fontSize: 14 }} />
                        <span>Khasra No.</span>
                    </label>
                    <KhasraInput
                        value={selectedKhasra}
                        options={khasraNumbers}
                        onChange={onKhasraChange}
                    />
                </div>

                <>
                    <IconButton color="inherit" onClick={(e) => setAnchorEl(e.currentTarget)}>
                        <AccountCircle fontSize="large" />
                    </IconButton>
                    <Menu
                        anchorEl={anchorEl}
                        open={Boolean(anchorEl)}
                        onClose={() => setAnchorEl(null)}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                    >
                        <MenuItem disabled>
                            <span className="text-xs text-gray-500">
                                {user?.name || user?.username || 'Signed in'}
                            </span>
                        </MenuItem>
                        <MenuItem onClick={() => { logout(); setAnchorEl(null); }}>
                            <Logout fontSize="small" className="mr-2" />
                            Logout
                        </MenuItem>
                    </Menu>
                </>
            </div>
        </header>
    );
};

export default Header;