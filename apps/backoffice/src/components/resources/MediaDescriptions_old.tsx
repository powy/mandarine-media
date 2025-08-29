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
  DateTimeInput,
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
  ArrayInput,
  SimpleFormIterator,
} from 'react-admin';
import { ProgramInput } from '../inputs/ProgramInput';
import { SeasonInput } from '../inputs/SeasonInput';
import { PublicPersonInput } from '../inputs/PublicPersonInput';
import { PictureInput } from '../inputs/PictureInput';

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
  // If it's already a full datetime, return as-is
  if (value.includes('T')) return value;
  // Convert date-only (YYYY-MM-DD) to datetime with midnight UTC
  return `${value}T00:00:00Z`;
};

// Transform comma-separated text to JSON array
const transformTextToJsonArray = (value: any) => {
  if (!value || typeof value !== 'string') return value;
  // Split by comma, trim whitespace, and filter out empty strings
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
        { id: 'teaser', name: 'Teaser' },
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
      <TextField source="main_video_file_id" label="Video File" />
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
  <Create redirect="list" transform={transformFormData}>
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
          { id: 'season', name: 'Season' },
          { id: 'program', name: 'Program' },
        ]}
        validate={[required()]}
      />
      
      <ProgramInput source="program_id" label="Program" allowDirectUUID={true} />
      
      <SeasonInput source="season_id" label="Season" allowDirectUUID={true} />
      
      <NumberInput source="episode_number" />
      
      {/* Main Video File Section */}
      <TextInput 
        source="main_video_file_id" 
        label="Main Video File ID (UUID)"
        validate={[validateUUID]}
        placeholder="e.g. f1a2b3c4-d5e6-7890-abcd-ef1234567890"
        helperText="Enter the UUID of the main video file"
        fullWidth
      />
      
      <TextInput source="descriptive_summary_text" multiline rows={4} fullWidth />
      <TextInput source="synopsis_text" multiline rows={4} fullWidth />
      
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
      <TextInput source="copyright_owner_id" label="Copyright Owner ID" fullWidth />
      
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
        helperText="Enter hashtags separated by commas (with or without # symbol)"
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
      <TextInput source="external_id" label="External ID" fullWidth />
      <TextInput source="friendly_url" label="Friendly URL" fullWidth />
      <TextInput source="slug" label="Slug" fullWidth />
      
      {/* Related Content Fields with Individual UUID Inputs */}
      <ArrayInput source="trailers_id_list" label="Trailers">
        <SimpleFormIterator inline>
          <TextInput 
            source="" 
            label="Trailer ID (UUID)"
            validate={[validateUUID]}
            placeholder="e.g. f1a2b3c4-d5e6-7890-abcd-ef1234567890"
            helperText="Enter the UUID of a trailer media description"
            fullWidth
          />
        </SimpleFormIterator>
      </ArrayInput>
      
      <ArrayInput source="excerpt_id_list" label="Excerpts">
        <SimpleFormIterator inline>
          <TextInput 
            source="" 
            label="Excerpt ID (UUID)"
            validate={[validateUUID]}
            placeholder="e.g. f1a2b3c4-d5e6-7890-abcd-ef1234567890"
            helperText="Enter the UUID of an excerpt media description"
            fullWidth
          />
        </SimpleFormIterator>
      </ArrayInput>
      
      {/* People Fields with Individual UUID Inputs */}
      <ArrayInput source="actors_id_list" label="Actors">
        <SimpleFormIterator inline>
          <TextInput 
            source="" 
            label="Actor ID (UUID)"
            validate={[validateUUID]}
            placeholder="e.g. f1a2b3c4-d5e6-7890-abcd-ef1234567890"
            helperText="Enter the UUID of a public person who is an actor"
            fullWidth
          />
        </SimpleFormIterator>
      </ArrayInput>
      
      <ArrayInput source="directors_id_list" label="Directors">
        <SimpleFormIterator inline>
          <TextInput 
            source="" 
            label="Director ID (UUID)"
            validate={[validateUUID]}
            placeholder="e.g. f1a2b3c4-d5e6-7890-abcd-ef1234567890"
            helperText="Enter the UUID of a public person who is a director"
            fullWidth
          />
        </SimpleFormIterator>
      </ArrayInput>
      
      <ArrayInput source="productor_id_list" label="Producers">
        <SimpleFormIterator inline>
          <TextInput 
            source="" 
            label="Producer ID (UUID)"
            validate={[validateUUID]}
            placeholder="e.g. f1a2b3c4-d5e6-7890-abcd-ef1234567890"
            helperText="Enter the UUID of a public person who is a producer"
            fullWidth
          />
        </SimpleFormIterator>
      </ArrayInput>
      
      <ArrayInput source="authors_id_list" label="Authors">
        <SimpleFormIterator inline>
          <TextInput 
            source="" 
            label="Author ID (UUID)"
            validate={[validateUUID]}
            placeholder="e.g. f1a2b3c4-d5e6-7890-abcd-ef1234567890"
            helperText="Enter the UUID of a public person who is an author"
            fullWidth
          />
        </SimpleFormIterator>
      </ArrayInput>
      
      {/* Image Fields with Scalable UUID Selectors */}
      <PictureInput source="image_1920_1080_id" label="Image 1920x1080" allowDirectUUID={true} />
      <PictureInput source="image_1920_720_id" label="Image 1920x720" allowDirectUUID={true} />
      <PictureInput source="image_1080_1080_id" label="Image 1080x1080" allowDirectUUID={true} />
      <PictureInput source="image_810_1080_id" label="Image 810x1080" allowDirectUUID={true} />
      <PictureInput source="image_1080_1920_id" label="Image 1080x1920" allowDirectUUID={true} />
      <ArrayInput source="additional_images_id_list" label="Additional Images">
        <SimpleFormIterator inline>
          <TextInput 
            source="" 
            label="Image ID (UUID)"
            validate={[validateUUID]}
            placeholder="e.g. ac172ba3-e510-492b-9e1d-972f644a1cb0"
            helperText="Enter the UUID of an additional picture"
            fullWidth
          />
        </SimpleFormIterator>
      </ArrayInput>
      
      {/* Location and Language Fields */}
      <TextInput source="original_languages_id_list" label="Original Language IDs (JSON array)" multiline rows={2} fullWidth />
      <TextInput source="origin_country_id_list" label="Origin Country IDs (JSON array)" multiline rows={2} fullWidth />
      <TextInput source="available_countries_id_list" label="Available Country IDs (JSON array)" multiline rows={2} fullWidth />
      
      {/* Category and Audience Fields */}
      <TextInput source="media_categories" label="Media Categories (JSON array)" multiline rows={2} fullWidth />
      <TextInput source="themes_and_genres_id_list" label="Themes and Genres IDs (JSON array)" multiline rows={2} fullWidth />
      <TextInput source="eligible_plans_id_list" label="Eligible Plan IDs (JSON array)" multiline rows={2} fullWidth />
      <TextInput source="audience_categories_id_list" label="Audience Category IDs (JSON array)" multiline rows={2} fullWidth />
      
      {/* Financial Fields */}
      <NumberInput source="translation_share" label="Translation Share" />
      <NumberInput source="sacem_share" label="SACEM Share" />
      <NumberInput source="other_share" label="Other Share" />
      <NumberInput source="revenue_share" label="Revenue Share" />
      <NumberInput source="paid_token_cost" label="Paid Token Cost" />
    </SimpleForm>
  </Create>
);

export const MediaDescriptionEdit = () => (
  <Edit transform={transformFormData}>
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
          { id: 'season', name: 'Season' },
          { id: 'program', name: 'Program' },
        ]}
        validate={[required()]}
      />
      
      <ProgramInput source="program_id" label="Program" allowDirectUUID={true} />
      
      <SeasonInput source="season_id" label="Season" allowDirectUUID={true} />
      
      <NumberInput source="episode_number" />
      
      {/* Main Video File Section */}
      <TextInput 
        source="main_video_file_id" 
        label="Main Video File ID (UUID)"
        validate={[validateUUID]}
        placeholder="e.g. f1a2b3c4-d5e6-7890-abcd-ef1234567890"
        helperText="Enter the UUID of the main video file"
        fullWidth
      />
      
      <TextInput source="descriptive_summary_text" multiline rows={4} fullWidth />
      <TextInput source="synopsis_text" multiline rows={4} fullWidth />
      
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
      <TextInput source="copyright_owner_id" label="Copyright Owner ID" fullWidth />
      
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
        helperText="Enter hashtags separated by commas (with or without # symbol)"
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
      <TextInput source="external_id" label="External ID" fullWidth />
      <TextInput source="friendly_url" label="Friendly URL" fullWidth />
      <TextInput source="slug" label="Slug" fullWidth />
      
      {/* Related Content Fields with Individual UUID Inputs */}
      <ArrayInput source="trailers_id_list" label="Trailers">
        <SimpleFormIterator inline>
          <TextInput 
            source="" 
            label="Trailer ID (UUID)"
            validate={[validateUUID]}
            placeholder="e.g. f1a2b3c4-d5e6-7890-abcd-ef1234567890"
            helperText="Enter the UUID of a trailer media description"
            fullWidth
          />
        </SimpleFormIterator>
      </ArrayInput>
      
      <ArrayInput source="excerpt_id_list" label="Excerpts">
        <SimpleFormIterator inline>
          <TextInput 
            source="" 
            label="Excerpt ID (UUID)"
            validate={[validateUUID]}
            placeholder="e.g. f1a2b3c4-d5e6-7890-abcd-ef1234567890"
            helperText="Enter the UUID of an excerpt media description"
            fullWidth
          />
        </SimpleFormIterator>
      </ArrayInput>
      
      {/* People Fields with Individual UUID Inputs */}
      <ArrayInput source="actors_id_list" label="Actors">
        <SimpleFormIterator inline>
          <TextInput 
            source="" 
            label="Actor ID (UUID)"
            validate={[validateUUID]}
            placeholder="e.g. f1a2b3c4-d5e6-7890-abcd-ef1234567890"
            helperText="Enter the UUID of a public person who is an actor"
            fullWidth
          />
        </SimpleFormIterator>
      </ArrayInput>
      
      <ArrayInput source="directors_id_list" label="Directors">
        <SimpleFormIterator inline>
          <TextInput 
            source="" 
            label="Director ID (UUID)"
            validate={[validateUUID]}
            placeholder="e.g. f1a2b3c4-d5e6-7890-abcd-ef1234567890"
            helperText="Enter the UUID of a public person who is a director"
            fullWidth
          />
        </SimpleFormIterator>
      </ArrayInput>
      
      <ArrayInput source="productor_id_list" label="Producers">
        <SimpleFormIterator inline>
          <TextInput 
            source="" 
            label="Producer ID (UUID)"
            validate={[validateUUID]}
            placeholder="e.g. f1a2b3c4-d5e6-7890-abcd-ef1234567890"
            helperText="Enter the UUID of a public person who is a producer"
            fullWidth
          />
        </SimpleFormIterator>
      </ArrayInput>
      
      <ArrayInput source="authors_id_list" label="Authors">
        <SimpleFormIterator inline>
          <TextInput 
            source="" 
            label="Author ID (UUID)"
            validate={[validateUUID]}
            placeholder="e.g. f1a2b3c4-d5e6-7890-abcd-ef1234567890"
            helperText="Enter the UUID of a public person who is an author"
            fullWidth
          />
        </SimpleFormIterator>
      </ArrayInput>
      
      {/* Image Fields with Scalable UUID Selectors */}
      <PictureInput source="image_1920_1080_id" label="Image 1920x1080" allowDirectUUID={true} />
      <PictureInput source="image_1920_720_id" label="Image 1920x720" allowDirectUUID={true} />
      <PictureInput source="image_1080_1080_id" label="Image 1080x1080" allowDirectUUID={true} />
      <PictureInput source="image_810_1080_id" label="Image 810x1080" allowDirectUUID={true} />
      <PictureInput source="image_1080_1920_id" label="Image 1080x1920" allowDirectUUID={true} />
      <ArrayInput source="additional_images_id_list" label="Additional Images">
        <SimpleFormIterator inline>
          <TextInput 
            source="" 
            label="Image ID (UUID)"
            validate={[validateUUID]}
            placeholder="e.g. ac172ba3-e510-492b-9e1d-972f644a1cb0"
            helperText="Enter the UUID of an additional picture"
            fullWidth
          />
        </SimpleFormIterator>
      </ArrayInput>
      
      {/* Location and Language Fields */}
      <TextInput source="original_languages_id_list" label="Original Language IDs (JSON array)" multiline rows={2} fullWidth />
      <TextInput source="origin_country_id_list" label="Origin Country IDs (JSON array)" multiline rows={2} fullWidth />
      <TextInput source="available_countries_id_list" label="Available Country IDs (JSON array)" multiline rows={2} fullWidth />
      
      {/* Category and Audience Fields */}
      <TextInput source="media_categories" label="Media Categories (JSON array)" multiline rows={2} fullWidth />
      <TextInput source="themes_and_genres_id_list" label="Themes and Genres IDs (JSON array)" multiline rows={2} fullWidth />
      <TextInput source="eligible_plans_id_list" label="Eligible Plan IDs (JSON array)" multiline rows={2} fullWidth />
      <TextInput source="audience_categories_id_list" label="Audience Category IDs (JSON array)" multiline rows={2} fullWidth />
      
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
      
      {/* Main Video File */}
      <TextField source="main_video_file_id" label="Main Video File ID" />
      
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
      {/* Main Video File Information */}
      <TextField source="main_video_file_id" label="Main Video File ID" />
      {record.main_video_file_id && (
        <div style={{marginBottom: '16px', padding: '16px', border: '1px solid #ddd', borderRadius: '4px'}}>
          <h4>Main Video File Details</h4>
          <p>File ID: {record.main_video_file_id}</p>
          {/* The actual video file details would need to be fetched separately */}
        </div>
      )}
      
      <DateField source="created_at" />
      <DateField source="last_updated_utc" />
    </SimpleShowLayout>
  </Show>
);