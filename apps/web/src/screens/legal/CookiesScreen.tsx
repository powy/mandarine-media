import { FC } from 'react';
import LegalPageTemplate from '../../components/LegalPageTemplate';

const CookiesScreen: FC = () => {
  return (
    <LegalPageTemplate
      title="Politique des cookies"
      lastUpdated="2 décembre 2025"
    >
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-kyool-blue mb-4">Qu'est-ce qu'un cookie ?</h2>
        <p className="text-gray-300 leading-relaxed">
          Un cookie est un petit fichier texte déposé sur votre terminal (ordinateur, tablette, smartphone)
          lors de la visite d'un site internet. Il permet de collecter des informations relatives à votre
          navigation et de vous proposer des services adaptés.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-kyool-blue mb-4">1. Types de cookies utilisés</h2>

        <div className="mb-6">
          <h3 className="text-xl font-semibold text-white mb-3">Cookies essentiels</h3>
          <p className="text-gray-300 leading-relaxed">
            Ces cookies sont indispensables au fonctionnement de la plateforme. Ils vous permettent d'utiliser
            les fonctionnalités principales comme la connexion à votre compte, la navigation sécurisée et
            l'accès aux contenus.
          </p>
          <p className="text-gray-400 text-sm mt-2">
            Durée de conservation : Session ou 30 jours maximum
          </p>
        </div>

        <div className="mb-6">
          <h3 className="text-xl font-semibold text-white mb-3">Cookies de performance</h3>
          <p className="text-gray-300 leading-relaxed">
            Ces cookies nous permettent d'analyser l'utilisation de la plateforme et d'améliorer nos services.
            Ils collectent des informations anonymes sur les pages visitées, le temps passé et les éventuelles
            erreurs rencontrées.
          </p>
          <p className="text-gray-400 text-sm mt-2">
            Durée de conservation : 13 mois maximum
          </p>
        </div>

        <div className="mb-6">
          <h3 className="text-xl font-semibold text-white mb-3">Cookies fonctionnels</h3>
          <p className="text-gray-300 leading-relaxed">
            Ces cookies permettent de mémoriser vos préférences (langue, qualité vidéo, sous-titres) pour
            améliorer votre expérience utilisateur lors de vos prochaines visites.
          </p>
          <p className="text-gray-400 text-sm mt-2">
            Durée de conservation : 12 mois maximum
          </p>
        </div>

        <div className="mb-6">
          <h3 className="text-xl font-semibold text-white mb-3">Cookies publicitaires</h3>
          <p className="text-gray-300 leading-relaxed">
            Actuellement, KYOOL Media n'utilise pas de cookies publicitaires. Cette politique pourrait évoluer,
            auquel cas vous seriez informé et votre consentement serait requis.
          </p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-kyool-blue mb-4">2. Gestion des cookies</h2>
        <p className="text-gray-300 leading-relaxed mb-4">
          Vous pouvez à tout moment gérer vos préférences en matière de cookies. Le refus des cookies
          non essentiels n'empêche pas l'utilisation de la plateforme, mais certaines fonctionnalités
          peuvent être limitées.
        </p>
        <p className="text-gray-300 leading-relaxed">
          Pour modifier vos préférences, vous pouvez utiliser les paramètres de votre navigateur ou nous
          contacter à : <a href="mailto:thierry@kftv.fr" className="text-kyool-blue hover:text-white">thierry@kftv.fr</a>
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-kyool-blue mb-4">3. Désactivation des cookies</h2>
        <p className="text-gray-300 leading-relaxed mb-4">
          Vous pouvez désactiver les cookies via les paramètres de votre navigateur :
        </p>
        <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
          <li>
            <strong>Chrome :</strong> Paramètres &gt; Confidentialité et sécurité &gt; Cookies et autres données de sites
          </li>
          <li>
            <strong>Firefox :</strong> Options &gt; Vie privée et sécurité &gt; Cookies et données de sites
          </li>
          <li>
            <strong>Safari :</strong> Préférences &gt; Confidentialité &gt; Cookies et données de sites web
          </li>
          <li>
            <strong>Edge :</strong> Paramètres &gt; Confidentialité, recherche et services &gt; Cookies et autorisations de site
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-kyool-blue mb-4">4. Cookies tiers</h2>
        <p className="text-gray-300 leading-relaxed">
          Certains cookies peuvent être déposés par des services tiers (hébergement vidéo, analyse d'audience).
          Ces services sont soumis à leurs propres politiques de confidentialité. Nous veillons à ne travailler
          qu'avec des partenaires respectant le RGPD.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-kyool-blue mb-4">5. Contact</h2>
        <p className="text-gray-300 leading-relaxed">
          Pour toute question concernant notre utilisation des cookies, vous pouvez nous contacter à :{' '}
          <a href="mailto:thierry@kftv.fr" className="text-kyool-blue hover:text-white">thierry@kftv.fr</a>
        </p>
      </section>
    </LegalPageTemplate>
  );
};

export default CookiesScreen;
