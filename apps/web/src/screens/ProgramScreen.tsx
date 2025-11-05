import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useProgramJSON,
  formatGenresList,
  formatEpisodeCount,
  formatSeasonTitle,
  getSeasonRoute,
  resolveMediaDescriptionId
} from 'share';
import DetailsSection from '../components/DetailsSection';

const ProgramScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Check if ID might be a MediaDescription ID and resolve it
  useEffect(() => {
    const checkAndResolveId = async () => {
      if (!id) return;

      try {
        console.log('🔍 ProgramScreen: Checking if ID is a MediaDescription:', id);
        const resolution = await resolveMediaDescriptionId(id);

        if (resolution.isMediaDescription) {
          console.log('✅ ProgramScreen: Detected MediaDescription, resolving:', resolution);

          if (resolution.redirectPath && resolution.redirectPath !== `/program/${id}`) {
            console.log('🔄 ProgramScreen: Redirecting to correct path:', resolution.redirectPath);
            navigate(resolution.redirectPath, { replace: true });
            return;
          }
        }
      } catch (error) {
        console.log('🔍 ProgramScreen: ID resolution failed, continuing with original ID');
      }
    };

    checkAndResolveId();
  }, [id, navigate]);

  const { data: programData, isLoading, error } = useProgramJSON(id);

  useEffect(() => {
    if (error) {
      console.error('🚨 ProgramScreen: Error in useEffect, redirecting to error page:', error);
      navigate('/error', { replace: true });
    }
  }, [error, navigate]);

  useEffect(() => {
    console.log('🔍 ProgramScreen: Component mounted/updated');
    console.log('🔍 ProgramScreen: Program ID from URL:', id);
    console.log('🔍 ProgramScreen: isLoading:', isLoading);
    console.log('🔍 ProgramScreen: error:', error);
    console.log('🔍 ProgramScreen: programData:', programData);
  });

  const handleSeasonClick = (seasonId: string) => {
    navigate(getSeasonRoute(seasonId));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-kyool-blue">Chargement du programme...</div>
      </div>
    );
  }

  if (error || !programData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-red-500 mb-4">Erreur</h1>
          <p className="text-gray-300 mb-2">Impossible de charger ce programme.</p>
          {id && (
            <p className="text-gray-400 text-sm">
              ID de programme: {id}
            </p>
          )}
          {(error as any)?.response?.status === 404 && (
            <p className="text-yellow-400 text-sm mt-2">
              Ce programme n'existe pas ou un ID de saison a été passé au lieu d'un ID de programme.
            </p>
          )}
        </div>
      </div>
    );
  }

  const {
    program,
    programImageUrl,
    synopsis,
    description,
    genres,
    allSeasons,
    generalDescription
  } = programData;

  // Extract detail fields from generalDescription MediaDescription
  const original_broadcast_date_utc = generalDescription?.original_broadcast_date_utc || null;
  const rights_holder = generalDescription?.rights_holder || null;
  const original_languages = generalDescription?.original_languages || null;
  const origin_countries = generalDescription?.origin_countries || null;
  const human_keywords_text_list = generalDescription?.human_keywords_text_list || null;
  const hashtags_text_list = generalDescription?.hashtags_text_list || null;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-screen-2xl mx-auto px-4 py-8">
        {/* Program Header Section */}
        <div className="mb-8">
          {/* Program Title */}
          <h1 className="text-4xl font-bold text-kyool-blue mb-6">
            {program.program_name}
          </h1>

          {/* Program Image */}
          {programImageUrl && (
            <div className="mb-6">
              <img
                src={programImageUrl}
                alt={program.program_name}
                className="w-full h-auto object-contain rounded-lg"
              />
            </div>
          )}
        </div>

        {/* Synopsis Section */}
        {synopsis && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-kyool-blue mb-4">Synopsis</h3>
            <p className="text-gray-300 leading-relaxed">
              {synopsis}
            </p>
          </div>
        )}

        {/* Details Section */}
        <DetailsSection
          fields={[
            { label: "Genres", value: formatGenresList(genres) },
            {
              label: "Diffusion originale",
              value: original_broadcast_date_utc
                ? new Date(original_broadcast_date_utc).toLocaleDateString('fr-FR')
                : null
            },
            {
              label: "Détenteur des droits",
              value: rights_holder
            },
            {
              label: "Langue originale",
              value: original_languages?.length
                ? original_languages.map(lang => lang.name).join(', ')
                : null
            },
            {
              label: "Pays d'origine",
              value: origin_countries?.length
                ? origin_countries.map(country => country.name).join(', ')
                : null
            },
            {
              label: "Tags",
              value: human_keywords_text_list?.length
                ? human_keywords_text_list.join(', ')
                : null
            },
            {
              label: "Hashtags",
              value: hashtags_text_list?.length
                ? hashtags_text_list.map(tag => `#${tag}`).join(' ')
                : null
            }
          ]}
        />

        {/* Description Section - Temporarily hidden */}
        {false && description && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-kyool-blue mb-4">Description</h3>
            <p className="text-gray-300 leading-relaxed">
              {description}
            </p>
          </div>
        )}

        {/* List of Seasons Section */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-kyool-blue mb-4">
            {allSeasons.length > 0 ? `Liste des saisons (${allSeasons.length})` : 'Saisons'}
          </h3>

          {allSeasons.length > 0 ? (
            <div className="space-y-3">
              {allSeasons.map((season) => (
                <div
                  key={season.id}
                  onClick={() => handleSeasonClick(season.id)}
                  className="flex flex-col sm:flex-row items-start sm:items-center p-4 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors gap-4"
                >
                  {/* Season Number - hidden on mobile, shown on tablet+ */}
                  <div className="hidden sm:block shrink-0 w-16 text-center">
                    <span className="text-kyool-blue font-bold text-lg">
                      {season.season_number}
                    </span>
                  </div>

                  {/* Thumbnail with mobile season number */}
                  <div className="flex items-start gap-3 sm:gap-0 w-full sm:w-auto">
                    {/* Mobile season number */}
                    <div className="sm:hidden shrink-0 w-12 pt-1">
                      <span className="text-kyool-blue font-bold text-base">
                        {season.season_number}
                      </span>
                    </div>

                    {/* Thumbnail */}
                    <div className="shrink-0 w-40 h-24 sm:ml-4 sm:mr-6">
                      {season.thumbnailUrl ? (
                        <img
                          src={season.thumbnailUrl}
                          alt={`Saison ${season.season_number}`}
                          className="w-full h-full object-cover rounded-sm"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-600 flex items-center justify-center rounded-sm">
                          <span className="text-gray-400 text-xs">Pas d'image</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Text Content */}
                  <div className="flex-1 w-full sm:w-auto">
                    <h4 className="font-semibold text-white text-lg mb-1">
                      {formatSeasonTitle(season.season_number)}
                    </h4>

                    {/* Summary text - NEW */}
                    {season.summaryText && (
                      <p className="text-gray-300 text-sm mb-2 line-clamp-3 sm:line-clamp-2">
                        {season.summaryText}
                      </p>
                    )}

                    {/* Episode count */}
                    <p className="text-gray-400 text-sm">
                      {formatEpisodeCount(season.episodeCount)}
                    </p>
                  </div>

                  {/* Arrow */}
                  <div className="hidden sm:block shrink-0 ml-4">
                    <span className="text-gray-400 text-xl">→</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 bg-gray-800 rounded-lg text-center">
              <p className="text-gray-400 text-sm mb-2">
                Aucune saison disponible pour ce programme
              </p>
              <p className="text-gray-500 text-xs">
                Les saisons seront ajoutées prochainement
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProgramScreen;