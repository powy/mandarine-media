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
  FunctionField,
  regex,
} from 'react-admin';
import { useNavigate } from 'react-router-dom';

// Define filters for the category list
const categoryListFilters = [
  <SearchInput 
    source="q" 
    placeholder="Search category lists..." 
    alwaysOn 
    key="search"
  />,
];

// Custom toolbar with Save and Cancel buttons
const CategoryListToolbar = () => {
  const navigate = useNavigate();
  
  const handleCancel = () => {
    navigate('/category-lists');
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

const CategoryListListActions = () => (
  <TopToolbar>
    <FilterButton />
    <CreateButton />
    <ExportButton />
  </TopToolbar>
);

const CategoryListShowActions = () => (
  <TopToolbar>
    <ListButton label="Back to Category Lists" />
    <EditButton />
  </TopToolbar>
);

export const CategoryListList = () => (
  <List 
    filters={categoryListFilters}
    actions={<CategoryListListActions />} 
    sort={{ field: 'creation_date_utc', order: 'DESC' }}
    perPage={20}
  >
    <Datagrid>
      <TextField source="id" />
      <TextField source="name" sortable />
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
      <BooleanField source="is_active" label="Active" />
      <TextField source="display_order" label="Order" />
      <FunctionField 
        label="Items Count" 
        render={record => record.items_count || 0} 
      />
      <DateField source="creation_date_utc" label="Created" sortable />
      <EditButton />
      <ShowButton />
      <DeleteButton />
    </Datagrid>
  </List>
);

export const CategoryListCreate = () => (
  <Create redirect="list">
    <SimpleForm toolbar={<CategoryListToolbar />}>
      <TextInput 
        source="name" 
        validate={[required(), regex(/^[a-z_]+$/, 'Must contain only lowercase letters and underscores')]} 
        helperText="Unique identifier (e.g., 'home', 'movies') - lowercase letters and underscores only"
        fullWidth 
      />
      <TextInput 
        source="title" 
        validate={[required()]} 
        helperText="Display title (e.g., 'Welcome Page', 'Films')"
        fullWidth 
      />
      <TextInput 
        source="description" 
        multiline
        fullWidth 
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

export const CategoryListEdit = () => (
  <Edit>
    <SimpleForm toolbar={<CategoryListToolbar />}>
      <TextInput 
        source="name" 
        validate={[required(), regex(/^[a-z_]+$/, 'Must contain only lowercase letters and underscores')]} 
        helperText="Unique identifier (e.g., 'home', 'movies') - lowercase letters and underscores only"
        fullWidth 
      />
      <TextInput 
        source="title" 
        validate={[required()]} 
        helperText="Display title (e.g., 'Welcome Page', 'Films')"
        fullWidth 
      />
      <TextInput 
        source="description" 
        multiline
        fullWidth 
      />
      <BooleanInput source="is_active" />
      <NumberInput 
        source="display_order" 
        helperText="Order for display (lower numbers appear first)"
      />
    </SimpleForm>
  </Edit>
);

export const CategoryListShow = () => (
  <Show actions={<CategoryListShowActions />}>
    <SimpleShowLayout>
      <TextField source="id" />
      <TextField source="name" />
      <TextField source="title" />
      <TextField source="description" />
      <BooleanField source="is_active" label="Active" />
      <TextField source="display_order" label="Display Order" />
      <FunctionField 
        label="Items Count" 
        render={record => record.items_count || 0} 
      />
      <DateField source="creation_date_utc" label="Created" />
      <DateField source="last_updated_utc" label="Last Updated" />
      <DateField source="json_last_updated" label="JSON Last Updated" />
    </SimpleShowLayout>
  </Show>
);