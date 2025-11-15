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
  useInput,
} from 'react-admin';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogTitle, DialogContent, DialogActions, Typography, Box, Alert, IconButton, List as MuiList, ListItem, ListItemText, ListItemSecondaryAction, TextField as MuiTextField, Button as MuiButton, Autocomplete, Card, CardContent, CardMedia, CircularProgress } from '@mui/material';
import { DragHandle, Delete } from '@mui/icons-material';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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

// Media item card with drag and drop support
interface MediaItemData {
  id: string;
  episode_title?: string;
  image_url?: string;
  loading?: boolean;
}

const MediaItemCard: React.FC<{
  item: MediaItemData;
  onRemove: (id: string) => void;
}> = ({ item, onRemove }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      sx={{
        mb: 1,
        display: 'flex',
        alignItems: 'center',
        cursor: 'grab',
        '&:active': { cursor: 'grabbing' },
      }}
    >
      <Box {...attributes} {...listeners} sx={{ p: 1, display: 'flex', alignItems: 'center' }}>
        <DragHandle sx={{ color: 'action.active' }} />
      </Box>

      {item.loading ? (
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <CircularProgress size={60} />
          <Typography>Loading...</Typography>
        </Box>
      ) : (
        <>
          {item.image_url ? (
            <CardMedia
              component="img"
              sx={{ width: 80, height: 80, objectFit: 'cover' }}
              image={item.image_url}
              alt={item.episode_title || 'Media thumbnail'}
            />
          ) : (
            <Box
              sx={{
                width: 80,
                height: 80,
                bgcolor: 'grey.300',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography variant="caption" color="text.secondary">
                No image
              </Typography>
            </Box>
          )}
          <CardContent sx={{ flex: 1 }}>
            <Typography variant="body1" fontWeight="medium">
              {item.episode_title || 'Untitled'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ID: {item.id}
            </Typography>
          </CardContent>
        </>
      )}

      <IconButton
        onClick={() => onRemove(item.id)}
        sx={{ mr: 1 }}
        color="error"
        size="small"
      >
        <Delete />
      </IconButton>
    </Card>
  );
};

// Custom component for managing media descriptions with ordering
const MediaDescriptionManager = ({ source, ...props }) => {
  const { field } = useInput({ source, ...props });
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const [manualId, setManualId] = React.useState('');
  const [manualError, setManualError] = React.useState<string | null>(null);
  const [isAddingById, setIsAddingById] = React.useState(false);
  const [searchOptions, setSearchOptions] = React.useState([]);
  const [searchLoading, setSearchLoading] = React.useState(false);
  const [searchText, setSearchText] = React.useState('');
  const [debouncedSearchText, setDebouncedSearchText] = React.useState('');
  const [selectedSearchOption, setSelectedSearchOption] = React.useState(null);
  const [mediaItems, setMediaItems] = React.useState<MediaItemData[]>([]);
  const [loadingItems, setLoadingItems] = React.useState<Set<string>>(new Set());

  const selectedIds = field.value || [];

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Debounce search text - update debouncedSearchText 300ms after user stops typing
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchText]);

  // Perform search when debounced search text changes
  React.useEffect(() => {
    const performSearch = async () => {
      if (!debouncedSearchText || debouncedSearchText.length < 2) {
        setSearchOptions([]);
        setSearchLoading(false);
        return;
      }

      setSearchLoading(true);
      try {
        const { data } = await dataProvider.getList('media-descriptions', {
          pagination: { page: 1, perPage: 20 },
          filter: { q: debouncedSearchText },
          sort: { field: 'episode_title', order: 'ASC' }
        });
        setSearchOptions(data || []);
      } catch (error) {
        notify('Error searching media descriptions', { type: 'error' });
        setSearchOptions([]);
      } finally {
        setSearchLoading(false);
      }
    };

    performSearch();
  }, [debouncedSearchText, dataProvider, notify]);

  // Fetch MediaDescription data with images when selectedIds changes
  React.useEffect(() => {
    const fetchMediaData = async () => {
      if (!selectedIds.length) {
        setMediaItems([]);
        return;
      }

      // Create initial loading items
      const loadingItems = selectedIds.map(id => ({
        id,
        loading: true,
      }));
      setMediaItems(loadingItems);

      // Fetch each media description with its image
      const fetchedItems = await Promise.all(
        selectedIds.map(async (id) => {
          try {
            // Fetch the MediaDescription
            const mediaDesc = await dataProvider.getOne('media-descriptions', { id });

            // Try to get the 1080x1080 image first, fallback to 1920x1080
            let imageUrl = null;
            const imageId = mediaDesc.data.image_1080_1080_id || mediaDesc.data.image_1920_1080_id;

            if (imageId) {
              try {
                const pictureData = await dataProvider.getOne('pictures', { id: imageId });
                imageUrl = pictureData.data.image_url;
              } catch (error) {
                console.warn(`Failed to fetch picture ${imageId}:`, error);
              }
            }

            return {
              id,
              episode_title: mediaDesc.data.episode_title,
              image_url: imageUrl,
              loading: false,
            };
          } catch (error) {
            console.error(`Failed to fetch media description ${id}:`, error);
            return {
              id,
              episode_title: 'Error loading',
              image_url: null,
              loading: false,
            };
          }
        })
      );

      setMediaItems(fetchedItems);
    };

    fetchMediaData();
  }, [selectedIds, dataProvider]);

  const handleAdd = (newIds: string[], position: 'head' | 'queue' = 'queue') => {
    let uniqueIds: string[];
    if (position === 'head') {
      // Add to the beginning, avoiding duplicates
      const newUniqueIds = newIds.filter(id => !selectedIds.includes(id));
      uniqueIds = [...newUniqueIds, ...selectedIds];
    } else {
      // Add to the end (existing behavior)
      uniqueIds = [...new Set([...selectedIds, ...newIds])];
    }
    field.onChange(uniqueIds);
  };

  const handleRemove = (idToRemove) => {
    const updatedIds = selectedIds.filter(id => id !== idToRemove);
    field.onChange(updatedIds);
  };

  const handleReorder = (fromIndex, toIndex) => {
    const reorderedIds = [...selectedIds];
    const [removed] = reorderedIds.splice(fromIndex, 1);
    reorderedIds.splice(toIndex, 0, removed);
    field.onChange(reorderedIds);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = selectedIds.indexOf(active.id as string);
      const newIndex = selectedIds.indexOf(over.id as string);
      const reorderedIds = arrayMove(selectedIds, oldIndex, newIndex);
      field.onChange(reorderedIds);
    }
  };

  const handleManualAdd = async (position: 'head' | 'queue') => {
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
      handleAdd([trimmedId], position);
      const positionText = position === 'head' ? 'to beginning' : 'to end';
      notify(
        result?.data?.episode_title
          ? `Added ${result.data.episode_title} ${positionText}`
          : `Media description added ${positionText}`,
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
      <Box mb={2}>
        <Typography variant="subtitle1" gutterBottom>
          Search and Add Media Items
        </Typography>
        <Autocomplete
          options={searchOptions}
          getOptionLabel={(option) => option.episode_title || ''}
          loading={searchLoading}
          value={selectedSearchOption}
          onInputChange={(event, value) => setSearchText(value)}
          onChange={(event, newValue) => {
            setSelectedSearchOption(newValue);
          }}
          inputValue={searchText}
          renderInput={(params) => (
            <MuiTextField
              {...params}
              label="Search by Title"
              helperText="Type to search media descriptions by title (updates as you type)"
            />
          )}
          noOptionsText={searchText.length < 2 ? "Type at least 2 characters..." : "No results found"}
          filterOptions={(x) => x}
        />
        <Box display="flex" gap={2} mt={1}>
          <MuiButton
            variant="contained"
            color="primary"
            onClick={() => {
              if (selectedSearchOption?.id) {
                handleAdd([selectedSearchOption.id], 'head');
                notify(
                  `Added ${selectedSearchOption.episode_title || 'media description'} to beginning`,
                  { type: 'info' }
                );
                setSearchText('');
                setSelectedSearchOption(null);
                setSearchOptions([]);
              }
            }}
            disabled={!selectedSearchOption}
          >
            Add in Head
          </MuiButton>
          <MuiButton
            variant="contained"
            color="primary"
            onClick={() => {
              if (selectedSearchOption?.id) {
                handleAdd([selectedSearchOption.id], 'queue');
                notify(
                  `Added ${selectedSearchOption.episode_title || 'media description'} to end`,
                  { type: 'info' }
                );
                setSearchText('');
                setSelectedSearchOption(null);
                setSearchOptions([]);
              }
            }}
            disabled={!selectedSearchOption}
          >
            Add in Queue
          </MuiButton>
        </Box>
      </Box>

      <Box mt={2}>
        <Typography variant="subtitle1" gutterBottom>
          Add by ID
        </Typography>
        <MuiTextField
          label="Media Description ID"
          value={manualId}
          onChange={event => setManualId(event.target.value)}
          size="small"
          fullWidth
          error={Boolean(manualError)}
          helperText={manualError || 'Paste a MediaDescription UUID'}
        />
        <Box display="flex" gap={2} mt={1}>
          <MuiButton
            variant="contained"
            color="primary"
            onClick={() => handleManualAdd('head')}
            disabled={isAddingById}
          >
            {isAddingById ? 'Adding…' : 'Add in Head'}
          </MuiButton>
          <MuiButton
            variant="contained"
            color="primary"
            onClick={() => handleManualAdd('queue')}
            disabled={isAddingById}
          >
            {isAddingById ? 'Adding…' : 'Add in Queue'}
          </MuiButton>
        </Box>
      </Box>

      {/* Display current items with drag-and-drop reordering */}
      <Box mt={2}>
        <Typography variant="subtitle1" gutterBottom>
          Current Items (drag to reorder):
        </Typography>
        {mediaItems.length === 0 && selectedIds.length === 0 ? (
          <Typography variant="body2" color="textSecondary" style={{ fontStyle: 'italic' }}>
            No media items added yet. Use the selector above to add items.
          </Typography>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={mediaItems.map(item => item.id)}
              strategy={verticalListSortingStrategy}
            >
              {mediaItems.map((item) => (
                <MediaItemCard
                  key={item.id}
                  item={item}
                  onRemove={handleRemove}
                />
              ))}
            </SortableContext>
          </DndContext>
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
        defaultValue={false}
        label="Show Latest First"
        helperText="Order items by latest first - reversing the displayed order"
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
      <TextInput
        source="relative_url_link"
        label="Relative URL Link (Optional)"
        helperText="Relative URL path for navigation (e.g., /category/action)"
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
        helperText="Order items by latest first - reversing the displayed order"
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
      <TextInput
        source="relative_url_link"
        label="Relative URL Link (Optional)"
        helperText="Relative URL path for navigation (e.g., /category/action)"
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
      <TextField source="relative_url_link" label="Relative URL Link" />

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
