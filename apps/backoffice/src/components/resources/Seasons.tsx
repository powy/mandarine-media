import React from 'react';
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
} from 'react-admin';
import { useNavigate } from 'react-router-dom';
import { MediaDescriptionInput } from '../inputs/MediaDescriptionInput';

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

const SeasonListActions = () => (
  <TopToolbar>
    <FilterButton />
    <CreateButton />
    <ExportButton />
  </TopToolbar>
);

const SeasonShowActions = () => (
  <TopToolbar>
    <ListButton label="Back to Seasons" />
    <EditButton />
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