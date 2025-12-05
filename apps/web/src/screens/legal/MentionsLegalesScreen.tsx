import { FC } from 'react';
import LegalPageTemplate from '../../components/LegalPageTemplate';

const MentionsLegalesScreen: FC = () => {
  return (
    <LegalPageTemplate
      title="Mentions légales"
      lastUpdated="4 décembre 2025"
    >
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-kyool-blue mb-4">1. Éditeur du site</h2>
        <p className="text-gray-300 leading-relaxed">
          <strong>Raison sociale :</strong> [NOM DE LA SOCIÉTÉ] [FORME JURIDIQUE - ex: SAS, SARL]<br />
          <strong>Capital social :</strong> [MONTANT] euros<br />
          <strong>Siège social :</strong> [ADRESSE COMPLÈTE]<br />
          <strong>SIRET :</strong> [NUMÉRO SIRET]<br />
          <strong>RCS :</strong> [VILLE] [NUMÉRO RCS]<br />
          <strong>N° TVA intracommunautaire :</strong> [NUMÉRO DE TVA]<br />
          <strong>Directeur de la publication :</strong> [NOM DU DIRECTEUR]
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-kyool-blue mb-4">2. Hébergeur</h2>
        <p className="text-gray-300 leading-relaxed">
          Ce site est hébergé par :<br />
          <strong>Nom :</strong> [NOM DE L'HÉBERGEUR]<br />
          <strong>Adresse :</strong> [ADRESSE DE L'HÉBERGEUR]<br />
          <strong>Téléphone :</strong> [NUMÉRO DE TÉLÉPHONE]
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-kyool-blue mb-4">3. Contact</h2>
        <p className="text-gray-300 leading-relaxed">
          Pour toute question concernant le site, vous pouvez nous contacter :<br />
          <strong>Email :</strong> contact@kyool.fr (placeholder)<br />
          <strong>Téléphone :</strong> [NUMÉRO DE TÉLÉPHONE] (optionnel)<br />
          <strong>Via le formulaire :</strong>{' '}
          <a href="/contact" className="text-kyool-blue hover:text-white transition-colors">
            Page de contact
          </a>
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-kyool-blue mb-4">4. Propriété intellectuelle</h2>
        <p className="text-gray-300 leading-relaxed">
          L'ensemble des éléments composant le site KYOOL Media (textes, images, vidéos, logos, marques,
          graphismes, icônes, sons, logiciels, etc.) sont la propriété exclusive de [NOM DE LA SOCIÉTÉ]
          ou font l'objet d'une autorisation d'utilisation.
        </p>
        <p className="text-gray-300 leading-relaxed mt-4">
          Toute reproduction, représentation, modification, publication, adaptation de tout ou partie des
          éléments du site, quel que soit le moyen ou le procédé utilisé, est interdite, sauf autorisation
          écrite préalable de [NOM DE LA SOCIÉTÉ]. Toute exploitation non autorisée du site ou de l'un
          quelconque des éléments qu'il contient sera considérée comme constitutive d'une contrefaçon et
          poursuivie conformément aux dispositions des articles L.335-2 et suivants du Code de Propriété
          Intellectuelle.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-kyool-blue mb-4">5. Marques</h2>
        <p className="text-gray-300 leading-relaxed">
          KYOOL et KYOOL Media sont des marques déposées appartenant à [NOM DE LA SOCIÉTÉ].
          Toute reproduction ou utilisation de ces marques sans autorisation expresse est interdite.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-kyool-blue mb-4">6. Responsabilité</h2>
        <p className="text-gray-300 leading-relaxed">
          [NOM DE LA SOCIÉTÉ] met tout en œuvre pour offrir aux utilisateurs des informations et/ou
          des outils disponibles et vérifiés. Toutefois, elle ne saurait être tenue responsable des
          erreurs, d'une absence de disponibilité des informations et/ou de la présence de virus sur
          son site.
        </p>
        <p className="text-gray-300 leading-relaxed mt-4">
          L'utilisateur reconnaît utiliser ces informations sous sa responsabilité exclusive.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-kyool-blue mb-4">7. Liens hypertextes</h2>
        <p className="text-gray-300 leading-relaxed">
          Le site KYOOL Media peut contenir des liens hypertextes vers d'autres sites. [NOM DE LA SOCIÉTÉ]
          ne dispose d'aucun moyen pour contrôler ces sites et décline toute responsabilité quant à leur contenu.
        </p>
        <p className="text-gray-300 leading-relaxed mt-4">
          Tout lien hypertexte pointant vers le site KYOOL Media doit faire l'objet d'une autorisation
          préalable écrite de [NOM DE LA SOCIÉTÉ].
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-kyool-blue mb-4">8. Droit applicable</h2>
        <p className="text-gray-300 leading-relaxed">
          Les présentes mentions légales sont régies par le droit français. En cas de litige et à défaut
          d'accord amiable, le litige sera porté devant les tribunaux français conformément aux règles de
          compétence en vigueur.
        </p>
      </section>
    </LegalPageTemplate>
  );
};

export default MentionsLegalesScreen;
