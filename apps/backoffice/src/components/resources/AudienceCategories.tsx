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
} from 'react-admin';
import { useNavigate } from 'react-router-dom';

// Define filters for the audience category list
// API supports: q (search)
const audienceCategoryFilters = [
  <SearchInput 
    source="q" 
    placeholder="Search audience categories..." 
    alwaysOn 
    key="search"
  />,
];

// Custom toolbar with Save and Cancel buttons
const AudienceCategoryToolbar = () => {
  const navigate = useNavigate();
  
  const handleCancel = () => {
    navigate('/audience-categories');
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

const AudienceCategoryListActions = () => (
  <TopToolbar>
    <FilterButton />
    <CreateButton />
    <ExportButton />
  </TopToolbar>
);

const AudienceCategoryShowActions = () => (
  <TopToolbar>
    <ListButton label="Back to Audience Categories" />
    <EditButton />
  </TopToolbar>
);

export const AudienceCategoryList = () => (
  <List 
    filters={audienceCategoryFilters}
    actions={<AudienceCategoryListActions />} 
    sort={{ field: 'creation_date_utc', order: 'DESC' }}
    perPage={20}
  >
    <Datagrid>
      <TextField source="id" sortable />
      <TextField source="name" label="Category Name" sortable />
      <DateField source="creation_date_utc" label="Created" sortable />
      <EditButton />
      <ShowButton />
      <DeleteButton />
    </Datagrid>
  </List>
);

export const AudienceCategoryCreate = () => (
  <Create redirect="list">
    <SimpleForm toolbar={<AudienceCategoryToolbar />}>
      <TextInput 
        source="name" 
        label="Category Name"
        validate={[required()]} 
        fullWidth 
        helperText="Enter the audience category name (e.g., Kids, Teens, Adults)"
      />
    </SimpleForm>
  </Create>
);

export const AudienceCategoryEdit = () => (
  <Edit>
    <SimpleForm toolbar={<AudienceCategoryToolbar />}>
      <TextInput 
        source="name" 
        label="Category Name"
        validate={[required()]} 
        fullWidth 
        helperText="Enter the audience category name (e.g., Kids, Teens, Adults)"
      />
    </SimpleForm>
  </Edit>
);

export const AudienceCategoryShow = () => (
  <Show actions={<AudienceCategoryShowActions />}>
    <SimpleShowLayout>
      <TextField source="id" />
      <TextField source="name" label="Category Name" />
      <DateField source="creation_date_utc" label="Created" />
    </SimpleShowLayout>
  </Show>
);