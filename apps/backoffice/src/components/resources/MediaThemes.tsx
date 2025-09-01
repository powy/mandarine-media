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
  Filter,
} from 'react-admin';

// Filters for the list view
const MediaThemeFilters = (props: any) => (
  <Filter {...props}>
    <TextInput label="Search" source="q" alwaysOn />
  </Filter>
);

const MediaThemeListActions = () => (
  <TopToolbar>
    <CreateButton />
  </TopToolbar>
);

export const MediaThemeList = () => (
  <List filters={<MediaThemeFilters />} actions={<MediaThemeListActions />}>
    <Datagrid>
      <TextField source="id" />
      <TextField source="name" />
      <DateField source="creation_date_utc" />
      <EditButton />
      <ShowButton />
      <DeleteButton />
    </Datagrid>
  </List>
);

export const MediaThemeCreate = () => (
  <Create redirect="list">
    <SimpleForm>
      <TextInput source="name" validate={[required()]} fullWidth />
    </SimpleForm>
  </Create>
);

export const MediaThemeEdit = () => (
  <Edit>
    <SimpleForm>
      <TextInput source="name" validate={[required()]} fullWidth />
    </SimpleForm>
  </Edit>
);

export const MediaThemeShow = () => (
  <Show>
    <SimpleShowLayout>
      <TextField source="id" />
      <TextField source="name" />
      <DateField source="creation_date_utc" />
    </SimpleShowLayout>
  </Show>
);