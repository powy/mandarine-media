import React from 'react';
import {
  List,
  Datagrid,
  TextField,
  DateField,
  BooleanField,
  Create,
  SimpleForm,
  TextInput,
  BooleanInput,
  Edit,
  Show,
  SimpleShowLayout,
  required,
  email,
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
  SelectInput,
  FilterButton,
  ExportButton,
} from 'react-admin';
import { useNavigate } from 'react-router-dom';

// Define filters for the user list
// API supports: q (search), is_active (boolean), is_admin (boolean)
const userFilters = [
  <SearchInput 
    source="q" 
    placeholder="Search users..." 
    alwaysOn 
    key="search"
  />,
  <SelectInput
    source="is_active"
    label="Status"
    choices={[
      { id: true, name: 'Active' },
      { id: false, name: 'Inactive' },
    ]}
    emptyText="All Statuses"
    key="is_active"
  />,
  <SelectInput
    source="is_admin"
    label="Role"
    choices={[
      { id: true, name: 'Admin' },
      { id: false, name: 'User' },
    ]}
    emptyText="All Roles"
    key="is_admin"
  />,
];

// Custom toolbar with Save and Cancel buttons
const UserToolbar = () => {
  const navigate = useNavigate();
  
  const handleCancel = () => {
    navigate('/users');
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

const UserListActions = () => (
  <TopToolbar>
    <FilterButton />
    <CreateButton />
    <ExportButton />
  </TopToolbar>
);

const UserShowActions = () => (
  <TopToolbar>
    <ListButton label="Back to Users" />
    <EditButton />
  </TopToolbar>
);

export const UserList = () => (
  <List 
    filters={userFilters}
    actions={<UserListActions />} 
    sort={{ field: 'created_at', order: 'DESC' }}
    perPage={20}
  >
    <Datagrid>
      <TextField source="id" sortable />
      <TextField source="email" sortable />
      <TextField source="full_name" label="Full Name" sortable />
      <BooleanField source="is_active" label="Active" />
      <BooleanField source="is_admin" label="Admin" />
      <DateField source="created_at" label="Created" sortable />
      <EditButton />
      <ShowButton />
      <DeleteButton />
    </Datagrid>
  </List>
);

export const UserCreate = () => (
  <Create redirect="list">
    <SimpleForm toolbar={<UserToolbar />}>
      <TextInput 
        source="email" 
        label="Email"
        validate={[required(), email()]} 
        fullWidth 
      />
      <TextInput 
        source="password" 
        label="Password"
        type="password"
        validate={[required()]} 
        fullWidth 
      />
      <TextInput 
        source="full_name" 
        label="Full Name"
        validate={[required()]} 
        fullWidth 
      />
      <BooleanInput 
        source="is_active" 
        label="Active"
        defaultValue={true}
      />
      <BooleanInput 
        source="is_admin" 
        label="Admin"
        defaultValue={false}
      />
    </SimpleForm>
  </Create>
);

export const UserEdit = () => (
  <Edit>
    <SimpleForm toolbar={<UserToolbar />}>
      <TextInput 
        source="email" 
        label="Email"
        validate={[required(), email()]} 
        fullWidth 
      />
      <TextInput 
        source="full_name" 
        label="Full Name"
        validate={[required()]} 
        fullWidth 
      />
      <BooleanInput 
        source="is_active" 
        label="Active"
      />
      <BooleanInput 
        source="is_admin" 
        label="Admin"
      />
    </SimpleForm>
  </Edit>
);

export const UserShow = () => (
  <Show actions={<UserShowActions />}>
    <SimpleShowLayout>
      <TextField source="id" />
      <TextField source="email" label="Email" />
      <TextField source="full_name" label="Full Name" />
      <BooleanField source="is_active" label="Active" />
      <BooleanField source="is_admin" label="Admin" />
      <DateField source="created_at" label="Created" />
      <DateField source="updated_at" label="Updated" />
    </SimpleShowLayout>
  </Show>
);