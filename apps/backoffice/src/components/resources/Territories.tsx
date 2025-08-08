import React from 'react';
import {
  List,
  Datagrid,
  TextField,
  DateField,
  Create,
  SimpleForm,
  TextInput,
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

// Define filters for the territory list
// API supports: q (search) and country_id (filter by country)
const territoryFilters = [
  <SearchInput 
    source="q" 
    placeholder="Search territories..." 
    alwaysOn 
    key="search"
  />,
  <ReferenceInput
    source="country_id"
    reference="countries"
    key="country_filter"
  >
    <SelectInput label="Country" />
  </ReferenceInput>,
];

// Custom toolbar with Save and Cancel buttons
const TerritoryToolbar = () => {
  const navigate = useNavigate();
  
  const handleCancel = () => {
    navigate('/territories');
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

const TerritoryListActions = () => (
  <TopToolbar>
    <FilterButton />
    <CreateButton />
    <ExportButton />
  </TopToolbar>
);

const TerritoryShowActions = () => (
  <TopToolbar>
    <ListButton label="Back to Territories" />
    <EditButton />
  </TopToolbar>
);

export const TerritoryList = () => (
  <List 
    filters={territoryFilters}
    actions={<TerritoryListActions />} 
    sort={{ field: 'created_at', order: 'DESC' }}
    perPage={20}
  >
    <Datagrid>
      <TextField source="id" sortable />
      <TextField source="name" sortable />
      <ReferenceField 
        source="country_id" 
        reference="countries" 
        label="Country"
        allowEmpty
      >
        <TextField source="name" />
      </ReferenceField>
      <DateField source="created_at" label="Created" sortable />
      <EditButton />
      <ShowButton />
      <DeleteButton />
    </Datagrid>
  </List>
);

export const TerritoryCreate = () => (
  <Create redirect="list">
    <SimpleForm toolbar={<TerritoryToolbar />}>
      <TextInput 
        source="name" 
        label="Territory Name"
        validate={[required()]} 
        fullWidth 
      />
      <ReferenceInput 
        source="country_id" 
        reference="countries"
      >
        <SelectInput optionText="name" emptyText="No Country" />
      </ReferenceInput>
    </SimpleForm>
  </Create>
);

export const TerritoryEdit = () => (
  <Edit>
    <SimpleForm toolbar={<TerritoryToolbar />}>
      <TextInput 
        source="name" 
        label="Territory Name"
        validate={[required()]} 
        fullWidth 
      />
      <ReferenceInput 
        source="country_id" 
        reference="countries"
      >
        <SelectInput optionText="name" emptyText="No Country" />
      </ReferenceInput>
    </SimpleForm>
  </Edit>
);

export const TerritoryShow = () => (
  <Show actions={<TerritoryShowActions />}>
    <SimpleShowLayout>
      <TextField source="id" />
      <TextField source="name" label="Territory Name" />
      <ReferenceField source="country_id" reference="countries" label="Country" allowEmpty>
        <TextField source="name" />
      </ReferenceField>
      <DateField source="created_at" label="Created" />
    </SimpleShowLayout>
  </Show>
);