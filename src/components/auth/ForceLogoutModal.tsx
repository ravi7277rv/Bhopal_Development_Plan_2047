import React from 'react';
import {
  Modal,
  Box,
  Typography,
  Button,
  Stack,
  Divider,
  CircularProgress,
  Backdrop,
} from '@mui/material';
import { WarningAmber } from '@mui/icons-material';

interface ForceLogoutModalProps {
  open: boolean;
  username: string;
  isProcessing: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const modalStyle = {
  position: 'absolute' as const,
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: { xs: '90%', sm: 420 },
  bgcolor: 'background.paper',
  borderRadius: 2,
  boxShadow: 24,
  outline: 'none',
  overflow: 'hidden',
};

export const ForceLogoutModal: React.FC<ForceLogoutModalProps> = ({
  open,
  username,
  isProcessing,
  onCancel,
  onConfirm,
}) => {
  return (
    <Modal
      open={open}
      onClose={isProcessing ? undefined : onCancel}
      aria-labelledby="force-logout-modal-title"
      aria-describedby="force-logout-modal-description"
      closeAfterTransition
      slots={{ backdrop: Backdrop }}
      slotProps={{
        backdrop: {
          timeout: 200,
          sx: {
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(2px)',
          },
        },
      }}
      sx={{ zIndex: 9999 }}   // ✅ ADD THIS
    >
      <Box sx={modalStyle}>
        {/* Header */}
        <Box
          sx={{
            px: 3,
            py: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            bgcolor: '#fffbeb', // amber-50
            borderBottom: '1px solid',
            borderColor: '#fde68a', // amber-200
          }}
        >
          <WarningAmber sx={{ color: '#d97706' /* amber-600 */ }} />
          <Typography
            id="force-logout-modal-title"
            variant="h6"
            sx={{ fontWeight: 600, color: '#92400e' /* amber-800 */ }}
          >
            Already Logged In
          </Typography>
        </Box>

        {/* Body */}
        <Box sx={{ p: 3 }}>
          <Typography
            id="force-logout-modal-description"
            variant="body1"
            sx={{ color: '#374151', lineHeight: 1.6 }}
          >
            The account <strong>{username}</strong> is currently signed in on
            another device. If you continue, that session will be terminated
            and you will be logged in here.
          </Typography>

          <Typography
            variant="body2"
            sx={{ color: '#6b7280', mt: 2 }}
          >
            Do you want to force logout the other session?
          </Typography>
        </Box>

        <Divider />

        {/* Footer / Actions */}
        <Stack
          direction="row"
          spacing={1.5}
          sx={{
            px: 3,
            py: 2,
            bgcolor: '#f9fafb',
            justifyContent: 'flex-end',
          }}
        >
          <Button
            onClick={onCancel}
            disabled={isProcessing}
            variant="outlined"
            sx={{
              textTransform: 'none',
              fontWeight: 500,
              color: '#374151',
              borderColor: '#d1d5db',
              '&:hover': {
                borderColor: '#9ca3af',
                backgroundColor: '#f3f4f6',
              },
            }}
          >
            Cancel
          </Button>

          <Button
            onClick={onConfirm}
            disabled={isProcessing}
            variant="contained"
            color="error"
            startIcon={
              isProcessing ? (
                <CircularProgress size={16} sx={{ color: 'white' }} />
              ) : null
            }
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              boxShadow: 'none',
              '&:hover': { boxShadow: 'none' },
            }}
          >
            {isProcessing ? 'Logging out…' : 'Force Logout'}
          </Button>
        </Stack>
      </Box>
    </Modal>
  );
};