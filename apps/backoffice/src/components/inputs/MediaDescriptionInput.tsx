import React from 'react';
import {
  ReferenceInput,
  AutocompleteInput,
  TextInput,
} from 'react-admin';
import { Box, Typography } from '@mui/material';
import { useState } from 'react';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Simple UUID format validator
const validateMediaDescriptionId = (value: string) => {
  if (!value) return undefined; // Optional field
  
  if (!UUID_REGEX.test(value)) {
    return 'Invalid UUID format';
  }
  
  return undefined;
};

// Component that shows the UUID and title of the selected media description
const MediaDescriptionDisplay = ({ record }: { record: any }) => {
  if (!record) return null;
  
  return (
    <Box display="flex" alignItems="center" gap={1}>
      <Chip label={record.id} size="small" variant="outlined" />
      <Typography variant="body2">{record.episode_title}</Typography>
    </Box>
  );
};

interface MediaDescriptionInputProps {
  source: string;
  label?: string;
  validate?: any[];
  fullWidth?: boolean;
  allowDirectUUID?: boolean;
}

export const MediaDescriptionInput: React.FC<MediaDescriptionInputProps> = ({
  source,
  label = "Media Description",
  validate = [],
  fullWidth = true,
  allowDirectUUID = true,
}) => {
  const [inputMode, setInputMode] = useState<'reference' | 'direct'>('reference');
  console.log('🚀 MediaDescriptionInput is rendering!', { source, inputMode });
  
  // Combine our UUID validation with any additional validations
  const combinedValidation = [...validate, validateMediaDescriptionId];

  if (inputMode === 'direct') {
    return (
      <Box>
        <TextInput
          source={source}
          label={`${label} (Direct UUID Entry)`}
          validate={combinedValidation}
          fullWidth={fullWidth}
          helperText="Enter a valid MediaDescription UUID directly. Server will validate it exists."
          placeholder="e.g. f3a43213-5c78-43c4-8635-1cc32c66ece0"
        />
        
        <Box sx={{ mt: 1 }}>
          <Typography 
            variant="caption" 
            color="primary" 
            style={{ cursor: 'pointer', textDecoration: 'underline' }}
            onClick={() => setInputMode('reference')}
          >
            ← Switch to search mode
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <ReferenceInput
        source={source}
        reference="media-descriptions"
        label={label}
        sort={{ field: 'episode_title', order: 'ASC' }}
        perPage={100} // Increase from default 25 for better UX
        filterToQuery={(searchText) => ({ q: searchText })}
      >
        <AutocompleteInput
          optionText="episode_title"
          optionValue="id"
          matchSuggestion={(searchText, suggestion) => {
            if (!searchText) return true;
            const search = searchText.toLowerCase();
            return (
              suggestion.episode_title?.toLowerCase().includes(search) ||
              suggestion.id?.toLowerCase().includes(search) // Allow searching by UUID too
            );
          }}
          noOptionsText="No media descriptions found - try entering UUID directly below"
          clearOnBlur
          fullWidth={fullWidth}
        />
      </ReferenceInput>
      
      {allowDirectUUID && (
        <Box sx={{ mt: 1 }}>
          <Typography 
            variant="caption" 
            color="primary" 
            style={{ cursor: 'pointer', textDecoration: 'underline' }}
            onClick={() => setInputMode('direct')}
          >
            Enter UUID directly instead →
          </Typography>
        </Box>
      )}
    </Box>
  );
};