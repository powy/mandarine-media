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

// Define filters for the language list
// Note: Backend doesn't support search yet, but keeping filter structure for consistency
const languageFilters = [
  <SearchInput 
    source="q" 
    placeholder="Search languages..." 
    alwaysOn 
    key="search"
  />,
];

// Custom toolbar with Save and Cancel buttons
const LanguageToolbar = () => {
  const navigate = useNavigate();
  
  const handleCancel = () => {
    navigate('/languages');
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

const LanguageListActions = () => (
  <TopToolbar>
    <FilterButton />
    <CreateButton />
    <ExportButton />
  </TopToolbar>
);

const LanguageShowActions = () => (
  <TopToolbar>
    <ListButton label="Back to Languages" />
    <EditButton />
  </TopToolbar>
);

export const LanguageList = () => (
  <List 
    filters={languageFilters}
    actions={<LanguageListActions />} 
    sort={{ field: 'created_at', order: 'DESC' }}
    perPage={20}
  >
    <Datagrid>
      <TextField source="id" sortable />
      <TextField source="name" sortable />
      <TextField source="sigle" label="Code" sortable />
      <DateField source="created_at" sortable />
      <EditButton />
      <ShowButton />
      <DeleteButton />
    </Datagrid>
  </List>
);

export const LanguageCreate = () => (
  <Create redirect="list">
    <SimpleForm toolbar={<LanguageToolbar />}>
      <TextInput source="name" validate={[required()]} fullWidth />
      <TextInput source="sigle" label="Language Code" validate={[required()]} helperText="e.g., EN, FR, KR" />
    </SimpleForm>
  </Create>
);

export const LanguageEdit = () => (
  <Edit>
    <SimpleForm toolbar={<LanguageToolbar />}>
      <TextInput source="name" validate={[required()]} fullWidth />
      <TextInput source="sigle" label="Language Code" validate={[required()]} helperText="e.g., EN, FR, KR" />
    </SimpleForm>
  </Edit>
);

export const LanguageShow = () => (
  <Show actions={<LanguageShowActions />}>
    <SimpleShowLayout>
      <TextField source="id" />
      <TextField source="name" />
      <TextField source="sigle" label="Language Code" />
      <DateField source="created_at" />
    </SimpleShowLayout>
  </Show>
);