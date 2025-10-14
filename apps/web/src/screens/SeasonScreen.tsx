import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getSeasonScreenData, resolveMediaDescriptionId } from 'share';
import type {
  MediaDescription,
  Season,
  Program,
  PublicPerson,
  Language,
  Country,
} from 'share';

interface SeasonScreenData {
  season: Season;
  program: Program | null;
  episodes: MediaDescription[];
  nextSeason: Season | null;
  previousSeason: Season | null;
  seasonImageUrl: string | null;
  actors: PublicPerson[];
  directors: PublicPerson[];
  producers: PublicPerson[];
  audioLanguages: Language[];
  subtitleLanguages: Language[];
  originCountries: Country[];
}

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
  } = useQuery<SeasonScreenData>({
    queryKey: ['season-screen', id],
    queryFn: async () => {
      if (!id) throw new Error('Season ID is required');
      console.log('🔍 SeasonScreen: Fetching data for season ID:', id);
      console.log('🔍 SeasonScreen: API call starting...');
      try {
        const result = await getSeasonScreenData(id);
        console.log('✅ SeasonScreen: API call successful:', result);
        return result;
      } catch (error) {
        console.error('❌ SeasonScreen: API call failed:', error);
        console.error('❌ SeasonScreen: Error details:', {
          seasonId: id,
          message: (error as any)?.message,
          response: (error as any)?.response,
          status: (error as any)?.response?.status,
          data: (error as any)?.response?.data,
          possibleCause:
            (error as any)?.response?.status === 404
              ? 'Season not found - verify the season ID exists in the database or check if a MediaDescription ID was passed'
              : 'Unknown API error',
        });
        throw error;
      }
    },
    enabled: !!id,
  });

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
    program,
    episodes,
    nextSeason,
    previousSeason,
    seasonImageUrl,
    actors,
    directors,
    producers,
    originCountries,
  } = seasonData;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Season Header Section */}
        <div className="mb-8">
          {/* Season Image */}
          {seasonImageUrl && (
            <div className="mb-6">
              <img
                src={seasonImageUrl}
                alt={`Saison ${season.season_number}`}
                className="w-full h-64 md:h-80 object-cover rounded-lg"
              />
            </div>
          )}

          {/* Season Title */}
          <h1 className="text-3xl font-bold text-kyool-blue mb-4">
            Saison {season.season_number}
          </h1>

          {/* Program Navigation */}
          {program && (
            <div className="mb-6 relative">
              <div className="text-center">
                <button
                  onClick={() => handleProgramClick(program.id)}
                  className="text-xl text-gray-300 hover:text-kyool-blue transition-colors cursor-pointer"
                >
                  {program.program_name}
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
        {episodes.length > 0 && episodes[0].synopsis_text && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-kyool-blue mb-3">
              Synopsis
            </h3>
            <p className="text-gray-300 leading-relaxed">
              {episodes[0].synopsis_text}
            </p>
          </div>
        )}

        {/* Details Section */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-kyool-blue mb-3">
            Détails
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {episodes.length > 0 &&
              episodes[0].media_themes_id_list?.length && (
                <div>
                  <span className="text-gray-400">Genres: </span>
                  <span className="text-white">
                    {episodes[0].media_themes_id_list.join(', ')}
                  </span>
                </div>
              )}
            {episodes.length > 0 && episodes[0].production_year && (
              <div>
                <span className="text-gray-400">Année: </span>
                <span className="text-white">
                  {episodes[0].production_year}
                </span>
              </div>
            )}
            {originCountries.length > 0 && (
              <div>
                <span className="text-gray-400">Pays d'origine: </span>
                <span className="text-white">
                  {originCountries.map((country) => country.name).join(', ')}
                </span>
              </div>
            )}
            <div>
              <span className="text-gray-400">Nombre d'épisodes: </span>
              <span className="text-white">{episodes.length}</span>
            </div>
          </div>
        </div>

        {/* Cast and Crew Section */}
        {(actors.length > 0 ||
          directors.length > 0 ||
          producers.length > 0) && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-kyool-blue mb-3">
              Distribution et équipe
            </h3>
            <div className="text-gray-300 leading-relaxed">
              {producers.length > 0 && (
                <div className="mb-2">
                  <span className="text-gray-400">
                    Producteur{producers.length > 1 ? 's' : ''}:{' '}
                  </span>
                  <span className="text-white">
                    {producers
                      .map(
                        (p) =>
                          p.stage_name_roman ||
                          `${p.first_name_roman || ''} ${p.last_name_roman || ''}`
                      )
                      .join(', ')}
                  </span>
                </div>
              )}
              {directors.length > 0 && (
                <div className="mb-2">
                  <span className="text-gray-400">
                    Réalisateur{directors.length > 1 ? 's' : ''}:{' '}
                  </span>
                  <span className="text-white">
                    {directors
                      .map(
                        (d) =>
                          d.stage_name_roman ||
                          `${d.first_name_roman || ''} ${d.last_name_roman || ''}`
                      )
                      .join(', ')}
                  </span>
                </div>
              )}
              {actors.length > 0 && (
                <div>
                  <span className="text-gray-400">avec </span>
                  <span className="text-white">
                    {actors
                      .map(
                        (a) =>
                          a.stage_name_roman ||
                          `${a.first_name_roman || ''} ${a.last_name_roman || ''}`
                      )
                      .join(', ')}
                  </span>
                  <span className="text-gray-400">
                    {' '}
                    (acteur{actors.length > 1 ? 's' : ''})
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Description Section */}
        {episodes.length > 0 && episodes[0].descriptive_summary_text && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-kyool-blue mb-3">
              Description
            </h3>
            <p className="text-gray-300 leading-relaxed">
              {episodes[0].descriptive_summary_text}
            </p>
          </div>
        )}

        {/* Episodes List Section */}
        {episodes.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-kyool-blue mb-4">
              Liste des épisodes ({episodes.length})
            </h3>
            <div className="space-y-2">
              {episodes.map((episode) => (
                <div
                  key={episode.id}
                  onClick={() => handleEpisodeClick(episode.id)}
                  className="flex items-center p-4 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors"
                >
                  {/* Episode Number */}
                  <div className="shrink-0 w-12 text-center">
                    <span className="text-kyool-blue font-bold">
                      {episode.episode_number || '?'}
                    </span>
                  </div>

                  {/* Episode Thumbnail */}
                  <div className="flex-shrink-0 w-32 h-20 ml-4 mr-4">
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

                  {/* Episode Title and Info */}
                  <div className="flex-1">
                    <h4 className="font-semibold text-white text-sm mb-1">
                      {episode.episode_title}
                    </h4>
                    {episode.duration_seconds && (
                      <p className="text-gray-400 text-xs">
                        {Math.floor(episode.duration_seconds / 60)} min
                      </p>
                    )}
                  </div>

                  {/* Arrow indicator */}
                  <div className="shrink-0 ml-4">
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
