import React, { useState } from 'react';
import {
  List,
  Datagrid,
  TextField,
  DateField,
  Create,
  SimpleForm,
  TextInput,
  NumberInput,
  ReferenceInput,
  SelectInput,
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
  ReferenceField,
  useRecordContext,
  useNotify,
  useRefresh,
} from 'react-admin';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogTitle, DialogContent, DialogActions, Box } from '@mui/material';
import { MediaDescriptionInput } from '../inputs/MediaDescriptionInput';
import { getSeasonJSON, refreshSeasonJSON, refreshAllSeasonJSONs } from 'share';

// Define filters for the season list
// API supports: q (search) and program_id (filter by program)
const seasonFilters = [
  <SearchInput 
    source="q" 
    placeholder="Search seasons..." 
    alwaysOn 
    key="search"
  />,
  <ReferenceInput
    source="program_id"
    reference="programs"
    key="program_filter"
  >
    <SelectInput label="Program" />
  </ReferenceInput>,
];

// Custom toolbar with Save and Cancel buttons
const SeasonToolbar = () => {
  const navigate = useNavigate();
  
  const handleCancel = () => {
    navigate('/seasons');
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

// JSON Dialog Component for viewing season JSON cache
const SeasonJsonDialog = ({ open, onClose, title, jsonData }) => (
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
      const json = await getSeasonJSON(record.id);
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
      <SeasonJsonDialog
        open={jsonDialogOpen}
        onClose={() => setJsonDialogOpen(false)}
        title={`Season JSON: ${record?.season_name || `Season ${record?.season_number}`}`}
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
      await refreshSeasonJSON(record.id);
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
const BulkRefreshSeasonJsonButton = () => {
  const notify = useNotify();
  const refresh = useRefresh();
  const [isLoading, setIsLoading] = useState(false);

  const handleRefreshAll = async () => {
    setIsLoading(true);
    try {
      const result = await refreshAllSeasonJSONs();
      notify(
        `Successfully refreshed ${result.refreshed_count}/${result.total_count} season JSONs`,
        { type: 'success' }
      );
      if (result.failed_count > 0) {
        notify(
          `${result.failed_count} seasons failed to refresh`,
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

const SeasonListActions = () => (
  <TopToolbar>
    <FilterButton />
    <CreateButton />
    <ExportButton />
    <BulkRefreshSeasonJsonButton />
  </TopToolbar>
);

const SeasonShowActions = () => (
  <TopToolbar>
    <ListButton label="Back to Seasons" />
    <EditButton />
    <ViewJsonButton />
    <RefreshJsonButton />
  </TopToolbar>
);

export const SeasonList = () => (
  <List 
    filters={seasonFilters}
    actions={<SeasonListActions />} 
    sort={{ field: 'creation_date_utc', order: 'DESC' }}
    perPage={20}
  >
    <Datagrid>
      <TextField source="id" sortable />
      <ReferenceField 
        source="program_id" 
        reference="programs" 
        label="Program"
      >
        <TextField source="program_name" />
      </ReferenceField>
      <TextField source="season_number" label="Season #" sortable />
      <TextField source="season_name" label="Season Name" />
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

export const SeasonCreate = () => (
  <Create redirect="list">
    <SimpleForm toolbar={<SeasonToolbar />}>
      <ReferenceInput 
        source="program_id" 
        reference="programs"
      >
        <SelectInput optionText="program_name" />
      </ReferenceInput>
      <NumberInput 
        source="season_number" 
        label="Season Number"
        validate={[required()]} 
        min={1}
      />
      <TextInput 
        source="season_name" 
        label="Season Name (Optional)"
        fullWidth 
      />
      <MediaDescriptionInput
        source="general_media_description_id"
        label="Media Description (Optional)"
        allowDirectUUID={true}
        mediaTypeFilter="season"
      />
    </SimpleForm>
  </Create>
);

export const SeasonEdit = () => (
  <Edit>
    <SimpleForm toolbar={<SeasonToolbar />}>
      <ReferenceInput 
        source="program_id" 
        reference="programs"
      >
        <SelectInput optionText="program_name" />
      </ReferenceInput>
      <NumberInput 
        source="season_number" 
        label="Season Number"
        validate={[required()]} 
        min={1}
      />
      <TextInput 
        source="season_name" 
        label="Season Name (Optional)"
        fullWidth 
      />
      <MediaDescriptionInput
        source="general_media_description_id"
        label="Media Description (Optional)"
        allowDirectUUID={true}
        mediaTypeFilter="season"
      />
    </SimpleForm>
  </Edit>
);

export const SeasonShow = () => (
  <Show actions={<SeasonShowActions />}>
    <SimpleShowLayout>
      <TextField source="id" />
      <ReferenceField source="program_id" reference="programs" label="Program">
        <TextField source="program_name" />
      </ReferenceField>
      <TextField source="season_number" label="Season Number" />
      <TextField source="season_name" label="Season Name" />
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