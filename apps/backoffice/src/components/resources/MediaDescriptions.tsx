import React from 'react';
import {
  List,
  Datagrid,
  TextField,
  DateField,
  NumberField,
  BooleanField,
  Create,
  SimpleForm,
  TextInput,
  NumberInput,
  SelectInput,
  BooleanInput,
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
  ReferenceInput,
  AutocompleteInput,
  ReferenceManyField,
  SingleFieldList,
  ChipField,
  FunctionField,
} from 'react-admin';

// Filters for the list view
const MediaDescriptionFilters = (props: any) => (
  <Filter {...props}>
    <TextInput label="Search" source="q" alwaysOn />
    <SelectInput 
      source="media_type" 
      choices={[
        { id: 'video', name: 'Video' },
        { id: 'webtoon', name: 'Webtoon' },
        { id: 'trailer', name: 'Trailer' },
        { id: 'teaser', name: 'Teaser' },
        { id: 'excerpt', name: 'Excerpt' },
      ]} 
    />
    <SelectInput 
      source="content_status" 
      choices={[
        { id: 'draft', name: 'Draft' },
        { id: 'published', name: 'Published' },
        { id: 'archived', name: 'Archived' },
        { id: 'scheduled', name: 'Scheduled' },
      ]} 
    />
    <BooleanInput source="is_featured" />
    <BooleanInput source="is_premium_content" />
  </Filter>
);

const MediaDescriptionListActions = () => (
  <TopToolbar>
    <CreateButton />
  </TopToolbar>
);

export const MediaDescriptionList = () => (
  <List filters={<MediaDescriptionFilters />} actions={<MediaDescriptionListActions />}>
    <Datagrid>
      <TextField source="id" />
      <TextField source="episode_title" label="Title" />
      <TextField source="media_type" label="Type" />
      <NumberField source="file_number" />
      <TextField source="content_status" label="Status" />
      <BooleanField source="is_featured" label="Featured" />
      <BooleanField source="is_premium_content" label="Premium" />
      <DateField source="created_at" />
      <EditButton />
      <ShowButton />
      <DeleteButton />
    </Datagrid>
  </List>
);

export const MediaDescriptionCreate = () => (
  <Create redirect="list">
    <SimpleForm>
      <NumberInput source="file_number" validate={[required()]} />
      <TextInput source="episode_title" label="Title" validate={[required()]} fullWidth />
      <SelectInput 
        source="media_type" 
        choices={[
          { id: 'video', name: 'Video' },
          { id: 'webtoon', name: 'Webtoon' },
          { id: 'trailer', name: 'Trailer' },
          { id: 'teaser', name: 'Teaser' },
          { id: 'excerpt', name: 'Excerpt' },
        ]}
        validate={[required()]}
      />
      
      <ReferenceInput source="program_id" reference="programs">
        <AutocompleteInput optionText="program_name" />
      </ReferenceInput>
      
      <ReferenceInput source="season_id" reference="seasons">
        <AutocompleteInput optionText="season_number" />
      </ReferenceInput>
      
      <NumberInput source="episode_number" />
      
      <TextInput source="descriptive_summary_text" multiline rows={4} fullWidth />
      <TextInput source="synopsis_text" multiline rows={4} fullWidth />
      
      <NumberInput source="duration_seconds" />
      <NumberInput source="production_year" />
      
      <SelectInput 
        source="content_status" 
        choices={[
          { id: 'draft', name: 'Draft' },
          { id: 'published', name: 'Published' },
          { id: 'archived', name: 'Archived' },
          { id: 'scheduled', name: 'Scheduled' },
        ]}
        defaultValue="draft"
      />
      
      <BooleanInput source="is_featured" />
      <BooleanInput source="is_premium_content" />
      
      <TextInput source="main_thumbnail_url" fullWidth />
      <TextInput source="secondary_thumbnail_url" fullWidth />
    </SimpleForm>
  </Create>
);

export const MediaDescriptionEdit = () => (
  <Edit>
    <SimpleForm>
      <NumberInput source="file_number" validate={[required()]} />
      <TextInput source="episode_title" label="Title" validate={[required()]} fullWidth />
      <SelectInput 
        source="media_type" 
        choices={[
          { id: 'video', name: 'Video' },
          { id: 'webtoon', name: 'Webtoon' },
          { id: 'trailer', name: 'Trailer' },
          { id: 'teaser', name: 'Teaser' },
          { id: 'excerpt', name: 'Excerpt' },
        ]}
        validate={[required()]}
      />
      
      <ReferenceInput source="program_id" reference="programs">
        <AutocompleteInput optionText="program_name" />
      </ReferenceInput>
      
      <ReferenceInput source="season_id" reference="seasons">
        <AutocompleteInput optionText="season_number" />
      </ReferenceInput>
      
      <NumberInput source="episode_number" />
      
      <TextInput source="descriptive_summary_text" multiline rows={4} fullWidth />
      <TextInput source="synopsis_text" multiline rows={4} fullWidth />
      
      <NumberInput source="duration_seconds" />
      <NumberInput source="production_year" />
      
      <SelectInput 
        source="content_status" 
        choices={[
          { id: 'draft', name: 'Draft' },
          { id: 'published', name: 'Published' },
          { id: 'archived', name: 'Archived' },
          { id: 'scheduled', name: 'Scheduled' },
        ]}
      />
      
      <BooleanInput source="is_featured" />
      <BooleanInput source="is_premium_content" />
      
      <TextInput source="main_thumbnail_url" fullWidth />
      <TextInput source="secondary_thumbnail_url" fullWidth />
      
      {/* Video Files Section */}
      <ReferenceManyField 
        reference="video-files" 
        target="media_description_id" 
        label="Associated Video Files"
      >
        <SingleFieldList>
          <ChipField source="filename" />
        </SingleFieldList>
      </ReferenceManyField>
      
      {/* Financial fields - only for admin users */}
      <NumberInput source="translation_share" />
      <NumberInput source="sacem_share" />
      <NumberInput source="other_share" />
      <NumberInput source="revenue_share" />
      <NumberInput source="paid_token_cost" />
    </SimpleForm>
  </Edit>
);

export const MediaDescriptionShow = () => (
  <Show>
    <SimpleShowLayout>
      <TextField source="id" />
      <TextField source="episode_title" label="Title" />
      <TextField source="media_type" label="Type" />
      <NumberField source="file_number" />
      <NumberField source="episode_number" />
      <TextField source="descriptive_summary_text" />
      <TextField source="synopsis_text" />
      <NumberField source="duration_seconds" />
      <NumberField source="production_year" />
      <TextField source="content_status" label="Status" />
      <BooleanField source="is_featured" label="Featured" />
      <BooleanField source="is_premium_content" label="Premium" />
      <TextField source="main_thumbnail_url" />
      <TextField source="secondary_thumbnail_url" />
      
      {/* Associated Video Files */}
      <ReferenceManyField 
        reference="video-files" 
        target="media_description_id" 
        label="Associated Video Files"
      >
        <Datagrid>
          <TextField source="filename" />
          <FunctionField
            label="URL/File"
            render={(record: any) => 
              record.external_url ? 
                <a href={record.external_url} target="_blank" rel="noopener noreferrer">External URL</a> : 
                record.file_url || 'N/A'
            }
          />
          <TextField source="upload_status" />
          <BooleanField source="is_processed" />
          <EditButton />
          <ShowButton />
        </Datagrid>
      </ReferenceManyField>
      
      <DateField source="created_at" />
      <DateField source="last_updated_utc" />
    </SimpleShowLayout>
  </Show>
);