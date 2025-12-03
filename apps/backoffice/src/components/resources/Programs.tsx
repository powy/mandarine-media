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
  ReferenceInput,
  AutocompleteInput,
  ReferenceField,
  useRecordContext,
  useNotify,
  useRefresh,
} from 'react-admin';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogTitle, DialogContent, DialogActions, Box } from '@mui/material';
import { MediaDescriptionInput } from '../inputs/MediaDescriptionInput';
import { getProgramJSON, refreshProgramJSON, refreshAllProgramJSONs } from 'share';

// Define filters for the program list
// Note: Backend doesn't support search yet, but keeping filter structure for consistency
const programFilters = [
  <SearchInput 
    source="q" 
    placeholder="Search programs..." 
    alwaysOn 
    key="search"
  />,
];

// Custom toolbar with Save and Cancel buttons
const ProgramToolbar = () => {
  const navigate = useNavigate();
  
  const handleCancel = () => {
    navigate('/programs');
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

// JSON Dialog Component for viewing program JSON cache
const ProgramJsonDialog = ({ open, onClose, title, jsonData }) => (
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

// View JSON Button Component
const ViewJsonButton = () => {
  const record = useRecordContext();
  const notify = useNotify();
  const [jsonDialogOpen, setJsonDialogOpen] = useState(false);
  const [jsonData, setJsonData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleViewJson = async () => {
    if (!record) return;

    setIsLoading(true);
    try {
      const json = await getProgramJSON(record.id);
      setJsonData(json);
      setJsonDialogOpen(true);
    } catch (error) {
      notify(`Error fetching JSON: ${error.message}`, { type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={handleViewJson}
        disabled={isLoading}
        label={isLoading ? "Loading..." : "View JSON"}
        variant="outlined"
        color="primary"
      />
      <ProgramJsonDialog
        open={jsonDialogOpen}
        onClose={() => setJsonDialogOpen(false)}
        title={`Program JSON: ${record?.program_name}`}
        jsonData={jsonData}
      />
    </>
  );
};

// Refresh JSON Button Component
const RefreshJsonButton = () => {
  const record = useRecordContext();
  const notify = useNotify();
  const refresh = useRefresh();
  const [isLoading, setIsLoading] = useState(false);

  const handleRefreshJson = async () => {
    if (!record) return;

    setIsLoading(true);
    try {
      await refreshProgramJSON(record.id);
      notify('JSON cache refreshed successfully', { type: 'success' });
      refresh();
    } catch (error) {
      notify(`Error refreshing JSON: ${error.message}`, { type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleRefreshJson}
      disabled={isLoading}
      label={isLoading ? "Refreshing..." : "Refresh JSON"}
      variant="outlined"
      color="secondary"
    />
  );
};

// Bulk Refresh JSON Button Component
const BulkRefreshProgramJsonButton = () => {
  const notify = useNotify();
  const refresh = useRefresh();
  const [isLoading, setIsLoading] = useState(false);

  const handleRefreshAll = async () => {
    setIsLoading(true);
    try {
      const result = await refreshAllProgramJSONs();
      notify(
        `Successfully refreshed ${result.refreshed_count}/${result.total_count} program JSONs`,
        { type: 'success' }
      );
      if (result.failed_count > 0) {
        notify(
          `${result.failed_count} programs failed to refresh`,
          { type: 'warning' }
        );
      }
      refresh();
    } catch (error) {
      notify(`Error refreshing all JSONs: ${error.message}`, { type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleRefreshAll}
      disabled={isLoading}
      label={isLoading ? "Refreshing..." : "Refresh All JSONs"}
      variant="outlined"
      color="primary"
    />
  );
};

const ProgramListActions = () => (
  <TopToolbar>
    <FilterButton />
    <CreateButton />
    <ExportButton />
    <BulkRefreshProgramJsonButton />
  </TopToolbar>
);

const ProgramShowActions = () => (
  <TopToolbar>
    <ListButton label="Back to Programs" />
    <EditButton />
    <ViewJsonButton />
    <RefreshJsonButton />
  </TopToolbar>
);

export const ProgramList = () => (
  <List 
    filters={programFilters}
    actions={<ProgramListActions />} 
    sort={{ field: 'creation_date_utc', order: 'DESC' }}
    perPage={20}
  >
    <Datagrid>
      <TextField source="id" sortable />
      <TextField source="program_name" label="Program Name" sortable />
      <ReferenceField 
        source="general_media_description_id" 
        reference="media-descriptions" 
        label="Media Description"
        link="show"
      >
        <TextField source="episode_title" />
      </ReferenceField>
      <DateField source="creation_date_utc" label="Created" sortable />
      <EditButton />
      <ShowButton />
      <DeleteButton />
    </Datagrid>
  </List>
);

export const ProgramCreate = () => (
  <Create redirect="list">
    <SimpleForm toolbar={<ProgramToolbar />}>
      <TextInput
        source="program_name"
        label="Program Name"
        validate={[required()]}
        fullWidth
      />
      <MediaDescriptionInput
        source="general_media_description_id"
        label="Media Description (Optional)"
        allowDirectUUID={true}
        mediaTypeFilter="program"
      />
    </SimpleForm>
  </Create>
);

export const ProgramEdit = () => (
  <Edit>
    <SimpleForm toolbar={<ProgramToolbar />}>
      <TextInput
        source="program_name"
        label="Program Name"
        validate={[required()]}
        fullWidth
      />
      <MediaDescriptionInput
        source="general_media_description_id"
        label="Media Description (Optional)"
        allowDirectUUID={true}
        mediaTypeFilter="program"
      />
    </SimpleForm>
  </Edit>
);

export const ProgramShow = () => (
  <Show actions={<ProgramShowActions />}>
    <SimpleShowLayout>
      <TextField source="id" />
      <TextField source="program_name" label="Program Name" />
      <ReferenceField 
        source="general_media_description_id" 
        reference="media-descriptions" 
        label="Media Description"
        link="show"
      >
        <TextField source="episode_title" />
      </ReferenceField>
      <DateField source="creation_date_utc" label="Created" />
    </SimpleShowLayout>
  </Show>
);