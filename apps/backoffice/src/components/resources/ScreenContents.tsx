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
  ArrayInput,
  SimpleFormIterator,
  ReferenceInput,
  AutocompleteInput,
  ReferenceManyField,
  SingleFieldList,
  ChipField,
  ArrayField,
} from 'react-admin';
import { useNavigate } from 'react-router-dom';

// Define screen type choices
const screenTypeChoices = [
  { id: 'homepage', name: 'Homepage' },
  { id: 'category', name: 'Category' },
  { id: 'search', name: 'Search' },
  { id: 'profile', name: 'Profile' },
  { id: 'discover', name: 'Discover' },
];

// Define filters for the screen content list
const screenContentFilters = [
  <SearchInput 
    source="q" 
    placeholder="Search screen contents..." 
    alwaysOn 
    key="search"
  />,
  <SelectInput 
    source="screen_type" 
    label="Screen Type"
    choices={screenTypeChoices}
    key="screen_type"
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

const ScreenContentListActions = () => (
  <TopToolbar>
    <FilterButton />
    <CreateButton />
    <ExportButton />
  </TopToolbar>
);

const ScreenContentShowActions = () => (
  <TopToolbar>
    <ListButton label="Back to Screen Contents" />
    <EditButton />
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
      <FunctionField 
        label="Screen Type" 
        render={record => {
          const type = screenTypeChoices.find(choice => choice.id === record.screen_type);
          return type ? type.name : record.screen_type || 'Not set';
        }}
      />
      <BooleanField source="is_active" label="Active" />
      <TextField source="display_order" label="Order" />
      <FunctionField 
        label="Content Lists" 
        render={record => 
          Array.isArray(record.content_lists) 
            ? record.content_lists.length 
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
      <SelectInput
        source="screen_type"
        choices={screenTypeChoices}
        helperText="Choose the type of screen this content is for"
      />
      <BooleanInput source="is_active" defaultValue={true} />
      <NumberInput 
        source="display_order" 
        defaultValue={0} 
        helperText="Order for display (lower numbers appear first)"
      />
      <ArrayInput source="content_lists" label="Related Content Lists">
        <SimpleFormIterator>
          <ReferenceInput source="content_list_id" reference="content-lists">
            <AutocompleteInput optionText="title" />
          </ReferenceInput>
          <NumberInput source="display_order" label="Order" defaultValue={0} />
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
      <SelectInput
        source="screen_type"
        choices={screenTypeChoices}
        helperText="Choose the type of screen this content is for"
      />
      <BooleanInput source="is_active" />
      <NumberInput 
        source="display_order" 
        helperText="Order for display (lower numbers appear first)"
      />
      <ArrayInput source="content_lists" label="Related Content Lists">
        <SimpleFormIterator>
          <ReferenceInput source="content_list_id" reference="content-lists">
            <AutocompleteInput optionText="title" />
          </ReferenceInput>
          <NumberInput source="display_order" label="Order" defaultValue={0} />
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
      <FunctionField 
        label="Screen Type" 
        render={record => {
          const type = screenTypeChoices.find(choice => choice.id === record.screen_type);
          return type ? type.name : record.screen_type || 'Not set';
        }}
      />
      <BooleanField source="is_active" label="Active" />
      <TextField source="display_order" label="Display Order" />
      <ArrayField source="content_lists" label="Related Content Lists">
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