import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useProgramScreen,
  formatPersonsList,
  formatLanguagesList,
  formatCountriesList,
  formatGenresList,
  formatEpisodeCount,
  formatSeasonTitle,
  formatCrewRole,
  getSeasonRoute,
  resolveMediaDescriptionId
} from 'share';

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

  const { data: programData, isLoading, error } = useProgramScreen(id);

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
    audioLanguages,
    subtitleLanguages,
    releaseDate,
    originCountries,
    actors, 
    directors, 
    producers,
    allSeasons
  } = programData;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
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
                className="w-full h-64 md:h-96 object-cover rounded-lg"
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
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-kyool-blue mb-4">Détails</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {genres.length > 0 && (
              <div>
                <span className="text-gray-400">Genres: </span>
                <span className="text-white">
                  {formatGenresList(genres)}
                </span>
              </div>
            )}
            {audioLanguages.length > 0 && (
              <div>
                <span className="text-gray-400">Langues audio: </span>
                <span className="text-white">
                  {formatLanguagesList(audioLanguages)}
                </span>
              </div>
            )}
            {subtitleLanguages.length > 0 && (
              <div>
                <span className="text-gray-400">Sous-titres: </span>
                <span className="text-white">
                  {formatLanguagesList(subtitleLanguages)}
                </span>
              </div>
            )}
            {releaseDate && (
              <div>
                <span className="text-gray-400">Année de sortie: </span>
                <span className="text-white">{releaseDate}</span>
              </div>
            )}
            {originCountries.length > 0 && (
              <div>
                <span className="text-gray-400">Pays d'origine: </span>
                <span className="text-white">
                  {formatCountriesList(originCountries)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Crew Section */}
        {(actors.length > 0 || directors.length > 0 || producers.length > 0) && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-kyool-blue mb-4">Distribution et équipe</h3>
            <div className="text-gray-300 leading-relaxed">
              {producers.length > 0 && (
                <div className="mb-2">
                  <span className="text-gray-400">{formatCrewRole('producer', producers.length)}: </span>
                  <span className="text-white">
                    {formatPersonsList(producers)}
                  </span>
                </div>
              )}
              {directors.length > 0 && (
                <div className="mb-2">
                  <span className="text-gray-400">{formatCrewRole('director', directors.length)}: </span>
                  <span className="text-white">
                    {formatPersonsList(directors)}
                  </span>
                </div>
              )}
              {actors.length > 0 && (
                <div>
                  <span className="text-gray-400">avec </span>
                  <span className="text-white">
                    {formatPersonsList(actors)}
                  </span>
                  <span className="text-gray-400"> ({formatCrewRole('actor', actors.length)})</span>
                </div>
              )}
            </div>
          </div>
        )}

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
                  className="flex items-center p-4 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors"
                >
                  {/* Season Number */}
                  <div className="shrink-0 w-16 text-center">
                    <span className="text-kyool-blue font-bold text-lg">
                      {season.season_number}
                    </span>
                  </div>

                  {/* Season Thumbnail */}
                  <div className="shrink-0 w-40 h-24 ml-4 mr-6">
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

                  {/* Season Title and Info */}
                  <div className="flex-1">
                    <h4 className="font-semibold text-white text-lg mb-1">
                      {formatSeasonTitle(season.season_number)}
                    </h4>
                    <p className="text-gray-400 text-sm">
                      {formatEpisodeCount(season.episodeCount)}
                    </p>
                  </div>

                  {/* Arrow indicator */}
                  <div className="shrink-0 ml-4">
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