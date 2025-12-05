import { FC } from 'react';
import LegalPageTemplate from '../../components/LegalPageTemplate';

const CgvScreen: FC = () => {
  return (
    <LegalPageTemplate
      title="Conditions Générales de Vente"
      lastUpdated="2 décembre 2025"
    >
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-kyool-blue mb-4">1. Objet</h2>
        <p className="text-gray-300 leading-relaxed">
          Les présentes Conditions Générales de Vente (CGV) régissent l'utilisation de la plateforme KYOOL Media
          et l'ensemble des services proposés. En utilisant notre plateforme, vous acceptez sans réserve les
          présentes conditions.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-kyool-blue mb-4">2. Acceptation des conditions</h2>
        <p className="text-gray-300 leading-relaxed">
          L'accès et l'utilisation de la plateforme KYOOL Media impliquent l'acceptation pleine et entière
          des présentes CGV. L'utilisateur reconnaît avoir pris connaissance de ces conditions et les accepter
          lors de sa première connexion.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-kyool-blue mb-4">3. Services proposés</h2>
        <p className="text-gray-300 leading-relaxed">
          KYOOL Media propose un service de streaming vidéo donnant accès à un catalogue de contenus audiovisuels
          incluant films, séries, dramas et autres programmes. Le catalogue est susceptible d'évoluer et peut varier
          selon les régions géographiques.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-kyool-blue mb-4">4. Prix et paiement</h2>
        <p className="text-gray-300 leading-relaxed">
          Les prix des abonnements sont indiqués en euros TTC et sont susceptibles de modification. Tout changement
          de tarif sera communiqué à l'utilisateur au moins 30 jours avant son application. Les paiements s'effectuent
          par les moyens de paiement proposés sur la plateforme.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-kyool-blue mb-4">5. Droit de rétractation</h2>
        <p className="text-gray-300 leading-relaxed">
          Conformément à la législation française, vous disposez d'un délai de 14 jours pour exercer votre droit
          de rétractation à compter de la souscription de votre abonnement, sauf si vous avez commencé à utiliser
          le service avec votre accord exprès.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-kyool-blue mb-4">6. Propriété intellectuelle</h2>
        <p className="text-gray-300 leading-relaxed">
          L'ensemble des contenus présents sur la plateforme KYOOL Media (vidéos, images, textes, logos) sont
          protégés par les droits de propriété intellectuelle. Toute reproduction, représentation, ou exploitation
          non autorisée est strictement interdite et constitue une contrefaçon.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-kyool-blue mb-4">7. Responsabilité</h2>
        <p className="text-gray-300 leading-relaxed">
          KYOOL Media met tout en œuvre pour assurer la disponibilité et la qualité de ses services. Toutefois,
          nous ne saurions être tenus responsables des interruptions de service, notamment en cas de maintenance,
          de problèmes techniques ou de force majeure.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-kyool-blue mb-4">8. Droit applicable et juridiction</h2>
        <p className="text-gray-300 leading-relaxed">
          Les présentes CGV sont soumises au droit français. En cas de litige, et à défaut d'accord amiable,
          les tribunaux français seront seuls compétents.
        </p>
      </section>
    </LegalPageTemplate>
  );
};

export default CgvScreen;
