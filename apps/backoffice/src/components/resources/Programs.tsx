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
  ReferenceInput,
  AutocompleteInput,
  ReferenceField,
} from 'react-admin';
import { useNavigate } from 'react-router-dom';
import { MediaDescriptionInput } from '../inputs/MediaDescriptionInput';

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

const ProgramListActions = () => (
  <TopToolbar>
    <FilterButton />
    <CreateButton />
    <ExportButton />
  </TopToolbar>
);

const ProgramShowActions = () => (
  <TopToolbar>
    <ListButton label="Back to Programs" />
    <EditButton />
  </TopToolbar>
);

export const ProgramList = () => (
  <List 
    filters={programFilters}
    actions={<ProgramListActions />} 
    sort={{ field: 'created_at', order: 'DESC' }}
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