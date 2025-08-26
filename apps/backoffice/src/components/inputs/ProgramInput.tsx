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
const validateProgramId = (value: string) => {
  if (!value) return undefined; // Optional field
  
  if (!UUID_REGEX.test(value)) {
    return 'Invalid UUID format';
  }
  
  return undefined;
};

interface ProgramInputProps {
  source: string;
  label?: string;
  validate?: any[];
  fullWidth?: boolean;
  allowDirectUUID?: boolean;
  required?: boolean;
}

export const ProgramInput: React.FC<ProgramInputProps> = ({
  source,
  label = "Program",
  validate = [],
  fullWidth = true,
  allowDirectUUID = true,
  required = false,
}) => {
  const [inputMode, setInputMode] = useState<'reference' | 'direct'>('reference');
  console.log('🎬 ProgramInput is rendering!', { source, inputMode });
  
  // Combine our UUID validation with any additional validations
  const combinedValidation = [...validate, validateProgramId];

  if (inputMode === 'direct') {
    return (
      <Box>
        <TextInput
          source={source}
          label={`${label} (Direct UUID Entry)`}
          validate={combinedValidation}
          fullWidth={fullWidth}
          helperText="Enter a valid Program UUID directly. Server will validate it exists."
          placeholder="e.g. 00aab488-379b-4032-8c1a-fa3a23935c84"
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
        reference="programs"
        label={label}
        sort={{ field: 'program_name', order: 'ASC' }}
        perPage={100} // Increase from default 25 for better UX
        filterToQuery={(searchText) => ({ q: searchText })}
      >
        <AutocompleteInput
          optionText="program_name"
          optionValue="id"
          matchSuggestion={(searchText, suggestion) => {
            if (!searchText) return true;
            const search = searchText.toLowerCase();
            return (
              suggestion.program_name?.toLowerCase().includes(search) ||
              suggestion.id?.toLowerCase().includes(search) // Allow searching by UUID too
            );
          }}
          noOptionsText="No programs found - try entering UUID directly below"
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
            Enter Program UUID directly instead →
          </Typography>
        </Box>
      )}
    </Box>
  );
};