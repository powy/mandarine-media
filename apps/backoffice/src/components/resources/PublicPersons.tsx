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
  SelectInput,
  FilterButton,
  ExportButton,
  ArrayField,
  ChipField,
  SingleFieldList,
  FunctionField,
  ReferenceField,
} from 'react-admin';
import { useNavigate } from 'react-router-dom';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// UUID validator for face_image_id
const validateUUID = (value) => {
  if (!value) return undefined; // Optional field
  if (!UUID_REGEX.test(value)) {
    return 'Invalid UUID format. Example: f1a2b3c4-d5e6-7890-abcd-ef1234567890';
  }
  return undefined;
};

// Define filters for the public persons list
// API supports: q (search) and profession (filter by profession)
// profession_list is a JSON array of strings (not enum values)
const publicPersonFilters = [
  <SearchInput 
    source="q" 
    placeholder="Search persons..." 
    alwaysOn 
    key="search"
  />,
  <TextInput
    source="profession"
    label="Profession"
    helperText="Enter profession (e.g., actor, director, singer)"
    key="profession"
  />,
];

// Custom toolbar with Save and Cancel buttons
const PublicPersonToolbar = () => {
  const navigate = useNavigate();
  
  const handleCancel = () => {
    navigate('/public-persons');
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

const PublicPersonListActions = () => (
  <TopToolbar>
    <FilterButton />
    <CreateButton />
    <ExportButton />
  </TopToolbar>
);

const PublicPersonShowActions = () => (
  <TopToolbar>
    <ListButton label="Back to Public Persons" />
    <EditButton />
  </TopToolbar>
);

export const PublicPersonList = () => (
  <List 
    filters={publicPersonFilters}
    actions={<PublicPersonListActions />} 
    sort={{ field: 'creation_date_utc', order: 'DESC' }}
    perPage={20}
  >
    <Datagrid>
      <TextField source="id" sortable />
      <TextField source="stage_name_roman" label="Stage Name (Roman)" sortable />
      <TextField source="stage_name_hangul" label="Stage Name (Korean)" />
      <TextField source="first_name_roman" label="First Name (Roman)" />
      <TextField source="last_name_roman" label="Last Name (Roman)" />
      <FunctionField 
        label="Professions" 
        render={record => 
          record.profession_list_array && record.profession_list_array.length > 0
            ? record.profession_list_array.join(', ')
            : 'No professions'
        } 
      />
      <ReferenceField 
        source="face_image_id" 
        reference="pictures"
        label="Face Image"
        link={false}
      >
        <TextField source="file_name" />
      </ReferenceField>
      <DateField source="creation_date_utc" label="Created" sortable />
      <EditButton />
      <ShowButton />
      <DeleteButton />
    </Datagrid>
  </List>
);

export const PublicPersonCreate = () => (
  <Create redirect="list">
    <SimpleForm toolbar={<PublicPersonToolbar />}>
      <TextInput 
        source="stage_name_roman" 
        label="Stage Name (Roman)" 
        validate={[required()]} 
        fullWidth 
      />
      <TextInput 
        source="stage_name_hangul" 
        label="Stage Name (Korean)" 
        fullWidth 
      />
      <TextInput 
        source="first_name_roman" 
        label="First Name (Roman)" 
        fullWidth 
      />
      <TextInput 
        source="last_name_roman" 
        label="Last Name (Roman)" 
        fullWidth 
      />
      <TextInput 
        source="first_name_hangul" 
        label="First Name (Korean)" 
        fullWidth 
      />
      <TextInput 
        source="last_name_hangul" 
        label="Last Name (Korean)" 
        fullWidth 
      />
      <TextInput
        source="profession_list"
        label="Professions"
        helperText="Enter professions separated by commas (e.g., actor, singer, host)"
        fullWidth
        multiline
      />
      <TextInput 
        source="face_image_id" 
        label="Face Image ID"
        helperText="Enter the UUID of the picture for this person's face"
        validate={[validateUUID]}
        placeholder="e.g. ac172ba3-e510-492b-9e1d-972f644a1cb0"
        fullWidth
      />
    </SimpleForm>
  </Create>
);

export const PublicPersonEdit = () => (
  <Edit>
    <SimpleForm toolbar={<PublicPersonToolbar />}>
      <TextInput 
        source="stage_name_roman" 
        label="Stage Name (Roman)" 
        validate={[required()]} 
        fullWidth 
      />
      <TextInput 
        source="stage_name_hangul" 
        label="Stage Name (Korean)" 
        fullWidth 
      />
      <TextInput 
        source="first_name_roman" 
        label="First Name (Roman)" 
        fullWidth 
      />
      <TextInput 
        source="last_name_roman" 
        label="Last Name (Roman)" 
        fullWidth 
      />
      <TextInput 
        source="first_name_hangul" 
        label="First Name (Korean)" 
        fullWidth 
      />
      <TextInput 
        source="last_name_hangul" 
        label="Last Name (Korean)" 
        fullWidth 
      />
      <TextInput
        source="profession_list"
        label="Professions"
        helperText="Enter professions separated by commas (e.g., actor, singer, host)"
        fullWidth
        multiline
      />
      <TextInput 
        source="face_image_id" 
        label="Face Image ID"
        helperText="Enter the UUID of the picture for this person's face"
        validate={[validateUUID]}
        placeholder="e.g. ac172ba3-e510-492b-9e1d-972f644a1cb0"
        fullWidth
      />
    </SimpleForm>
  </Edit>
);

export const PublicPersonShow = () => (
  <Show actions={<PublicPersonShowActions />}>
    <SimpleShowLayout>
      <TextField source="id" />
      <TextField source="stage_name_roman" label="Stage Name (Roman)" />
      <TextField source="stage_name_hangul" label="Stage Name (Korean)" />
      <TextField source="first_name_roman" label="First Name (Roman)" />
      <TextField source="last_name_roman" label="Last Name (Roman)" />
      <TextField source="first_name_hangul" label="First Name (Korean)" />
      <TextField source="last_name_hangul" label="Last Name (Korean)" />
      <FunctionField 
        label="Professions" 
        render={record => 
          record.profession_list_array && record.profession_list_array.length > 0
            ? record.profession_list_array.join(', ')
            : 'No professions'
        } 
      />
      <ReferenceField 
        source="face_image_id" 
        reference="pictures"
        label="Face Image"
        link="show"
      >
        <TextField source="file_name" />
      </ReferenceField>
      <DateField source="creation_date_utc" label="Created" />
    </SimpleShowLayout>
  </Show>
);