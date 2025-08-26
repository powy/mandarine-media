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
} from 'react-admin';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogTitle, DialogContent, DialogActions, Typography, Box } from '@mui/material';
import { getContentListJSON, regenerateContentListJSON, reorderContentList } from 'share';

// Define thumbnail format choices - dimension-based naming
const thumbnailFormatChoices = [
  { id: '1920x1080', name: '1920x1080 (Large Landscape)' },
  { id: '1920x720', name: '1920x720 (Wide Landscape)' },
  { id: '1080x1080', name: '1080x1080 (Square)' },
  { id: '810x1080', name: '810x1080 (Portrait)' },
  { id: '1080x1920', name: '1080x1920 (Vertical Mobile)' },
];

// Backward compatibility mapping for old enum values
const legacyThumbnailFormatMapping = {
  'small_square': '1080x1080 (Square) [Legacy]',
  'medium_portrait': '810x1080 (Portrait) [Legacy]', 
  'large_landscape': '1920x1080 (Large Landscape) [Legacy]',
  'vertical_mobile': '1080x1920 (Vertical Mobile) [Legacy]'
};

// Helper function to get thumbnail format display name
const getThumbnailFormatDisplayName = (thumbnailFormat: string) => {
  // Try to find in current choices first
  const format = thumbnailFormatChoices.find(choice => choice.id === thumbnailFormat);
  if (format) return format.name;
  
  // Check legacy mapping
  if (legacyThumbnailFormatMapping[thumbnailFormat as keyof typeof legacyThumbnailFormatMapping]) {
    return legacyThumbnailFormatMapping[thumbnailFormat as keyof typeof legacyThumbnailFormatMapping];
  }
  
  // Fallback to raw value
  return thumbnailFormat;
};

// Define list type choices
const listTypeChoices = [
  { id: 'classic', name: 'Classic' },
  { id: 'carrousel', name: 'Carrousel' },
];

// Define media type choices
const mediaTypeChoices = [
  { id: 'video', name: 'Video' },
  { id: 'webtoon', name: 'Webtoon' },
  { id: 'trailer', name: 'Trailer' },
  { id: 'teaser', name: 'Teaser' },
  { id: 'excerpt', name: 'Excerpt' },
];

// Define filters for the content list
const contentListFilters = [
  <SearchInput 
    source="q" 
    placeholder="Search content lists..." 
    alwaysOn 
    key="search"
  />,
  <SelectInput 
    source="thumbnail_format" 
    label="Thumbnail Format"
    choices={thumbnailFormatChoices}
    key="thumbnail_format"
  />,
];

// Custom toolbar with Save and Cancel buttons
const ContentListToolbar = () => {
  const navigate = useNavigate();
  
  const handleCancel = () => {
    navigate('/content-lists');
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

const ContentListListActions = () => (
  <TopToolbar>
    <FilterButton />
    <CreateButton />
    <ExportButton />
  </TopToolbar>
);

// JSON Dialog Component
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

// View JSON Button
const ViewJsonButton = () => {
  const record = useRecordContext();
  const notify = useNotify();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [jsonData, setJsonData] = useState(null);

  const handleViewJson = async () => {
    if (!record?.id) return;
    
    try {
      const json = await getContentListJSON(record.id);
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
        title="Content List JSON"
        jsonData={jsonData}
      />
    </>
  );
};

// Regenerate JSON Button
const RegenerateJsonButton = () => {
  const record = useRecordContext();
  const notify = useNotify();
  const refresh = useRefresh();

  const handleRegenerateJson = async () => {
    if (!record?.id) return;
    
    try {
      await regenerateContentListJSON(record.id);
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

const ContentListShowActions = () => (
  <TopToolbar>
    <ListButton label="Back to Content Lists" />
    <EditButton />
    <ViewJsonButton />
    <RegenerateJsonButton />
  </TopToolbar>
);

export const ContentListList = () => (
  <List 
    filters={contentListFilters}
    actions={<ContentListListActions />} 
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
      <FunctionField 
        label="Thumbnail Format" 
        render={record => getThumbnailFormatDisplayName(record.thumbnail_format)}
      />
      <FunctionField 
        label="List Type" 
        render={record => {
          const type = listTypeChoices.find(choice => choice.id === record.list_type);
          return type ? type.name : record.list_type;
        }}
      />
      <TextField source="percentage_width" label="Width%" />
      <TextField source="percentage_height" label="Height%" />
      <BooleanField source="latest_first" label="Latest First" />
      <BooleanField source="is_active" label="Active" />
      <TextField source="display_order" label="Order" />
      <FunctionField 
        label="Content Items" 
        render={record => 
          Array.isArray(record.content_items) 
            ? record.content_items.length 
            : 0
        } 
      />
      <DateField source="creation_date_utc" label="Created" sortable />
      <EditButton />
      <ShowButton />
      <FunctionField
        label="JSON"
        render={() => (
          <ViewJsonButton />
        )}
      />
      <DeleteButton />
    </Datagrid>
  </List>
);

export const ContentListCreate = () => (
  <Create redirect="list">
    <SimpleForm toolbar={<ContentListToolbar />}>
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
        source="thumbnail_format"
        choices={thumbnailFormatChoices}
        validate={[required()]}
        helperText="Choose the standardized thumbnail format for this content list"
      />
      <SelectInput
        source="list_type"
        label="List Type"
        choices={listTypeChoices}
        validate={[required()]}
        helperText="Choose the list display type"
      />
      <NumberInput 
        source="percentage_width" 
        label="Percentage Width"
        validate={[required()]} 
        helperText="Width percentage (0-100)"
        min={0}
        max={100}
        defaultValue={100}
      />
      <NumberInput 
        source="percentage_height" 
        label="Percentage Height"
        validate={[required()]} 
        helperText="Height percentage (0-100)"
        min={0}
        max={100}
        defaultValue={100}
      />
      <BooleanInput 
        source="latest_first" 
        label="Latest First"
        defaultValue={true} 
        helperText="Order items by latest first"
      />
      <BooleanInput source="is_active" defaultValue={true} />
      <NumberInput 
        source="display_order" 
        defaultValue={0} 
        helperText="Order for display (lower numbers appear first)"
      />
      <SelectInput
        source="media_type"
        label="Media Type (Optional)"
        choices={mediaTypeChoices}
        helperText="Filter by media type"
      />
      <TextInput 
        source="slug" 
        label="Slug (Optional)"
        helperText="SEO-friendly URL slug"
      />
      <ArrayInput source="media_categories_id_list" label="Media Categories (Optional)">
        <SimpleFormIterator>
          <TextInput label="Category ID" />
        </SimpleFormIterator>
      </ArrayInput>
      <ArrayInput source="themes_and_genres_id_list" label="Themes and Genres (Optional)">
        <SimpleFormIterator>
          <TextInput label="Theme/Genre ID" />
        </SimpleFormIterator>
      </ArrayInput>
      <ArrayInput source="content_items" label="Content Items">
        <SimpleFormIterator>
          <TextInput label="Content ID (UUID)" validate={[required()]} />
        </SimpleFormIterator>
      </ArrayInput>
      <ArrayInput source="content_types" label="Content Types">
        <SimpleFormIterator>
          <SelectInput 
            label="Content Type"
            choices={[
              { id: 'program', name: 'Program' },
              { id: 'season', name: 'Season' },
              { id: 'media_description', name: 'Media Description' }
            ]}
            validate={[required()]}
          />
        </SimpleFormIterator>
      </ArrayInput>
    </SimpleForm>
  </Create>
);

export const ContentListEdit = () => (
  <Edit>
    <SimpleForm toolbar={<ContentListToolbar />}>
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
        source="thumbnail_format"
        choices={thumbnailFormatChoices}
        validate={[required()]}
        helperText="Choose the standardized thumbnail format for this content list"
      />
      <SelectInput
        source="list_type"
        label="List Type"
        choices={listTypeChoices}
        validate={[required()]}
        helperText="Choose the list display type"
      />
      <NumberInput 
        source="percentage_width" 
        label="Percentage Width"
        validate={[required()]} 
        helperText="Width percentage (0-100)"
        min={0}
        max={100}
      />
      <NumberInput 
        source="percentage_height" 
        label="Percentage Height"
        validate={[required()]} 
        helperText="Height percentage (0-100)"
        min={0}
        max={100}
      />
      <BooleanInput 
        source="latest_first" 
        label="Latest First"
        helperText="Order items by latest first"
      />
      <BooleanInput source="is_active" />
      <NumberInput 
        source="display_order" 
        helperText="Order for display (lower numbers appear first)"
      />
      <SelectInput
        source="media_type"
        label="Media Type (Optional)"
        choices={mediaTypeChoices}
        helperText="Filter by media type"
      />
      <TextInput 
        source="slug" 
        label="Slug (Optional)"
        helperText="SEO-friendly URL slug"
      />
      <ArrayInput source="media_categories_id_list" label="Media Categories (Optional)">
        <SimpleFormIterator>
          <TextInput label="Category ID" />
        </SimpleFormIterator>
      </ArrayInput>
      <ArrayInput source="themes_and_genres_id_list" label="Themes and Genres (Optional)">
        <SimpleFormIterator>
          <TextInput label="Theme/Genre ID" />
        </SimpleFormIterator>
      </ArrayInput>
      <ArrayInput source="content_items" label="Content Items">
        <SimpleFormIterator>
          <TextInput label="Content ID (UUID)" validate={[required()]} />
        </SimpleFormIterator>
      </ArrayInput>
      <ArrayInput source="content_types" label="Content Types">
        <SimpleFormIterator>
          <SelectInput 
            label="Content Type"
            choices={[
              { id: 'program', name: 'Program' },
              { id: 'season', name: 'Season' },
              { id: 'media_description', name: 'Media Description' }
            ]}
            validate={[required()]}
          />
        </SimpleFormIterator>
      </ArrayInput>
    </SimpleForm>
  </Edit>
);

export const ContentListShow = () => (
  <Show actions={<ContentListShowActions />}>
    <SimpleShowLayout>
      <TextField source="id" />
      <TextField source="title" />
      <TextField source="description" />
      <FunctionField 
        label="Thumbnail Format" 
        render={record => getThumbnailFormatDisplayName(record.thumbnail_format)}
      />
      <FunctionField 
        label="List Type" 
        render={record => {
          const type = listTypeChoices.find(choice => choice.id === record.list_type);
          return type ? type.name : record.list_type;
        }}
      />
      <TextField source="percentage_width" label="Percentage Width" />
      <TextField source="percentage_height" label="Percentage Height" />
      <BooleanField source="latest_first" label="Latest First" />
      <BooleanField source="is_active" label="Active" />
      <TextField source="display_order" label="Display Order" />
      <FunctionField 
        label="Media Type" 
        render={record => {
          if (!record.media_type) return 'None';
          const type = mediaTypeChoices.find(choice => choice.id === record.media_type);
          return type ? type.name : record.media_type;
        }}
      />
      <TextField source="slug" label="Slug" />
      <ArrayField source="media_categories_id_list" label="Media Categories">
        <SingleFieldList>
          <ChipField source="." />
        </SingleFieldList>
      </ArrayField>
      <ArrayField source="themes_and_genres_id_list" label="Themes and Genres">
        <SingleFieldList>
          <ChipField source="." />
        </SingleFieldList>
      </ArrayField>
      <ArrayField source="content_items" label="Content Items">
        <SingleFieldList>
          <ChipField source="." />
        </SingleFieldList>
      </ArrayField>
      <FunctionField 
        label="Content Types" 
        render={record => 
          Array.isArray(record.content_types) 
            ? record.content_types.join(', ')
            : 'No types'
        } 
      />
      <DateField source="creation_date_utc" label="Created" />
      <DateField source="last_updated_utc" label="Last Updated" />
      <DateField source="json_last_updated" label="JSON Last Updated" />
    </SimpleShowLayout>
  </Show>
);