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
  ArrayField,
  SingleFieldList,
  ChipField,
  useRecordContext,
  useNotify,
  useRefresh,
  ReferenceArrayInput,
  AutocompleteArrayInput,
  DateInput,
  useDataProvider,
} from 'react-admin';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogTitle, DialogContent, DialogActions, Typography, Box, Alert, IconButton, List as MuiList, ListItem, ListItemText, ListItemSecondaryAction, TextField as MuiTextField, Button as MuiButton } from '@mui/material';
import { DragHandle, Delete } from '@mui/icons-material';
// Import API functions from share package
import {
  getMediaShowcases,
  getMediaShowcase,
  createMediaShowcase,
  updateMediaShowcase,
  deleteMediaShowcase,
  getMediaShowcaseJSON,
  refreshMediaShowcaseJSON,
  refreshAllMediaShowcaseJSONs
} from 'share';

// Define list type choices
const listTypeChoices = [
  { id: 'classic', name: 'Classic' },
  { id: 'carousel', name: 'Carousel' },
  { id: 'hero', name: 'Hero' },
  { id: 'field', name: 'Field' },
  { id: 'ranking', name: 'Ranking' },
];

// Define thumbnail format choices
const thumbnailFormatChoices = [
  { id: '1920x1080', name: '1920x1080 (Large Landscape)' },
  { id: '1920x720', name: '1920x720 (Wide Landscape)' },
  { id: '1080x1080', name: '1080x1080 (Square)' },
  { id: '810x1080', name: '810x1080 (Portrait)' },
  { id: '1080x1920', name: '1080x1920 (Vertical Mobile)' },
];

// Define filters for the media showcase list
const mediaShowcaseFilters = [
  <SearchInput
    source="q"
    placeholder="Search media showcases..."
    alwaysOn
    key="search"
  />,
  <SelectInput
    source="list_type"
    label="List Type"
    choices={listTypeChoices}
    key="list_type"
    allowEmpty
  />,
  <SelectInput
    source="thumbnail_format"
    label="Thumbnail Format"
    choices={thumbnailFormatChoices}
    key="thumbnail_format"
    allowEmpty
  />,
  <BooleanInput
    source="is_active"
    label="Active Only"
    key="is_active"
  />,
];

// Custom toolbar with Save and Cancel buttons
const MediaShowcaseToolbar = () => {
  const navigate = useNavigate();

  const handleCancel = () => {
    navigate('/media-showcases');
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

// Bulk refresh JSON button component
const BulkRefreshJsonButton = () => {
  const notify = useNotify();
  const [isLoading, setIsLoading] = useState(false);

  const handleRefreshAll = async () => {
    setIsLoading(true);
    try {
      const result = await refreshAllMediaShowcaseJSONs();
      notify(
        `Successfully refreshed ${result.success_count}/${result.total_count} showcase JSONs`,
        { type: 'success' }
      );
      if (result.error_count > 0) {
        notify(
          `${result.error_count} showcases failed to refresh`,
          { type: 'warning' }
        );
      }
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

const MediaShowcaseListActions = () => (
  <TopToolbar>
    <FilterButton />
    <CreateButton />
    <ExportButton />
    <BulkRefreshJsonButton />
  </TopToolbar>
);

// JSON Dialog Component for viewing showcase JSON cache
const JsonDialog = ({ open, onClose, title, jsonData }) => (
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

// View JSON Button - TODO: Implement JSON cache endpoint in share package
const ViewJsonButton = () => {
  const record = useRecordContext();
  const notify = useNotify();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [jsonData, setJsonData] = useState(null);

  const handleViewJson = async () => {
    if (!record?.id) return;

    try {
      const json = await getMediaShowcaseJSON(record.id);
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
      <JsonDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Media Showcase JSON"
        jsonData={jsonData}
      />
    </>
  );
};

// Refresh JSON Cache Button - TODO: Implement in share package
const RefreshJsonButton = () => {
  const record = useRecordContext();
  const notify = useNotify();
  const refresh = useRefresh();

  const handleRefreshJson = async () => {
    if (!record?.id) return;

    try {
      await refreshMediaShowcaseJSON(record.id);
      notify('JSON cache refreshed successfully', { type: 'success' });
      refresh();
    } catch (error) {
      notify(`Error refreshing JSON: ${error.message}`, { type: 'error' });
    }
  };

  return (
    <Button
      onClick={handleRefreshJson}
      label="Refresh JSON"
      variant="outlined"
      color="secondary"
    />
  );
};

// Custom component for managing media descriptions with ordering
const MediaDescriptionManager = ({ source, ...props }) => {
  const record = useRecordContext();
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const [selectedIds, setSelectedIds] = React.useState(record?.[source] || []);
  const [manualId, setManualId] = React.useState('');
  const [manualError, setManualError] = React.useState<string | null>(null);
  const [isAddingById, setIsAddingById] = React.useState(false);

  const handleAdd = (newIds) => {
    const uniqueIds = [...new Set([...selectedIds, ...newIds])];
    setSelectedIds(uniqueIds);
    // Update the record
    if (props.onChange) {
      props.onChange(uniqueIds);
    }
  };

  const handleRemove = (idToRemove) => {
    const updatedIds = selectedIds.filter(id => id !== idToRemove);
    setSelectedIds(updatedIds);
    if (props.onChange) {
      props.onChange(updatedIds);
    }
  };

  const handleReorder = (fromIndex, toIndex) => {
    const reorderedIds = [...selectedIds];
    const [removed] = reorderedIds.splice(fromIndex, 1);
    reorderedIds.splice(toIndex, 0, removed);
    setSelectedIds(reorderedIds);
    if (props.onChange) {
      props.onChange(reorderedIds);
    }
  };

  React.useEffect(() => {
    if (record?.[source] && JSON.stringify(record[source]) !== JSON.stringify(selectedIds)) {
      setSelectedIds(record[source]);
    }
  }, [record, source]);

  React.useEffect(() => {
    if (Array.isArray(props?.value) && JSON.stringify(props.value) !== JSON.stringify(selectedIds)) {
      setSelectedIds(props.value);
    }
  }, [props?.value, selectedIds]);

  const handleManualAdd = async () => {
    const trimmedId = manualId.trim();

    if (!trimmedId) {
      setManualError('Enter a media description ID');
      return;
    }

    if (selectedIds.includes(trimmedId)) {
      setManualError('Media description already added');
      return;
    }

    setManualError(null);
    setIsAddingById(true);

    try {
      const result = await dataProvider.getOne('media-descriptions', { id: trimmedId });
      handleAdd([trimmedId]);
      notify(
        result?.data?.episode_title
          ? `Added ${result.data.episode_title}`
          : 'Media description added',
        { type: 'info' }
      );
      setManualId('');
    } catch (error) {
      setManualError('Media description not found');
      notify(`Unable to find media description ${trimmedId}`, { type: 'warning' });
    } finally {
      setIsAddingById(false);
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Media Descriptions (Ordered)
      </Typography>

      {/* Add new items */}
      <ReferenceArrayInput
        source={source}
        reference="media-descriptions"
        label="Add Media Items"
        value={selectedIds}
        onChange={handleAdd}
      >
        <AutocompleteArrayInput
          optionText="episode_title"
          filterToQuery={searchText => ({ episode_title: searchText })}
        />
      </ReferenceArrayInput>

      <Box mt={2}>
        <Typography variant="subtitle1" gutterBottom>
          Add by ID
        </Typography>
        <Box display="flex" gap={2} alignItems="flex-start">
          <TextField
            label="Media Description ID"
            value={manualId}
            onChange={event => setManualId(event.target.value)}
            size="small"
            fullWidth
            error={Boolean(manualError)}
            helperText={manualError || 'Paste a MediaDescription UUID to append it directly'}
          />
          <MuiButton
            variant="contained"
            color="primary"
            onClick={handleManualAdd}
            disabled={isAddingById}
          >
            {isAddingById ? 'Adding…' : 'Add'}
          </MuiButton>
        </Box>
      </Box>

      {/* Display current items with reordering */}
      <Box mt={2}>
        <Typography variant="subtitle1" gutterBottom>
          Current Items (drag to reorder):
        </Typography>
        <MuiList>
          {selectedIds.map((id, index) => (
            <ListItem key={id} divider>
              <IconButton size="small">
                <DragHandle />
              </IconButton>
              <ListItemText
                primary={`Item ${index + 1}`}
                secondary={`ID: ${id}`}
              />
              <ListItemSecondaryAction>
                <IconButton
                  edge="end"
                  onClick={() => handleRemove(id)}
                  size="small"
                  color="error"
                >
                  <Delete />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </MuiList>
        {selectedIds.length === 0 && (
          <Typography variant="body2" color="textSecondary" style={{ fontStyle: 'italic' }}>
            No media items added yet. Use the selector above to add items.
          </Typography>
        )}
      </Box>
    </Box>
  );
};

const MediaShowcaseShowActions = () => (
  <TopToolbar>
    <ListButton label="Back to Media Showcases" />
    <EditButton />
    <ViewJsonButton />
    <RefreshJsonButton />
  </TopToolbar>
);

export const MediaShowcaseList = () => (
  <List
    filters={mediaShowcaseFilters}
    actions={<MediaShowcaseListActions />}
    sort={{ field: 'creation_date_utc', order: 'DESC' }}
    perPage={20}
  >
    <Datagrid>
      <TextField source="title" sortable />
      <FunctionField
        label="Type"
        render={record => {
          const type = listTypeChoices.find(choice => choice.id === record.list_type);
          return type ? type.name : record.list_type;
        }}
      />
      <FunctionField
        label="Format"
        render={record => {
          const format = thumbnailFormatChoices.find(choice => choice.id === record.thumbnail_format);
          return format ? format.name.replace(/\s*\([^)]*\)/, '') : record.thumbnail_format;
        }}
      />
      <BooleanField source="is_active" label="Active" />
      <TextField source="priority_in_screen" label="Priority" sortable />
      <FunctionField
        label="Items"
        render={record =>
          Array.isArray(record.media_descriptions)
            ? record.media_descriptions.length
            : (record.media_items_count || 0)
        }
      />
      <FunctionField
        label="Description"
        render={record =>
          record.description
            ? record.description.length > 40
              ? record.description.substring(0, 40) + '...'
              : record.description
            : '-'
        }
      />
      <DateField source="creation_date_utc" label="Created" sortable showTime />
      <DateField source="last_updated_utc" label="Updated" sortable showTime />
      <EditButton />
      <ShowButton />
      <FunctionField
        label="Actions"
        render={() => (
          <Box display="flex" gap={1}>
            <ViewJsonButton />
          </Box>
        )}
      />
      <DeleteButton />
    </Datagrid>
  </List>
);

export const MediaShowcaseCreate = () => (
  <Create redirect="list">
    <SimpleForm toolbar={<MediaShowcaseToolbar />}>
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
      <SelectInput
        source="list_type"
        choices={listTypeChoices}
        validate={[required()]}
        helperText="Choose classic horizontal list or carousel display"
      />
      <SelectInput
        source="thumbnail_format"
        choices={thumbnailFormatChoices}
        validate={[required()]}
        helperText="Thumbnail format for all items in this showcase"
      />
      <NumberInput
        source="percentage_width"
        validate={[required()]}
        defaultValue={100}
        min={1}
        helperText="Width percentage (minimum 1, default 100)"
      />
      <NumberInput
        source="percentage_height"
        validate={[required()]}
        defaultValue={100}
        min={1}
        helperText="Height percentage (minimum 1, default 100)"
      />
      <BooleanInput source="is_active" defaultValue={true} />
      <NumberInput
        source="priority_in_screen"
        defaultValue={0}
        min={0}
        step={1}
        helperText="Display priority (0 = highest priority, lower numbers appear first)"
      />
      <BooleanInput
        source="latest_first"
        defaultValue={true}
        label="Show Latest First"
        helperText="Order items by latest first"
      />
      <TextInput
        source="media_type"
        label="Media Type Filter (Optional)"
        helperText="Filter content by media type"
      />
      <TextInput
        source="slug"
        label="Slug (Optional)"
        helperText="SEO-friendly URL slug"
      />
      {/* Initial Media Items - Enhanced with ordering */}
      <MediaDescriptionManager
        source="media_description_ids"
      />
    </SimpleForm>
  </Create>
);

export const MediaShowcaseEdit = () => (
  <Edit>
    <SimpleForm toolbar={<MediaShowcaseToolbar />}>
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
      <SelectInput
        source="list_type"
        choices={listTypeChoices}
        validate={[required()]}
        helperText="Choose classic horizontal list or carousel display"
      />
      <SelectInput
        source="thumbnail_format"
        choices={thumbnailFormatChoices}
        validate={[required()]}
        helperText="Thumbnail format for all items in this showcase"
      />
      <NumberInput
        source="percentage_width"
        validate={[required()]}
        defaultValue={100}
        min={1}
        helperText="Width percentage (minimum 1, default 100)"
      />
      <NumberInput
        source="percentage_height"
        validate={[required()]}
        defaultValue={100}
        min={1}
        helperText="Height percentage (minimum 1, default 100)"
      />
      <BooleanInput source="is_active" />
      <NumberInput
        source="priority_in_screen"
        min={0}
        step={1}
        helperText="Display priority (0 = highest priority, lower numbers appear first)"
      />
      <BooleanInput
        source="latest_first"
        label="Show Latest First"
        helperText="Order items by latest first"
      />
      <TextInput
        source="media_type"
        label="Media Type Filter (Optional)"
        helperText="Filter content by media type"
      />
      <TextInput
        source="slug"
        label="Slug (Optional)"
        helperText="SEO-friendly URL slug"
      />

      {/* Media Description Management - Enhanced with ordering */}
      <MediaDescriptionManager
        source="media_description_ids"
      />
    </SimpleForm>
  </Edit>
);

export const MediaShowcaseShow = () => (
  <Show actions={<MediaShowcaseShowActions />}>
    <SimpleShowLayout>
      <TextField source="id" label="Showcase ID" />
      <TextField source="title" />
      <TextField source="description" />

      {/* Display Configuration */}
      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
        Display Configuration
      </Typography>
      <FunctionField
        label="List Type"
        render={record => {
          const type = listTypeChoices.find(choice => choice.id === record.list_type);
          return type ? type.name : record.list_type;
        }}
      />
      <FunctionField
        label="Thumbnail Format"
        render={record => {
          const format = thumbnailFormatChoices.find(choice => choice.id === record.thumbnail_format);
          return format ? format.name : record.thumbnail_format || 'Not set';
        }}
      />
      <TextField source="percentage_width" label="Width %" />
      <TextField source="percentage_height" label="Height %" />
      <BooleanField source="is_active" label="Active" />
      <TextField source="priority_in_screen" label="Display Priority" />
      <BooleanField source="latest_first" label="Show Latest First" />

      {/* Content Configuration */}
      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
        Content Configuration
      </Typography>
      <TextField source="media_type" label="Media Type Filter" />
      <ArrayField source="media_categories_list" label="Media Categories">
        <SingleFieldList>
          <ChipField source="" />
        </SingleFieldList>
      </ArrayField>
      <TextField source="slug" label="SEO Slug" />

      {/* Media Items */}
      <FunctionField
        label=""
        render={(record) => (
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Media Items ({Array.isArray(record?.media_descriptions) ? record.media_descriptions.length : 0})
          </Typography>
        )}
      />
      <ArrayField source="media_descriptions" label="">
        <Datagrid>
          <FunctionField
            label="Priority"
            render={(record, source) => {
              const showcase = useRecordContext();
              // Find the priority from the association table if available
              // For now, show the index position as a placeholder
              const index = showcase?.media_descriptions?.findIndex(item => item.id === record.id);
              return index !== undefined ? index + 1 : '-';
            }}
          />
          <TextField source="episode_title" />
          <TextField source="media_type" />
          <BooleanField source="is_featured" />
          <TextField source="id" label="Media ID" />
        </Datagrid>
      </ArrayField>

      {/* System Information */}
      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
        System Information
      </Typography>
      <DateField source="creation_date_utc" label="Created" showTime />
      <DateField source="last_updated_utc" label="Last Updated" showTime />
      <DateField source="json_last_updated" label="JSON Cache Updated" showTime />
    </SimpleShowLayout>
  </Show>
);
