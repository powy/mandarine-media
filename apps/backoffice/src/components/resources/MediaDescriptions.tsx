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
  DateInput,
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
  ReferenceManyField,
  SingleFieldList,
  ChipField,
  FunctionField,
  ArrayField,
  ReferenceArrayField,
} from 'react-admin';
import { ProgramInput } from '../inputs/ProgramInput';
import { SeasonInput } from '../inputs/SeasonInput';
import { PictureInput } from '../inputs/PictureInput';
import {
  ThemeInput,
  ActorInput,
  DirectorInput,
  ProducerInput,
  AuthorInput,
  OriginCountryInput,
  AvailableCountryInput,
  OriginalLanguageInput,
  AudienceCategoryInput,
  EligiblePlanInput,
  TrailerInput,
  ExcerptInput,
  MediaCategoriesInput,
} from '../inputs/RelationshipInputs';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// UUID validator
const validateUUID = (value) => {
  if (!value) return undefined; // Optional field
  if (!UUID_REGEX.test(value)) {
    return 'Invalid UUID format';
  }
  return undefined;
};

// Transform date-only input to datetime with UTC timezone for backend
const transformDateToDateTime = (value: any) => {
  if (!value) return value;
  if (value.includes('T')) return value;
  return `${value}T00:00:00Z`;
};

// Transform comma-separated text to JSON array
const transformTextToJsonArray = (value: any) => {
  if (!value || typeof value !== 'string') return value;
  const items = value.split(',').map(item => item.trim()).filter(item => item.length > 0);
  return items.length > 0 ? items : null;
};

// Transform JSON array to comma-separated text for display
const transformJsonArrayToText = (value: any) => {
  if (!value || !Array.isArray(value)) return '';
  return value.join(', ');
};

// Transform form data before sending to backend
const transformFormData = (data: any) => {
  const transformed = { ...data };
  
  // Transform date fields to datetime format
  if (transformed.contract_start_date_utc) {
    transformed.contract_start_date_utc = transformDateToDateTime(transformed.contract_start_date_utc);
  }
  if (transformed.contract_end_date_utc) {
    transformed.contract_end_date_utc = transformDateToDateTime(transformed.contract_end_date_utc);
  }
  if (transformed.original_broadcast_date_utc) {
    transformed.original_broadcast_date_utc = transformDateToDateTime(transformed.original_broadcast_date_utc);
  }
  
  // Transform text fields to JSON arrays
  if (transformed.seo_keywords_text_list) {
    transformed.seo_keywords_text_list = transformTextToJsonArray(transformed.seo_keywords_text_list);
  }
  if (transformed.hashtags_text_list) {
    transformed.hashtags_text_list = transformTextToJsonArray(transformed.hashtags_text_list);
  }
  if (transformed.human_keywords_text_list) {
    transformed.human_keywords_text_list = transformTextToJsonArray(transformed.human_keywords_text_list);
  }
  
  return transformed;
};

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
        { id: 'excerpt', name: 'Excerpt' },
        { id: 'season', name: 'Season' },
        { id: 'program', name: 'Program' },
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
      <DateField source="creation_date_utc" />
      <EditButton />
      <ShowButton />
      <DeleteButton />
    </Datagrid>
  </List>
);

export const MediaDescriptionCreate = () => (
  <Create redirect="list" transform={transformFormData}>
    <SimpleForm>
      {/* Basic Information */}
      <NumberInput source="file_number" validate={[required()]} />
      <TextInput source="episode_title" label="Title" validate={[required()]} fullWidth />
      <SelectInput 
        source="media_type" 
        choices={[
          { id: 'video', name: 'Video' },
          { id: 'webtoon', name: 'Webtoon' },
          { id: 'trailer', name: 'Trailer' },
          { id: 'excerpt', name: 'Excerpt' },
          { id: 'season', name: 'Season' },
          { id: 'program', name: 'Program' },
        ]}
        validate={[required()]}
      />
      
      {/* Program and Season Links */}
      <ProgramInput source="program_id" label="Program" allowDirectUUID={true} />
      <SeasonInput source="season_id" label="Season" allowDirectUUID={true} />
      <NumberInput source="episode_number" />
      
      {/* Main Video File */}
      <TextInput 
        source="main_video_file_id" 
        label="Main Video File ID (UUID)"
        validate={[validateUUID]}
        placeholder="e.g. f1a2b3c4-d5e6-7890-abcd-ef1234567890"
        helperText="Enter the UUID of the main video file"
        fullWidth
      />
      
      {/* Content Description */}
      <TextInput source="descriptive_summary_text" multiline rows={4} fullWidth />
      <TextInput source="synopsis_text" multiline rows={4} fullWidth />
      
      {/* Categories and Themes */}
      <MediaCategoriesInput />
      <ThemeInput source="theme_ids" />
      
      {/* Production Information */}
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
      
      {/* People Relationships */}
      <ActorInput />
      <DirectorInput />
      <ProducerInput />
      <AuthorInput />
      
      {/* Location and Language */}
      <OriginCountryInput />
      <AvailableCountryInput />
      <OriginalLanguageInput />
      
      {/* Business Information */}
      <AudienceCategoryInput />
      <EligiblePlanInput />
      
      {/* Related Videos */}
      <TrailerInput />
      <ExcerptInput />
      
      {/* Contract and Rights Fields */}
      <DateInput 
        source="contract_start_date_utc" 
        label="Contract Start Date"
        helperText="Select the contract start date"
      />
      <DateInput 
        source="contract_end_date_utc" 
        label="Contract End Date"
        helperText="Select the contract end date"
      />
      <DateInput 
        source="original_broadcast_date_utc" 
        label="Original Broadcast Date"
        helperText="Select the original broadcast date"
      />
      <TextInput source="rights_holder" label="Rights Holder" fullWidth />
      <TextInput source="copyright_owner_text" label="Copyright Owner" fullWidth />
      
      {/* SEO Fields */}
      <TextInput source="seo_title" label="SEO Title" fullWidth />
      <TextInput source="seo_description" label="SEO Description" multiline rows={3} fullWidth />
      <TextInput 
        source="seo_keywords_text_list" 
        label="SEO Keywords" 
        multiline rows={2} 
        fullWidth 
        placeholder="keyword1, keyword2, keyword3"
        helperText="Enter keywords separated by commas"
        format={transformJsonArrayToText}
      />
      <TextInput 
        source="hashtags_text_list" 
        label="Hashtags" 
        multiline rows={2} 
        fullWidth 
        placeholder="#hashtag1, #hashtag2, #hashtag3"
        helperText="Enter hashtags separated by commas"
        format={transformJsonArrayToText}
      />
      <TextInput 
        source="human_keywords_text_list" 
        label="Human Keywords" 
        multiline rows={2} 
        fullWidth 
        placeholder="romance, drama, love story"
        helperText="Enter human-friendly keywords separated by commas"
        format={transformJsonArrayToText}
      />
      
      {/* Metadata Fields */}
      <TextInput source="external_identifier_text" label="External Identifier" fullWidth />
      <TextInput source="friendly_url" label="Friendly URL" fullWidth />
      <TextInput source="slug" label="Slug" fullWidth />
      
      {/* Image Fields */}
      <PictureInput source="image_1920_1080_id" label="Image 1920x1080" allowDirectUUID={true} />
      <PictureInput source="image_1920_720_id" label="Image 1920x720" allowDirectUUID={true} />
      <PictureInput source="image_1080_1080_id" label="Image 1080x1080" allowDirectUUID={true} />
      <PictureInput source="image_810_1080_id" label="Image 810x1080" allowDirectUUID={true} />
      <PictureInput source="image_1080_1920_id" label="Image 1080x1920" allowDirectUUID={true} />
    </SimpleForm>
  </Create>
);

export const MediaDescriptionEdit = () => (
  <Edit transform={transformFormData}>
    <SimpleForm>
      {/* Basic Information */}
      <NumberInput source="file_number" validate={[required()]} />
      <TextInput source="episode_title" label="Title" validate={[required()]} fullWidth />
      <SelectInput 
        source="media_type" 
        choices={[
          { id: 'video', name: 'Video' },
          { id: 'webtoon', name: 'Webtoon' },
          { id: 'trailer', name: 'Trailer' },
          { id: 'excerpt', name: 'Excerpt' },
          { id: 'season', name: 'Season' },
          { id: 'program', name: 'Program' },
        ]}
        validate={[required()]}
      />
      
      {/* Program and Season Links */}
      <ProgramInput source="program_id" label="Program" allowDirectUUID={true} />
      <SeasonInput source="season_id" label="Season" allowDirectUUID={true} />
      <NumberInput source="episode_number" />
      
      {/* Main Video File */}
      <TextInput 
        source="main_video_file_id" 
        label="Main Video File ID (UUID)"
        validate={[validateUUID]}
        placeholder="e.g. f1a2b3c4-d5e6-7890-abcd-ef1234567890"
        helperText="Enter the UUID of the main video file"
        fullWidth
      />
      
      {/* Content Description */}
      <TextInput source="descriptive_summary_text" multiline rows={4} fullWidth />
      <TextInput source="synopsis_text" multiline rows={4} fullWidth />
      
      {/* Categories and Themes */}
      <MediaCategoriesInput />
      <ThemeInput source="theme_ids" />
      
      {/* Production Information */}
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
      
      {/* People Relationships */}
      <ActorInput />
      <DirectorInput />
      <ProducerInput />
      <AuthorInput />
      
      {/* Location and Language */}
      <OriginCountryInput />
      <AvailableCountryInput />
      <OriginalLanguageInput />
      
      {/* Business Information */}
      <AudienceCategoryInput />
      <EligiblePlanInput />
      
      {/* Related Videos */}
      <TrailerInput />
      <ExcerptInput />
      
      {/* Contract and Rights Fields */}
      <DateInput 
        source="contract_start_date_utc" 
        label="Contract Start Date"
      />
      <DateInput 
        source="contract_end_date_utc" 
        label="Contract End Date"
      />
      <DateInput 
        source="original_broadcast_date_utc" 
        label="Original Broadcast Date"
      />
      <TextInput source="rights_holder" label="Rights Holder" fullWidth />
      <TextInput source="copyright_owner_text" label="Copyright Owner" fullWidth />
      
      {/* SEO Fields */}
      <TextInput source="seo_title" label="SEO Title" fullWidth />
      <TextInput source="seo_description" label="SEO Description" multiline rows={3} fullWidth />
      <TextInput 
        source="seo_keywords_text_list" 
        label="SEO Keywords" 
        multiline rows={2} 
        fullWidth 
        placeholder="keyword1, keyword2, keyword3"
        helperText="Enter keywords separated by commas"
        format={transformJsonArrayToText}
      />
      <TextInput 
        source="hashtags_text_list" 
        label="Hashtags" 
        multiline rows={2} 
        fullWidth 
        placeholder="#hashtag1, #hashtag2, #hashtag3"
        helperText="Enter hashtags separated by commas"
        format={transformJsonArrayToText}
      />
      <TextInput 
        source="human_keywords_text_list" 
        label="Human Keywords" 
        multiline rows={2} 
        fullWidth 
        placeholder="romance, drama, love story"
        helperText="Enter human-friendly keywords separated by commas"
        format={transformJsonArrayToText}
      />
      
      {/* Metadata Fields */}
      <TextInput source="external_identifier_text" label="External Identifier" fullWidth />
      <TextInput source="friendly_url" label="Friendly URL" fullWidth />
      <TextInput source="slug" label="Slug" fullWidth />
      
      {/* Image Fields */}
      <PictureInput source="image_1920_1080_id" label="Image 1920x1080" allowDirectUUID={true} />
      <PictureInput source="image_1920_720_id" label="Image 1920x720" allowDirectUUID={true} />
      <PictureInput source="image_1080_1080_id" label="Image 1080x1080" allowDirectUUID={true} />
      <PictureInput source="image_810_1080_id" label="Image 810x1080" allowDirectUUID={true} />
      <PictureInput source="image_1080_1920_id" label="Image 1080x1920" allowDirectUUID={true} />
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
      
      {/* Main Video File */}
      <TextField source="main_video_file_id" label="Main Video File ID" />
      
      <TextField source="descriptive_summary_text" />
      <TextField source="synopsis_text" />
      <NumberField source="production_year" />
      <TextField source="content_status" label="Status" />
      <BooleanField source="is_featured" label="Featured" />
      
      {/* Show relationship data */}
      <ArrayField source="actors" label="Actors">
        <SingleFieldList>
          <ChipField source="stage_name_roman" />
        </SingleFieldList>
      </ArrayField>
      
      <ArrayField source="directors" label="Directors">
        <SingleFieldList>
          <ChipField source="stage_name_roman" />
        </SingleFieldList>
      </ArrayField>
      
      <ArrayField source="producers" label="Producers">
        <SingleFieldList>
          <ChipField source="stage_name_roman" />
        </SingleFieldList>
      </ArrayField>
      
      <ArrayField source="authors" label="Authors">
        <SingleFieldList>
          <ChipField source="stage_name_roman" />
        </SingleFieldList>
      </ArrayField>
      
      <ArrayField source="themes" label="Themes">
        <SingleFieldList>
          <ChipField source="name" />
        </SingleFieldList>
      </ArrayField>
      
      <ArrayField source="origin_countries" label="Origin Countries">
        <SingleFieldList>
          <ChipField source="name" />
        </SingleFieldList>
      </ArrayField>
      
      <ArrayField source="available_countries" label="Available Countries">
        <SingleFieldList>
          <ChipField source="name" />
        </SingleFieldList>
      </ArrayField>
      
      <ArrayField source="original_languages" label="Original Languages">
        <SingleFieldList>
          <ChipField source="name" />
        </SingleFieldList>
      </ArrayField>
      
      <ArrayField source="audience_categories" label="Audience Categories">
        <SingleFieldList>
          <ChipField source="name" />
        </SingleFieldList>
      </ArrayField>
      
      <ArrayField source="eligible_plans" label="Eligible Plans">
        <SingleFieldList>
          <ChipField source="name" />
        </SingleFieldList>
      </ArrayField>
      
      <DateField source="creation_date_utc" />
      <DateField source="last_updated_utc" />
    </SimpleShowLayout>
  </Show>
);