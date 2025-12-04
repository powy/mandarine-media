import React, { useState, useEffect } from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { getSystemInfo, getHealthStatus, parseVersionFromMessage } from 'share';

const Footer: React.FC = () => {
  const [version, setVersion] = useState<string>('loading...');
  const [health, setHealth] = useState<'healthy' | 'unhealthy' | 'unknown'>('unknown');

  useEffect(() => {
    const fetchServerInfo = async () => {
      try {
        const [info, healthStatus] = await Promise.all([
          getSystemInfo(),
          getHealthStatus()
        ]);

        const versionNumber = parseVersionFromMessage(info.message);
        setVersion(versionNumber);
        setHealth(healthStatus.status === 'healthy' ? 'healthy' : 'unhealthy');
      } catch (error) {
        console.error('Failed to fetch server info:', error);
        setVersion('unknown');
        setHealth('unhealthy');
      }
    };

    fetchServerInfo();

    // Poll every 30 seconds
    const interval = setInterval(fetchServerInfo, 30000);
    return () => clearInterval(interval);
  }, []);

  const getHealthColor = () => {
    switch (health) {
      case 'healthy': return 'success';
      case 'unhealthy': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box
      component="footer"
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider',
        padding: '8px 16px',
        zIndex: 1100,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 2,
      }}
    >
      <Typography variant="caption" color="text.secondary">
        KYOOL Media Backoffice
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <Chip
          label={health}
          size="small"
          color={getHealthColor()}
          sx={{ height: '20px' }}
        />
        <Typography variant="caption" color="text.secondary">
          Server v{version}
        </Typography>
      </Box>
    </Box>
  );
};

export default Footer;
