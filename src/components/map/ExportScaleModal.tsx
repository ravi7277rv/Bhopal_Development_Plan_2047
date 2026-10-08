import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Radio,
  RadioGroup,
  FormControl,
  CircularProgress,
  Button,
} from "@mui/material";
import { SCALE_OPTIONS } from "../../utils/mapScale";

interface ExportScaleModalProps {
  open: boolean;
  currentScale: number | null;
  pendingScale: number | null;
  isExporting: boolean;
  onScaleChange: (scale: number | null) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

const ExportScaleModal: React.FC<ExportScaleModalProps> = ({
  open,
  currentScale,
  pendingScale,
  isExporting,
  onScaleChange,
  onCancel,
  onConfirm,
}) => {
  const formatScale = (s: number | null) =>
    s === null ? 'Fit to view (auto)' : `1 : ${s.toLocaleString('en-IN')}`;

  return (
    <Dialog
      open={open}
      onClose={isExporting ? undefined : onCancel}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: '12px',
            overflow: 'hidden',
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          fontSize: '15px',
          fontWeight: 700,
          color: '#0f2744',
          padding: '16px 20px 12px',
          borderBottom: '1px solid #e2e8f0',
          bgcolor: '#f8fafc',
        }}
      >
        Export Map as PDF
      </DialogTitle>

      <DialogContent sx={{ padding: '16px 20px', mt: 1 }}>
        {/* Current scale readout */}
        <div className="mb-4">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Current Map Scale
          </div>
          <div className="text-[14px] font-bold text-slate-800">
            {formatScale(currentScale)}
          </div>
        </div>

        {/* Scale options */}
        <div>
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Select Scale for Export
          </div>

          <FormControl>
            <RadioGroup
              value={pendingScale === null ? 'null' : String(pendingScale)}
              onChange={(e) => {
                const val = e.target.value;
                onScaleChange(val === 'null' ? null : Number(val));
              }}
            >
              <FormControlLabel
                value="null"
                control={<Radio size="small" />}
                label={<span style={{ fontSize: 13 }}>Fit to view (auto)</span>}
              />
              {SCALE_OPTIONS.map((s) => (
                <FormControlLabel
                  key={s.value}
                  value={String(s.value)}
                  control={<Radio size="small" />}
                  label={<span style={{ fontSize: 13 }}>{s.label}</span>}
                />
              ))}
            </RadioGroup>
          </FormControl>
        </div>
      </DialogContent>

      <DialogActions
        sx={{
          padding: '12px 20px',
          borderTop: '1px solid #e2e8f0',
          bgcolor: '#f8fafc',
        }}
      >
        <Button
          onClick={onCancel}
          disabled={isExporting}
          variant="outlined"
          size="small"
          sx={{
            textTransform: 'none',
            fontSize: 12,
            borderColor: '#cbd5e1',
            color: '#475569',
            '&:hover': {
              borderColor: '#94a3b8',
              backgroundColor: '#f8fafc',
            },
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          disabled={isExporting}
          variant="contained"
          size="small"
          startIcon={
            isExporting ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : null
          }
          sx={{
            textTransform: 'none',
            fontSize: 12,
            fontWeight: 600,
            backgroundColor: '#0f2c4a',
            boxShadow: 'none',
            paddingLeft: '16px',
            paddingRight: '16px',
            '&:hover': {
              backgroundColor: '#1a4a75',
              boxShadow: 'none',
            },
          }}
        >
          {isExporting ? 'Exporting…' : 'Export PDF'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExportScaleModal