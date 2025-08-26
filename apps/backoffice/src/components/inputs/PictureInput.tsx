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
const validatePictureId = (value: string) => {
  if (!value) return undefined; // Optional field
  
  if (!UUID_REGEX.test(value)) {
    return 'Invalid UUID format';
  }
  
  return undefined;
};

interface PictureInputProps {
  source: string;
  label?: string;
  validate?: any[];
  fullWidth?: boolean;
  allowDirectUUID?: boolean;
  required?: boolean;
}

export const PictureInput: React.FC<PictureInputProps> = ({
  source,
  label = "Picture",
  validate = [],
  fullWidth = true,
  allowDirectUUID = true,
  required = false,
}) => {
  const [inputMode, setInputMode] = useState<'reference' | 'direct'>('reference');
  console.log('🖼️ PictureInput is rendering!', { source, inputMode });
  
  // Combine our UUID validation with any additional validations
  const combinedValidation = [...validate, validatePictureId];

  if (inputMode === 'direct') {
    return (
      <Box>
        <TextInput
          source={source}
          label={`${label} (Direct UUID Entry)`}
          validate={combinedValidation}
          fullWidth={fullWidth}
          helperText="Enter a valid Picture UUID directly. Server will validate it exists."
          placeholder="e.g. f1a2b3c4-d5e6-7890-abcd-ef1234567890"
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
        reference="pictures"
        label={label}
        sort={{ field: 'file_name', order: 'ASC' }}
        perPage={100} // Increase from default 25 for better UX
        filterToQuery={(searchText) => ({ q: searchText })}
      >
        <AutocompleteInput
          optionText={(record) => 
            record.file_name || 
            record.filename ||
            record.description ||
            record.id
          }
          optionValue="id"
          matchSuggestion={(searchText, suggestion) => {
            if (!searchText) return true;
            const search = searchText.toLowerCase();
            return (
              suggestion.file_name?.toLowerCase().includes(search) ||
              suggestion.filename?.toLowerCase().includes(search) ||
              suggestion.description?.toLowerCase().includes(search) ||
              suggestion.id?.toLowerCase().includes(search) // Allow searching by UUID too
            );
          }}
          noOptionsText="No pictures found - try entering UUID directly below"
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
            Enter Picture UUID directly instead →
          </Typography>
        </Box>
      )}
    </Box>
  );
};