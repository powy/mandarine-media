import React from 'react';
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
} from 'react-admin';
import { useNavigate } from 'react-router-dom';

// Define thumbnail format choices
const thumbnailFormatChoices = [
  { id: 'small_square', name: 'Small Square (1080x1080)' },
  { id: 'medium_portrait', name: 'Medium Portrait (810x1080)' },
  { id: 'large_landscape', name: 'Large Landscape (1920x1080)' },
  { id: 'vertical_mobile', name: 'Vertical Mobile (1080x1920)' },
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

const ContentListShowActions = () => (
  <TopToolbar>
    <ListButton label="Back to Content Lists" />
    <EditButton />
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
        render={record => {
          const format = thumbnailFormatChoices.find(choice => choice.id === record.thumbnail_format);
          return format ? format.name : record.thumbnail_format;
        }}
      />
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
      <BooleanInput source="is_active" defaultValue={true} />
      <NumberInput 
        source="display_order" 
        defaultValue={0} 
        helperText="Order for display (lower numbers appear first)"
      />
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
      <BooleanInput source="is_active" />
      <NumberInput 
        source="display_order" 
        helperText="Order for display (lower numbers appear first)"
      />
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
        render={record => {
          const format = thumbnailFormatChoices.find(choice => choice.id === record.thumbnail_format);
          return format ? format.name : record.thumbnail_format;
        }}
      />
      <BooleanField source="is_active" label="Active" />
      <TextField source="display_order" label="Display Order" />
      <FunctionField 
        label="Content Items" 
        render={record => 
          Array.isArray(record.content_items) 
            ? `${record.content_items.length} items`
            : 'No items'
        } 
      />
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