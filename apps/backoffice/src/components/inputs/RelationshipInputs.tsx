import React from 'react';
import {
  ReferenceArrayInput,
  AutocompleteArrayInput,
  TextInput,
  SelectArrayInput,
  ArrayInput,
  SimpleFormIterator,
  useGetList,
} from 'react-admin';

// Theme selection component
export const ThemeInput = ({ source, label, ...props }) => (
  <ReferenceArrayInput source={source} reference="themes" label={label} {...props}>
    <AutocompleteArrayInput 
      optionText="name"
      optionValue="id"
      filterToQuery={searchText => ({ name: searchText })}
    />
  </ReferenceArrayInput>
);

// Public Person inputs for different roles
export const ActorInput = ({ source = "actor_ids", label = "Actors", ...props }) => (
  <ReferenceArrayInput source={source} reference="persons" label={label} {...props}>
    <AutocompleteArrayInput 
      optionText="stage_name_roman"
      optionValue="id"
      filterToQuery={searchText => ({ stage_name_roman: searchText })}
    />
  </ReferenceArrayInput>
);

export const DirectorInput = ({ source = "director_ids", label = "Directors", ...props }) => (
  <ReferenceArrayInput source={source} reference="persons" label={label} {...props}>
    <AutocompleteArrayInput 
      optionText="stage_name_roman"
      optionValue="id"
      filterToQuery={searchText => ({ stage_name_roman: searchText })}
    />
  </ReferenceArrayInput>
);

export const ProducerInput = ({ source = "producer_ids", label = "Producers", ...props }) => (
  <ReferenceArrayInput source={source} reference="persons" label={label} {...props}>
    <AutocompleteArrayInput 
      optionText="stage_name_roman"
      optionValue="id"
      filterToQuery={searchText => ({ stage_name_roman: searchText })}
    />
  </ReferenceArrayInput>
);

export const AuthorInput = ({ source = "author_ids", label = "Authors", ...props }) => (
  <ReferenceArrayInput source={source} reference="persons" label={label} {...props}>
    <AutocompleteArrayInput 
      optionText="stage_name_roman"
      optionValue="id"
      filterToQuery={searchText => ({ stage_name_roman: searchText })}
    />
  </ReferenceArrayInput>
);

// Country inputs
export const OriginCountryInput = ({ source = "origin_country_ids", label = "Origin Countries", ...props }) => (
  <ReferenceArrayInput source={source} reference="countries" label={label} {...props}>
    <AutocompleteArrayInput 
      optionText="name"
      optionValue="id"
      filterToQuery={searchText => ({ name: searchText })}
    />
  </ReferenceArrayInput>
);

export const AvailableCountryInput = ({ source = "available_country_ids", label = "Available Countries", ...props }) => (
  <ReferenceArrayInput source={source} reference="countries" label={label} {...props}>
    <AutocompleteArrayInput 
      optionText="name"
      optionValue="id"
      filterToQuery={searchText => ({ name: searchText })}
    />
  </ReferenceArrayInput>
);

// Language input
export const OriginalLanguageInput = ({ source = "original_language_ids", label = "Original Languages", ...props }) => (
  <ReferenceArrayInput source={source} reference="languages" label={label} {...props}>
    <AutocompleteArrayInput 
      optionText="name"
      optionValue="id"
      filterToQuery={searchText => ({ name: searchText })}
    />
  </ReferenceArrayInput>
);

// Audience Category input
export const AudienceCategoryInput = ({ source = "audience_category_ids", label = "Audience Categories", ...props }) => (
  <ReferenceArrayInput source={source} reference="audience-categories" label={label} {...props}>
    <AutocompleteArrayInput 
      optionText="name"
      optionValue="id"
      filterToQuery={searchText => ({ name: searchText })}
    />
  </ReferenceArrayInput>
);

// Subscription Plan input  
export const EligiblePlanInput = ({ source = "eligible_plan_id_list", label = "Eligible Plans", ...props }) => (
  <ReferenceArrayInput source={source} reference="subscription-plans" label={label} {...props}>
    <AutocompleteArrayInput 
      optionText="name"
      optionValue="id"
      filterToQuery={searchText => ({ name: searchText })}
    />
  </ReferenceArrayInput>
);

// Video File inputs for trailers and excerpts
export const TrailerInput = ({ source = "trailer_ids", label = "Trailers", ...props }) => (
  <ReferenceArrayInput source={source} reference="video-files" label={label} {...props}>
    <AutocompleteArrayInput 
      optionText="file_name"
      optionValue="id"
      filterToQuery={searchText => ({ file_name: searchText })}
    />
  </ReferenceArrayInput>
);

export const ExcerptInput = ({ source = "excerpt_ids", label = "Excerpts", ...props }) => (
  <ReferenceArrayInput source={source} reference="video-files" label={label} {...props}>
    <AutocompleteArrayInput 
      optionText="file_name"
      optionValue="id"
      filterToQuery={searchText => ({ file_name: searchText })}
    />
  </ReferenceArrayInput>
);

// Media Categories input (enum-based)
export const MediaCategoriesInput = ({ source = "media_categories", label = "Media Categories", ...props }) => (
  <SelectArrayInput 
    source={source}
    label={label}
    choices={[
      { id: 'movie', name: 'Movie' },
      { id: 'drama', name: 'Drama' },
      { id: 'short_drama', name: 'Short Drama' },
      { id: 'musical', name: 'Musical' },
      { id: 'animation', name: 'Animation' },
      { id: 'documentary', name: 'Documentary' },
      { id: 'tvshow', name: 'TV Show' },
      { id: 'other', name: 'Other' },
    ]}
    {...props}
  />
);