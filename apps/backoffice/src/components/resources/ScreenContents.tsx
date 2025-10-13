import React, { useState } from 'react';
import {
  List,
  Datagrid,
  TextField,
  DateField,
  Create,
  SimpleForm,
  TextInput,
  Edit,
  Show,
  SimpleShowLayout,
  required,
  EditButton,
  ShowButton,
  DeleteButton,
  CreateButton,
  TopToolbar,
  Toolbar,
  SaveButton,
  Button,
  ListButton,
  SearchInput,
  FilterButton,
  ExportButton,
  NumberInput,
  BooleanField,
  BooleanInput,
  SelectInput,
  FunctionField,
  ArrayInput,
  SimpleFormIterator,
  ReferenceInput,
  AutocompleteInput,
  ReferenceManyField,
  SingleFieldList,
  ChipField,
  ArrayField,
  useRecordContext,
  useNotify,
  useRefresh,
} from 'react-admin';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogTitle, DialogContent, DialogActions, Typography, Box, Tooltip } from '@mui/material';
import { getScreenDescriptionJSON, regenerateScreenDescriptionJSON, reorderScreenDescriptionLists, regenerateAllScreenDescriptionJSON } from 'share';


// Define filters for the screen content list
const screenContentFilters = [
  <SearchInput 
    source="q" 
    placeholder="Search screen contents..." 
    alwaysOn 
    key="search"
  />,
];

// Custom toolbar with Save and Cancel buttons
const ScreenContentToolbar = () => {
  const navigate = useNavigate();
  
  const handleCancel = () => {
    navigate('/screen-contents');
  };
  
  return (
    <Toolbar>
      <SaveButton />
      <Button 
        onClick={handleCancel}
        label="Cancel"
      />
    </Toolbar>
  );
};

// Bulk regenerate JSON button component
const BulkRegenerateJsonButton = () => {
  const notify = useNotify();
  const [isLoading, setIsLoading] = useState(false);

  const handleRegenerateAll = async () => {
    setIsLoading(true);
    try {
      const result = await regenerateAllScreenDescriptionJSON();
      notify(
        `Successfully regenerated ${result.results.updated} screen description JSONs`,
        { type: 'success' }
      );
      if (result.results.failed > 0) {
        notify(
          `${result.results.failed} screen descriptions failed to regenerate`,
          { type: 'warning' }
        );
      }
    } catch (error) {
      notify(`Error regenerating all JSONs: ${error.message}`, { type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Tooltip title="Mise à jour des écrans du site en production et des showcases à l'intérieur de ceux-ci.">
      <Button
        onClick={handleRegenerateAll}
        disabled={isLoading}
        label={isLoading ? "Updating..." : "Update the website display (json)"}
        variant="contained"
        sx={{
          backgroundColor: '#ff9800',
          color: '#fff',
          '&:hover': {
            backgroundColor: '#f57c00',
          },
          '&:disabled': {
            backgroundColor: '#ffcc80',
            color: '#fff',
          },
        }}
      />
    </Tooltip>
  );
};

const ScreenContentListActions = () => (
  <TopToolbar>
    <FilterButton />
    <CreateButton />
    <ExportButton />
    <BulkRegenerateJsonButton />
  </TopToolbar>
);

// JSON Dialog Component for Screen Descriptions
const ScreenJsonDialog = ({ open, onClose, title, jsonData }) => (
  <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
    <DialogTitle>{title}</DialogTitle>
    <DialogContent>
      <Box
        component="pre"
        sx={{
          backgroundColor: '#f5f5f5',
          padding: 2,
          borderRadius: 1,
          overflow: 'auto',
          maxHeight: '60vh',
          fontSize: '0.875rem',
          fontFamily: 'monospace',
        }}
      >
        {JSON.stringify(jsonData, null, 2)}
      </Box>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Close</Button>
    </DialogActions>
  </Dialog>
);

// View Screen Description JSON Button
const ViewScreenJsonButton = () => {
  const record = useRecordContext();
  const notify = useNotify();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [jsonData, setJsonData] = useState(null);

  const handleViewJson = async () => {
    if (!record?.id) return;
    
    try {
      const json = await getScreenDescriptionJSON(record.id);
      setJsonData(json);
      setDialogOpen(true);
    } catch (error) {
      notify(`Error fetching JSON: ${error.message}`, { type: 'error' });
    }
  };

  return (
    <>
      <Button
        onClick={handleViewJson}
        label="View JSON"
        variant="outlined"
        color="primary"
      />
      <ScreenJsonDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Screen Description JSON"
        jsonData={jsonData}
      />
    </>
  );
};

// Regenerate Screen Description JSON Button
const RegenerateScreenJsonButton = () => {
  const record = useRecordContext();
  const notify = useNotify();
  const refresh = useRefresh();

  const handleRegenerateJson = async () => {
    if (!record?.id) return;
    
    try {
      await regenerateScreenDescriptionJSON(record.id);
      notify('JSON cache regenerated successfully', { type: 'success' });
      refresh();
    } catch (error) {
      notify(`Error regenerating JSON: ${error.message}`, { type: 'error' });
    }
  };

  return (
    <Button
      onClick={handleRegenerateJson}
      label="Regenerate JSON"
      variant="outlined"
      color="secondary"
    />
  );
};

const ScreenContentShowActions = () => (
  <TopToolbar>
    <ListButton label="Back to Screen Contents" />
    <EditButton />
    <ViewScreenJsonButton />
    <RegenerateScreenJsonButton />
  </TopToolbar>
);

export const ScreenContentList = () => (
  <List 
    filters={screenContentFilters}
    actions={<ScreenContentListActions />} 
    sort={{ field: 'creation_date_utc', order: 'DESC' }}
    perPage={20}
  >
    <Datagrid>
      <TextField source="id" />
      <TextField source="title" sortable />
      <FunctionField 
        label="Description" 
        render={record => 
          record.description 
            ? record.description.length > 50 
              ? record.description.substring(0, 50) + '...' 
              : record.description
            : 'No description'
        } 
      />
      <TextField source="slug" label="Slug" />
      <BooleanField source="is_active" label="Active" />
      <TextField source="display_order" label="Order" />
      <FunctionField
        label="Media Showcases"
        render={record =>
          Array.isArray(record.media_showcases)
            ? record.media_showcases.length
            : 0
        }
      />
      <DateField source="creation_date_utc" label="Created" sortable />
      <EditButton />
      <ShowButton />
      <FunctionField
        label="JSON"
        render={() => (
          <ViewScreenJsonButton />
        )}
      />
      <DeleteButton />
    </Datagrid>
  </List>
);

export const ScreenContentCreate = () => (
  <Create redirect="list">
    <SimpleForm toolbar={<ScreenContentToolbar />}>
      <TextInput 
        source="title" 
        validate={[required()]} 
        fullWidth 
      />
      <TextInput 
        source="description" 
        multiline
        fullWidth 
      />
      <TextInput 
        source="slug" 
        fullWidth 
      />
      <BooleanInput source="is_active" defaultValue={true} />
      <NumberInput 
        source="display_order" 
        defaultValue={0} 
        helperText="Order for display (lower numbers appear first)"
      />
      <ArrayInput source="media_showcases" label="Related Media Showcases">
        <SimpleFormIterator>
          <ReferenceInput source="" reference="media-showcases">
            <AutocompleteInput optionText="title" />
          </ReferenceInput>
        </SimpleFormIterator>
      </ArrayInput>
    </SimpleForm>
  </Create>
);

export const ScreenContentEdit = () => (
  <Edit>
    <SimpleForm toolbar={<ScreenContentToolbar />}>
      <TextInput 
        source="title" 
        validate={[required()]} 
        fullWidth 
      />
      <TextInput 
        source="description" 
        multiline
        fullWidth 
      />
      <TextInput 
        source="slug" 
        fullWidth 
      />
      <BooleanInput source="is_active" />
      <NumberInput 
        source="display_order" 
        helperText="Order for display (lower numbers appear first)"
      />
      <ArrayInput source="media_showcases" label="Related Media Showcases">
        <SimpleFormIterator>
          <ReferenceInput source="" reference="media-showcases">
            <AutocompleteInput optionText="title" />
          </ReferenceInput>
        </SimpleFormIterator>
      </ArrayInput>
    </SimpleForm>
  </Edit>
);

export const ScreenContentShow = () => (
  <Show actions={<ScreenContentShowActions />}>
    <SimpleShowLayout>
      <TextField source="id" />
      <TextField source="title" />
      <TextField source="description" />
      <TextField source="slug" label="Slug" />
      <BooleanField source="is_active" label="Active" />
      <TextField source="display_order" label="Display Order" />
      <ArrayField source="media_showcases" label="Related Media Showcases">
        <SingleFieldList>
          <ChipField source="title" />
        </SingleFieldList>
      </ArrayField>
      <DateField source="creation_date_utc" label="Created" />
      <DateField source="last_updated_utc" label="Last Updated" />
      <DateField source="json_last_updated" label="JSON Last Updated" />
    </SimpleShowLayout>
  </Show>
);