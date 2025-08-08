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
    sort={{ field: 'created_at', order: 'DESC' }}
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
      <DateField source="created_at" label="Created" sortable />
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
        <SelectInput optionText="program_name" validate={[required()]} />
      </ReferenceInput>
      <NumberInput 
        source="season_number" 
        label="Season Number"
        validate={[required()]} 
        min={1}
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
        <SelectInput optionText="program_name" validate={[required()]} />
      </ReferenceInput>
      <NumberInput 
        source="season_number" 
        label="Season Number"
        validate={[required()]} 
        min={1}
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
      <DateField source="created_at" label="Created" />
    </SimpleShowLayout>
  </Show>
);