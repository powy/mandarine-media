import { FC } from 'react';
import LegalPageTemplate from '../../components/LegalPageTemplate';

const PrivacyScreen: FC = () => {
  return (
    <LegalPageTemplate
      title="Politique de confidentialité"
      lastUpdated="2 décembre 2025"
    >
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-kyool-blue mb-4">1. Responsable du traitement</h2>
        <p className="text-gray-300 leading-relaxed mb-2">
          KYOOL Media est responsable du traitement de vos données personnelles.
        </p>
        <p className="text-gray-300 leading-relaxed">
          Contact : <a href="mailto:thierry@kftv.fr" className="text-kyool-blue hover:text-white">thierry@kftv.fr</a>
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-kyool-blue mb-4">2. Données collectées</h2>
        <p className="text-gray-300 leading-relaxed mb-4">
          Nous collectons les données suivantes :
        </p>
        <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
          <li>Données d'identification : nom, prénom, adresse email</li>
          <li>Données de connexion : adresse IP, logs de connexion</li>
          <li>Données de navigation : pages consultées, contenus visionnés</li>
          <li>Données de paiement : informations bancaires (via prestataire sécurisé)</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-kyool-blue mb-4">3. Finalités du traitement</h2>
        <p className="text-gray-300 leading-relaxed mb-4">
          Vos données sont traitées pour les finalités suivantes :
        </p>
        <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
          <li>Gestion de votre compte et de votre abonnement</li>
          <li>Fourniture des services de streaming</li>
          <li>Amélioration de nos services et personnalisation du contenu</li>
          <li>Communication marketing (avec votre consentement)</li>
          <li>Respect de nos obligations légales</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-kyool-blue mb-4">4. Base légale</h2>
        <p className="text-gray-300 leading-relaxed">
          Le traitement de vos données repose sur les bases légales suivantes : l'exécution du contrat
          d'abonnement, le respect d'obligations légales, votre consentement pour les traitements optionnels,
          et notre intérêt légitime pour l'amélioration de nos services.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-kyool-blue mb-4">5. Durée de conservation</h2>
        <p className="text-gray-300 leading-relaxed">
          Vos données sont conservées pendant la durée de votre abonnement et jusqu'à 3 ans après la fin
          de celui-ci pour les besoins de gestion et de preuve. Les données de facturation sont conservées
          conformément aux obligations légales (10 ans).
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-kyool-blue mb-4">6. Vos droits</h2>
        <p className="text-gray-300 leading-relaxed mb-4">
          Conformément au RGPD, vous disposez des droits suivants :
        </p>
        <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
          <li>Droit d'accès à vos données personnelles</li>
          <li>Droit de rectification de vos données</li>
          <li>Droit à l'effacement de vos données</li>
          <li>Droit d'opposition au traitement</li>
          <li>Droit à la limitation du traitement</li>
          <li>Droit à la portabilité de vos données</li>
          <li>Droit de retirer votre consentement à tout moment</li>
        </ul>
        <p className="text-gray-300 leading-relaxed mt-4">
          Pour exercer ces droits, contactez-nous à : <a href="mailto:thierry@kftv.fr" className="text-kyool-blue hover:text-white">thierry@kftv.fr</a>
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-kyool-blue mb-4">7. Cookies et traceurs</h2>
        <p className="text-gray-300 leading-relaxed">
          Notre site utilise des cookies pour améliorer votre expérience utilisateur et analyser l'utilisation
          de nos services. Pour plus d'informations, consultez notre{' '}
          <a href="/legal/cookies" className="text-kyool-blue hover:text-white underline">
            politique des cookies
          </a>.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-kyool-blue mb-4">8. Sécurité</h2>
        <p className="text-gray-300 leading-relaxed">
          Nous mettons en œuvre toutes les mesures techniques et organisationnelles appropriées pour protéger
          vos données personnelles contre l'accès non autorisé, la perte, la destruction ou la divulgation.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-kyool-blue mb-4">9. Transferts de données</h2>
        <p className="text-gray-300 leading-relaxed">
          Vos données peuvent être transférées hors de l'Union Européenne uniquement vers des pays offrant
          un niveau de protection adéquat ou dans le cadre de garanties appropriées (clauses contractuelles types).
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-kyool-blue mb-4">10. Réclamation</h2>
        <p className="text-gray-300 leading-relaxed">
          Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une réclamation auprès
          de la CNIL (Commission Nationale de l'Informatique et des Libertés) à l'adresse :{' '}
          <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-kyool-blue hover:text-white underline">
            www.cnil.fr
          </a>
        </p>
      </section>
    </LegalPageTemplate>
  );
};

export default PrivacyScreen;
