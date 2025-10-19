import React from 'react';
import { useLocation } from 'react-router-dom';
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
  AvailableSubtitleLanguageInput,
  AvailableAudioLanguageInput,
  AudienceCategoryInput,
  EligiblePlanInput,
  TrailerInput,
  ExcerptInput,
  MediaCategoriesInput,
  MediaThemeInput,
  AdditionalImageInput,
} from '../inputs/RelationshipInputs';
import { CopyMediaDescriptionButton } from './CopyMediaDescriptionButton';

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
  if (transformed.tags) {
    transformed.tags = transformTextToJsonArray(transformed.tags);
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
      <NumberField source="paid_token_cost" label="Token Cost" />
      <DateField source="creation_date_utc" />
      <EditButton />
      <ShowButton />
      <DeleteButton />
    </Datagrid>
  </List>
);

export const MediaDescriptionCreate = () => {
  const location = useLocation();
  const defaultValues = (location.state as any)?.record || {};

  return (
    <Create redirect="list" transform={transformFormData}>
      <SimpleForm defaultValues={defaultValues}>
      {/* Basic Information */}
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
      <MediaThemeInput />
      
      {/* v1.9 Fields */}
      <TextInput
        source="tags"
        label="Tags"
        multiline
        rows={2}
        fullWidth
        placeholder="drama, romance, comedy"
        helperText="Enter tags separated by commas (replaces human keywords)"
        format={transformJsonArrayToText}
      />
      <TextInput 
        source="slug" 
        label="Slug (Optional)" 
        fullWidth
        helperText="SEO-friendly URL slug (auto-generated if not provided)"
      />
      
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
      <AvailableSubtitleLanguageInput />
      <AvailableAudioLanguageInput />
      
      {/* Business Information */}
      <AudienceCategoryInput />
      <EligiblePlanInput />
      
      {/* Related Videos */}
      <TrailerInput />
      <ExcerptInput />
      
      {/* Additional Images */}
      <AdditionalImageInput />
      
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
        label="Human Keywords (Deprecated)" 
        multiline rows={2} 
        fullWidth 
        placeholder="romance, drama, love story"
        helperText="DEPRECATED: Use Tags field instead. Enter human-friendly keywords separated by commas"
        format={transformJsonArrayToText}
      />
      
      {/* Metadata Fields */}
      <TextInput source="external_identifier_text" label="External Identifier" fullWidth />
      <TextInput source="friendly_url" label="Friendly URL (Deprecated)" fullWidth helperText="DEPRECATED: Use slug field instead" />
      
      {/* Image Fields */}
      <PictureInput source="image_1920_1080_id" label="Image 1920x1080" allowDirectUUID={true} />
      <PictureInput source="image_1920_720_id" label="Image 1920x720" allowDirectUUID={true} />
      <PictureInput source="image_1080_1080_id" label="Image 1080x1080" allowDirectUUID={true} />
      <PictureInput source="image_810_1080_id" label="Image 810x1080" allowDirectUUID={true} />
      <PictureInput source="image_1080_1920_id" label="Image 1080x1920" allowDirectUUID={true} />
      
      {/* New v1.6 Image Fields */}
      <PictureInput source="image_mobile_home" label="Mobile Home Image" allowDirectUUID={true} helperText="Optimized image for mobile home screen" />
      <PictureInput source="image_desktop_home" label="Desktop Home Image" allowDirectUUID={true} helperText="Optimized image for desktop home screen" />

      {/* Revenue Fields */}
      <NumberInput source="translation_share" label="Translation Share" />
      <NumberInput source="sacem_share" label="SACEM Share" />
      <NumberInput source="other_share" label="Other Share" />
      <NumberInput source="revenue_share" label="Revenue Share" />
      <NumberInput source="paid_token_cost" label="Paid Token Cost" />
    </SimpleForm>
  </Create>
  );
};

const MediaDescriptionEditActions = () => (
  <TopToolbar>
    <ShowButton />
    <CopyMediaDescriptionButton />
  </TopToolbar>
);

export const MediaDescriptionEdit = () => (
  <Edit transform={transformFormData} actions={<MediaDescriptionEditActions />}>
    <SimpleForm>
      {/* Basic Information */}
      <NumberInput source="file_number" disabled helperText="Auto-generated, cannot be modified" />
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
      <MediaThemeInput />
      
      {/* v1.9 Fields */}
      <TextInput
        source="tags"
        label="Tags"
        multiline
        rows={2}
        fullWidth
        placeholder="drama, romance, comedy"
        helperText="Enter tags separated by commas (replaces human keywords)"
        format={transformJsonArrayToText}
      />
      <TextInput 
        source="slug" 
        label="Slug (Optional)" 
        fullWidth
        helperText="SEO-friendly URL slug (auto-generated if not provided)"
      />
      
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
      <AvailableSubtitleLanguageInput />
      <AvailableAudioLanguageInput />
      
      {/* Business Information */}
      <AudienceCategoryInput />
      <EligiblePlanInput />
      
      {/* Related Videos */}
      <TrailerInput />
      <ExcerptInput />
      
      {/* Additional Images */}
      <AdditionalImageInput />
      
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
        label="Human Keywords (Deprecated)" 
        multiline rows={2} 
        fullWidth 
        placeholder="romance, drama, love story"
        helperText="DEPRECATED: Use Tags field instead. Enter human-friendly keywords separated by commas"
        format={transformJsonArrayToText}
      />
      
      {/* Metadata Fields */}
      <TextInput source="external_identifier_text" label="External Identifier" fullWidth />
      <TextInput source="friendly_url" label="Friendly URL (Deprecated)" fullWidth helperText="DEPRECATED: Use slug field instead" />
      
      {/* Image Fields */}
      <PictureInput source="image_1920_1080_id" label="Image 1920x1080" allowDirectUUID={true} />
      <PictureInput source="image_1920_720_id" label="Image 1920x720" allowDirectUUID={true} />
      <PictureInput source="image_1080_1080_id" label="Image 1080x1080" allowDirectUUID={true} />
      <PictureInput source="image_810_1080_id" label="Image 810x1080" allowDirectUUID={true} />
      <PictureInput source="image_1080_1920_id" label="Image 1080x1920" allowDirectUUID={true} />
      
      {/* New v1.6 Image Fields */}
      <PictureInput source="image_mobile_home" label="Mobile Home Image" allowDirectUUID={true} helperText="Optimized image for mobile home screen" />
      <PictureInput source="image_desktop_home" label="Desktop Home Image" allowDirectUUID={true} helperText="Optimized image for desktop home screen" />

      {/* Revenue Fields */}
      <NumberInput source="translation_share" label="Translation Share" />
      <NumberInput source="sacem_share" label="SACEM Share" />
      <NumberInput source="other_share" label="Other Share" />
      <NumberInput source="revenue_share" label="Revenue Share" />
      <NumberInput source="paid_token_cost" label="Paid Token Cost" />
    </SimpleForm>
  </Edit>
);

const MediaDescriptionShowActions = () => (
  <TopToolbar>
    <EditButton />
    <CopyMediaDescriptionButton />
  </TopToolbar>
);

export const MediaDescriptionShow = () => (
  <Show actions={<MediaDescriptionShowActions />}>
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
      
      <ArrayField source="media_themes" label="Media Themes">
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

      <ArrayField source="available_subtitle_languages" label="Available Subtitle Languages">
        <SingleFieldList>
          <ChipField source="name" />
        </SingleFieldList>
      </ArrayField>

      <ArrayField source="available_audio_languages" label="Available Audio Languages">
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

      {/* Tags field */}
      <FunctionField label="Tags" render={(record: any) => {
        if (!record.tags || !Array.isArray(record.tags) || record.tags.length === 0) {
          return <span style={{ color: '#999' }}>No tags</span>;
        }
        return (
          <div>
            {record.tags.map((tag: string, index: number) => (
              <span
                key={index}
                style={{
                  display: 'inline-block',
                  background: '#f0f0f0',
                  padding: '4px 8px',
                  margin: '2px',
                  borderRadius: '4px',
                  fontSize: '0.875rem'
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        );
      }} />

      {/* Human Keywords (for comparison/debugging) */}
      <FunctionField label="Human Keywords" render={(record: any) => {
        if (!record.human_keywords_text_list || !Array.isArray(record.human_keywords_text_list) || record.human_keywords_text_list.length === 0) {
          return <span style={{ color: '#999' }}>No human keywords</span>;
        }
        return (
          <div>
            {record.human_keywords_text_list.map((keyword: string, index: number) => (
              <span
                key={index}
                style={{
                  display: 'inline-block',
                  background: '#e8f4fd',
                  padding: '4px 8px',
                  margin: '2px',
                  borderRadius: '4px',
                  fontSize: '0.875rem'
                }}
              >
                {keyword}
              </span>
            ))}
          </div>
        );
      }} />

      <DateField source="creation_date_utc" />
      <DateField source="last_updated_utc" />

      {/* Revenue Fields */}
      <NumberField source="translation_share" label="Translation Share" />
      <NumberField source="sacem_share" label="SACEM Share" />
      <NumberField source="other_share" label="Other Share" />
      <NumberField source="revenue_share" label="Revenue Share" />
      <NumberField source="paid_token_cost" label="Paid Token Cost" />
    </SimpleShowLayout>
  </Show>
);