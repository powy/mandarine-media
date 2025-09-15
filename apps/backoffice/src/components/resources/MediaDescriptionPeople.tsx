import React, { useState } from 'react';
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
  SelectInput,
  FunctionField,
  ReferenceInput,
  AutocompleteInput,
  ReferenceField,
  Filter,
  BooleanField,
  useRecordContext,
  useNotify,
  useRefresh,
} from 'react-admin';
import { useNavigate } from 'react-router-dom';
import { Alert } from '@mui/material';

// Define person role choices based on backend PersonRoleEnum
const personRoleChoices = [
  { id: 'actor', name: 'Actor' },
  { id: 'director', name: 'Director' },
  { id: 'producer', name: 'Producer' },
  { id: 'author', name: 'Author' },
  { id: 'screenwriter', name: 'Screenwriter' },
  { id: 'cinematographer', name: 'Cinematographer' },
  { id: 'editor', name: 'Editor' },
  { id: 'composer', name: 'Composer' },
  { id: 'cast', name: 'Cast' },
  { id: 'crew', name: 'Crew' },
];

// Define filters for the media description people list
const mediaDescriptionPeopleFilters = [
  <SearchInput
    source="q"
    placeholder="Search by person or media..."
    alwaysOn
    key="search"
  />,
  <SelectInput
    source="role"
    label="Role"
    choices={personRoleChoices}
    key="role"
  />,
  <ReferenceInput
    source="media_description_id"
    reference="media-descriptions"
    label="Media Description"
    key="media_description"
  >
    <AutocompleteInput
      optionText="episode_title"
      filterToQuery={searchText => ({ episode_title: searchText })}
    />
  </ReferenceInput>,
];

// Custom toolbar with Save and Cancel buttons
const MediaDescriptionPeopleToolbar = () => {
  const navigate = useNavigate();

  const handleCancel = () => {
    navigate('/media-description-people');
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

const MediaDescriptionPeopleListActions = () => (
  <TopToolbar>
    <FilterButton />
    <CreateButton />
    <ExportButton />
  </TopToolbar>
);

const MediaDescriptionPeopleShowActions = () => (
  <TopToolbar>
    <ListButton label="Back to People Assignments" />
    <EditButton />
  </TopToolbar>
);

// Note: This component represents the many-to-many relationship between MediaDescription and PublicPerson
// Each record represents one person assigned to one media description with a specific role

export const MediaDescriptionPeopleList = () => (
  <>
    <Alert severity="info" sx={{ mb: 2 }}>
      <strong>Media Description People Management:</strong> This interface manages the assignment of people
      (actors, directors, producers, etc.) to media descriptions with specific roles and character details.
      Advanced bulk operations and drag-and-drop reordering will be added in future updates.
    </Alert>

    <List
      filters={mediaDescriptionPeopleFilters}
      actions={<MediaDescriptionPeopleListActions />}
      sort={{ field: 'media_description_id', order: 'ASC' }}
      perPage={25}
    >
      <Datagrid>
        <ReferenceField
          source="media_description_id"
          reference="media-descriptions"
          label="Media"
          link="show"
        >
          <TextField source="episode_title" />
        </ReferenceField>

        <ReferenceField
          source="public_person_id"
          reference="public-persons"
          label="Person"
          link="show"
        >
          <TextField source="stage_name_roman" />
        </ReferenceField>

        <FunctionField
          label="Role"
          render={record => {
            const role = personRoleChoices.find(choice => choice.id === record.role);
            return role ? role.name : record.role;
          }}
        />

        <TextField source="position" label="Position" />
        <TextField source="character_name" label="Character" />
        <TextField source="role_details" label="Role Details" />

        <EditButton />
        <ShowButton />
        <DeleteButton />
      </Datagrid>
    </List>
  </>
);

export const MediaDescriptionPeopleCreate = () => (
  <>
    <Alert severity="warning" sx={{ mb: 2 }}>
      <strong>Note:</strong> This creates a direct assignment. For bulk operations or advanced role management,
      consider using the Media Descriptions interface where you can manage multiple people at once.
    </Alert>

    <Create redirect="list">
      <SimpleForm toolbar={<MediaDescriptionPeopleToolbar />}>
        <ReferenceInput
          source="media_description_id"
          reference="media-descriptions"
          label="Media Description"
          validate={[required()]}
        >
          <AutocompleteInput
            optionText="episode_title"
            filterToQuery={searchText => ({ episode_title: searchText })}
          />
        </ReferenceInput>

        <ReferenceInput
          source="public_person_id"
          reference="public-persons"
          label="Person"
          validate={[required()]}
        >
          <AutocompleteInput
            optionText="stage_name_roman"
            filterToQuery={searchText => ({ stage_name_roman: searchText })}
          />
        </ReferenceInput>

        <SelectInput
          source="role"
          label="Role"
          choices={personRoleChoices}
          validate={[required()]}
          helperText="The person's role in this media production"
        />

        <NumberInput
          source="position"
          label="Position in Role"
          helperText="Position within this role (1 = first position, 2 = second, etc.)"
          min={1}
          defaultValue={1}
        />

        <TextInput
          source="character_name"
          label="Character Name (Optional)"
          helperText="Name of the character played (mainly for actors)"
          fullWidth
        />

        <TextInput
          source="role_details"
          label="Role Details (Optional)"
          helperText="Additional details about this role"
          multiline
          fullWidth
        />
      </SimpleForm>
    </Create>
  </>
);

export const MediaDescriptionPeopleEdit = () => (
  <Edit>
    <SimpleForm toolbar={<MediaDescriptionPeopleToolbar />}>
      <ReferenceInput
        source="media_description_id"
        reference="media-descriptions"
        label="Media Description"
        validate={[required()]}
        disabled // Cannot change the media description once created
      >
        <AutocompleteInput
          optionText="episode_title"
          filterToQuery={searchText => ({ episode_title: searchText })}
        />
      </ReferenceInput>

      <ReferenceInput
        source="public_person_id"
        reference="public-persons"
        label="Person"
        validate={[required()]}
        disabled // Cannot change the person once created
      >
        <AutocompleteInput
          optionText="stage_name_roman"
          filterToQuery={searchText => ({ stage_name_roman: searchText })}
        />
      </ReferenceInput>

      <SelectInput
        source="role"
        label="Role"
        choices={personRoleChoices}
        validate={[required()]}
        disabled // Cannot change the role once created (would need to delete and recreate)
        helperText="Role cannot be changed once created. Delete and recreate to change role."
      />

      <NumberInput
        source="position"
        label="Position in Role"
        helperText="Position within this role (1 = first position, 2 = second, etc.)"
        min={1}
        validate={[required()]}
      />

      <TextInput
        source="character_name"
        label="Character Name (Optional)"
        helperText="Name of the character played (mainly for actors)"
        fullWidth
      />

      <TextInput
        source="role_details"
        label="Role Details (Optional)"
        helperText="Additional details about this role"
        multiline
        fullWidth
      />
    </SimpleForm>
  </Edit>
);

export const MediaDescriptionPeopleShow = () => (
  <Show actions={<MediaDescriptionPeopleShowActions />}>
    <SimpleShowLayout>
      <TextField source="id" label="Assignment ID" />

      <ReferenceField
        source="media_description_id"
        reference="media-descriptions"
        label="Media Description"
        link="show"
      >
        <TextField source="episode_title" />
      </ReferenceField>

      <ReferenceField
        source="public_person_id"
        reference="public-persons"
        label="Person"
        link="show"
      >
        <TextField source="stage_name_roman" />
      </ReferenceField>

      <FunctionField
        label="Role"
        render={record => {
          const role = personRoleChoices.find(choice => choice.id === record.role);
          return role ? role.name : record.role;
        }}
      />

      <TextField source="position" label="Position in Role" />
      <TextField source="character_name" label="Character Name" />
      <TextField source="role_details" label="Role Details" />

      {/* Additional context */}
      <Alert severity="info" sx={{ mt: 2 }}>
        <strong>Advanced Management:</strong> For bulk role management, reordering within roles,
        or replacing all people in a role, use the specialized endpoints available in the Media Descriptions interface.
      </Alert>
    </SimpleShowLayout>
  </Show>
);