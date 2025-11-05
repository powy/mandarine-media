import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSeasonJSON, resolveMediaDescriptionId } from 'share';
import DetailsSection from '../components/DetailsSection';

const SeasonScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Check if ID might be a MediaDescription ID and resolve it
  useEffect(() => {
    const checkAndResolveId = async () => {
      if (!id) return;

      try {
        console.log(
          '🔍 SeasonScreen: Checking if ID is a MediaDescription:',
          id
        );
        const resolution = await resolveMediaDescriptionId(id);

        if (resolution.isMediaDescription) {
          console.log(
            '✅ SeasonScreen: Detected MediaDescription, resolving:',
            resolution
          );

          if (
            resolution.redirectPath &&
            resolution.redirectPath !== `/season/${id}`
          ) {
            console.log(
              '🔄 SeasonScreen: Redirecting to correct path:',
              resolution.redirectPath
            );
            navigate(resolution.redirectPath, { replace: true });
            return;
          }
        }
      } catch (error) {
        console.log(
          '🔍 SeasonScreen: ID resolution failed, continuing with original ID'
        );
      }
    };

    checkAndResolveId();
  }, [id, navigate]);

  const {
    data: seasonData,
    isLoading,
    error,
  } = useSeasonJSON(id);

  useEffect(() => {
    if (error) {
      console.error(
        '🚨 SeasonScreen: Error in useEffect, redirecting to error page:',
        error
      );
      // Redirect to error page for invalid IDs
      navigate('/error', { replace: true });
    }
  }, [error, navigate]);

  // Debug logging for the season ID
  useEffect(() => {
    console.log('🔍 SeasonScreen: Component mounted/updated');
    console.log('🔍 SeasonScreen: Season ID from URL:', id);
    console.log('🔍 SeasonScreen: isLoading:', isLoading);
    console.log('🔍 SeasonScreen: error:', error);
    console.log('🔍 SeasonScreen: seasonData:', seasonData);
  });

  const handleEpisodeClick = (episodeId: string) => {
    navigate(`/video/${episodeId}`);
  };

  const handleProgramClick = (programId: string) => {
    navigate(`/program/${programId}`);
  };

  const handleSeasonNavigation = (seasonId: string) => {
    navigate(`/season/${seasonId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-kyool-blue">Chargement de la saison...</div>
      </div>
    );
  }

  if (error || !seasonData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-red-500 mb-4">Erreur</h1>
          <p className="text-gray-300 mb-2">
            Impossible de charger cette saison.
          </p>
          {id && <p className="text-gray-400 text-sm">ID de saison: {id}</p>}
          {(error as any)?.response?.status === 404 && (
            <p className="text-yellow-400 text-sm mt-2">
              Cette saison n'existe pas ou a été supprimée.
            </p>
          )}
        </div>
      </div>
    );
  }

  const {
    season,
    episodes,
    nextSeason,
    previousSeason,
    seasonImageUrl,
    genres,
    generalDescription
  } = seasonData;

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
        {/* Season Header Section */}
        <div className="mb-8">
          {/* Season Image */}
          {seasonImageUrl && (
            <div className="mb-6">
              <img
                src={seasonImageUrl}
                alt={`Saison ${season.season_number}`}
                className="w-full h-auto object-contain rounded-lg"
              />
            </div>
          )}

          {/* Season Title */}
          <h1 className="text-3xl font-bold text-kyool-blue mb-4">
            {season.season_name || `Saison ${season.season_number}`}
          </h1>

          {/* Program Navigation */}
          {season.program_id && (
            <div className="mb-6 relative">
              <div className="text-center">
                <button
                  onClick={() => handleProgramClick(season.program_id!)}
                  className="text-xl text-gray-300 hover:text-kyool-blue transition-colors cursor-pointer"
                >
                  ← Retour au programme
                </button>
              </div>

              {/* Season Navigation Buttons */}
              <div className="flex justify-between items-center mt-4">
                {previousSeason ? (
                  <button
                    onClick={() => handleSeasonNavigation(previousSeason.id)}
                    className="flex items-center px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-white"
                  >
                    <span className="mr-2">←</span>
                    <div className="text-left">
                      <div className="text-xs text-gray-400">
                        Saison précédente
                      </div>
                      <div className="text-sm">
                        Saison {previousSeason.season_number}
                      </div>
                    </div>
                  </button>
                ) : (
                  <div></div>
                )}

                {nextSeason && (
                  <button
                    onClick={() => handleSeasonNavigation(nextSeason.id)}
                    className="flex items-center px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-white"
                  >
                    <div className="text-right">
                      <div className="text-xs text-gray-400">
                        Saison suivante
                      </div>
                      <div className="text-sm">
                        Saison {nextSeason.season_number}
                      </div>
                    </div>
                    <span className="ml-2">→</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Synopsis Section */}
        {seasonData.synopsis && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-kyool-blue mb-3">
              Synopsis
            </h3>
            <p className="text-gray-300 leading-relaxed">
              {seasonData.synopsis}
            </p>
          </div>
        )}

        {/* Details Section */}
        <DetailsSection
          fields={[
            { label: "Genres", value: genres.join(', ') },
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

        {/* Episodes List Section */}
        {episodes.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-kyool-blue mb-4">
              Liste des épisodes ({seasonData.episodeCount})
            </h3>
            <div className="space-y-2">
              {episodes.map((episode) => (
                <div
                  key={episode.id}
                  onClick={() => handleEpisodeClick(episode.id)}
                  className="flex flex-col sm:flex-row items-start sm:items-center p-4 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors gap-4"
                >
                  {/* Episode Number - hidden on mobile, shown on tablet+ */}
                  <div className="hidden sm:block shrink-0 w-12 text-center">
                    <span className="text-kyool-blue font-bold">
                      {episode.episode_number || '?'}
                    </span>
                  </div>

                  {/* Thumbnail and Mobile Episode Number */}
                  <div className="flex items-start gap-3 sm:gap-0 w-full sm:w-auto">
                    {/* Mobile episode number (left of thumbnail) */}
                    <div className="sm:hidden shrink-0 w-10 pt-1">
                      <span className="text-kyool-blue font-bold text-sm">
                        {episode.episode_number || '?'}
                      </span>
                    </div>

                    {/* Thumbnail */}
                    <div className="flex-shrink-0 w-32 h-20 sm:ml-4 sm:mr-4">
                      {episode.image_1920_1080_url ? (
                        <img
                          src={episode.image_1920_1080_url}
                          alt={episode.episode_title}
                          className="w-full h-full object-cover rounded-sm"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-600 flex items-center justify-center rounded-sm">
                          <span className="text-gray-400 text-xs">
                            Pas d'image
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Text Content - Full width on mobile, flex-1 on larger screens */}
                  <div className="flex-1 w-full sm:w-auto">
                    <h4 className="font-semibold text-white text-sm mb-1">
                      {episode.episode_title}
                    </h4>

                    {/* Summary text - shown on all screen sizes */}
                    {episode.descriptive_summary_text && (
                      <p className="text-gray-300 text-xs mb-2 line-clamp-2 sm:line-clamp-1">
                        {episode.descriptive_summary_text}
                      </p>
                    )}

                    {/* Duration */}
                    {episode.duration_seconds && (
                      <p className="text-gray-400 text-xs">
                        {Math.floor(episode.duration_seconds / 60)} min
                      </p>
                    )}
                  </div>

                  {/* Arrow - right aligned */}
                  <div className="hidden sm:block shrink-0 ml-4">
                    <span className="text-gray-400">→</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SeasonScreen;
