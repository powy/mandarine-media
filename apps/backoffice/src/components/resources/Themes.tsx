import React from 'react';
import {
  List,
  Datagrid,
  TextField,
  DateField,
  Create,
  SimpleForm,
  TextInput,
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
  Filter,
  useRecordContext,
} from 'react-admin';

// Filters for the list view
const ThemeFilters = (props: any) => (
  <Filter {...props}>
    <TextInput label="Search" source="q" alwaysOn />
    <SelectInput 
      source="category" 
      choices={[
        { id: 'genre', name: 'Genre' },
        { id: 'theme', name: 'Theme' },
        { id: 'mood', name: 'Mood' },
      ]} 
    />
  </Filter>
);

const ThemeListActions = () => (
  <TopToolbar>
    <CreateButton />
  </TopToolbar>
);

export const ThemeList = () => (
  <List filters={<ThemeFilters />} actions={<ThemeListActions />}>
    <Datagrid>
      <TextField source="id" />
      <TextField source="name" />
      <TextField source="category" />
      <TextField source="description" />
      <DateField source="creation_date_utc" />
      <EditButton />
      <ShowButton />
      <DeleteButton />
    </Datagrid>
  </List>
);

export const ThemeCreate = () => (
  <Create redirect="list">
    <SimpleForm>
      <TextInput source="name" validate={[required()]} fullWidth />
      <SelectInput 
        source="category"
        choices={[
          { id: 'genre', name: 'Genre' },
          { id: 'theme', name: 'Theme' },
          { id: 'mood', name: 'Mood' },
        ]}
      />
      <TextInput source="description" multiline rows={3} fullWidth />
    </SimpleForm>
  </Create>
);

export const ThemeEdit = () => (
  <Edit>
    <SimpleForm>
      <TextInput source="name" validate={[required()]} fullWidth />
      <SelectInput 
        source="category"
        choices={[
          { id: 'genre', name: 'Genre' },
          { id: 'theme', name: 'Theme' },
          { id: 'mood', name: 'Mood' },
        ]}
      />
      <TextInput source="description" multiline rows={3} fullWidth />
    </SimpleForm>
  </Edit>
);

export const ThemeShow = () => (
  <Show>
    <SimpleShowLayout>
      <TextField source="id" />
      <TextField source="name" />
      <TextField source="category" />
      <TextField source="description" />
      <DateField source="creation_date_utc" />
    </SimpleShowLayout>
  </Show>
);