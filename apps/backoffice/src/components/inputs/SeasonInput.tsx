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
const validateSeasonId = (value: string) => {
  if (!value) return undefined; // Optional field
  
  if (!UUID_REGEX.test(value)) {
    return 'Invalid UUID format';
  }
  
  return undefined;
};

interface SeasonInputProps {
  source: string;
  label?: string;
  validate?: any[];
  fullWidth?: boolean;
  allowDirectUUID?: boolean;
  required?: boolean;
}

export const SeasonInput: React.FC<SeasonInputProps> = ({
  source,
  label = "Season",
  validate = [],
  fullWidth = true,
  allowDirectUUID = true,
  required = false,
}) => {
  const [inputMode, setInputMode] = useState<'reference' | 'direct'>('reference');
  console.log('📺 SeasonInput is rendering!', { source, inputMode });
  
  // Combine our UUID validation with any additional validations
  const combinedValidation = [...validate, validateSeasonId];

  if (inputMode === 'direct') {
    return (
      <Box>
        <TextInput
          source={source}
          label={`${label} (Direct UUID Entry)`}
          validate={combinedValidation}
          fullWidth={fullWidth}
          helperText="Enter a valid Season UUID directly. Server will validate it exists."
          placeholder="e.g. 43e253f7-764f-46d4-b684-88a16a4e60d6"
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
        reference="seasons"
        label={label}
        sort={{ field: 'season_number', order: 'ASC' }}
        perPage={100} // Increase from default 25 for better UX
        filterToQuery={(searchText) => ({ q: searchText })}
      >
        <AutocompleteInput
          optionText={(record) => `Season ${record.season_number}${record.title ? ` - ${record.title}` : ''}`}
          optionValue="id"
          matchSuggestion={(searchText, suggestion) => {
            if (!searchText) return true;
            const search = searchText.toLowerCase();
            return (
              suggestion.season_number?.toString().includes(search) ||
              suggestion.title?.toLowerCase().includes(search) ||
              suggestion.id?.toLowerCase().includes(search) // Allow searching by UUID too
            );
          }}
          noOptionsText="No seasons found - try entering UUID directly below"
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
            Enter Season UUID directly instead →
          </Typography>
        </Box>
      )}
    </Box>
  );
};