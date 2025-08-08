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
  DateInput,
  BooleanInput,
  FilterButton,
  FilterForm,
  ExportButton,
} from 'react-admin';
import { useNavigate } from 'react-router-dom';

// Define filters for the country list
// Note: Backend only supports 'q' parameter for search
const countryFilters = [
  <SearchInput 
    source="q" 
    placeholder="Search countries..." 
    alwaysOn 
    key="search"
  />,
];

// Custom toolbar with Save and Cancel buttons
const CountryToolbar = () => {
  const navigate = useNavigate();
  
  const handleCancel = () => {
    navigate('/countries');
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

const CountryListActions = () => (
  <TopToolbar>
    <FilterButton />
    <CreateButton />
    <ExportButton />
  </TopToolbar>
);

const CountryShowActions = () => (
  <TopToolbar>
    <ListButton label="Back to Countries" />
    <EditButton />
  </TopToolbar>
);

export const CountryList = () => (
  <List 
    filters={countryFilters}
    actions={<CountryListActions />} 
    sort={{ field: 'created_at', order: 'DESC' }}
    perPage={20}
  >
    <Datagrid>
      <TextField source="id" sortable />
      <TextField source="name" sortable />
      <DateField source="created_at" sortable />
      <EditButton />
      <ShowButton />
      <DeleteButton />
    </Datagrid>
  </List>
);

export const CountryCreate = () => (
  <Create redirect="list">
    <SimpleForm toolbar={<CountryToolbar />}>
      <TextInput source="name" validate={[required()]} fullWidth />
    </SimpleForm>
  </Create>
);

export const CountryEdit = () => (
  <Edit>
    <SimpleForm toolbar={<CountryToolbar />}>
      <TextInput source="name" validate={[required()]} fullWidth />
    </SimpleForm>
  </Edit>
);

export const CountryShow = () => (
  <Show actions={<CountryShowActions />}>
    <SimpleShowLayout>
      <TextField source="id" />
      <TextField source="name" />
      <DateField source="created_at" />
    </SimpleShowLayout>
  </Show>
);