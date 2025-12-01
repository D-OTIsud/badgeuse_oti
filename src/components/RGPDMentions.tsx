import React from 'react';
import manuelUtilisateur from '../assets/Manuel Utilisateur Badgeuse OTI.pdf?url';
import ficheSalaries from '../assets/Fiche_salariés_RGPD_Badgeuse_OTISUD  (1).pdf?url';
import reglementRGPD from '../assets/Reglement_RGPD_Badgeuse_OTISUD (1).pdf?url';
import dpia from '../assets/DPIA_Badgeuse_OTISUD (1).pdf?url';

interface RGPDMentionsProps {
  onClose: () => void;
}

const RGPDMentions: React.FC<RGPDMentionsProps> = ({ onClose }) => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: 20,
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 16,
        maxWidth: 900,
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: 32,
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        position: 'relative',
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'none',
            border: 'none',
            fontSize: 28,
            color: '#888',
            cursor: 'pointer',
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ×
        </button>

        <h1 style={{ color: '#1976d2', marginTop: 0, marginBottom: 24, fontSize: 28, fontWeight: 700 }}>
          Mentions RGPD - Protection des Données Personnelles
        </h1>

        {/* Section de téléchargement des documents */}
        <div style={{ marginBottom: 32, padding: 20, background: '#f5f5f5', borderRadius: 12, border: '1px solid #ddd' }}>
          <h3 style={{ color: '#1976d2', fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
            📄 Documents à télécharger
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <a
              href={manuelUtilisateur}
              download="Manuel_Utilisateur_Badgeuse_OTI.pdf"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                background: '#fff',
                borderRadius: 8,
                border: '1px solid #ddd',
                textDecoration: 'none',
                color: '#333',
                fontWeight: 500,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f0f0f0';
                e.currentTarget.style.borderColor = '#1976d2';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#fff';
                e.currentTarget.style.borderColor = '#ddd';
              }}
            >
              <span style={{ fontSize: 20 }}>📖</span>
              <span>Manuel Utilisateur Badgeuse OTI</span>
            </a>
            <a
              href={ficheSalaries}
              download="Fiche_salariés_RGPD_Badgeuse_OTISUD.pdf"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                background: '#fff',
                borderRadius: 8,
                border: '1px solid #ddd',
                textDecoration: 'none',
                color: '#333',
                fontWeight: 500,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f0f0f0';
                e.currentTarget.style.borderColor = '#1976d2';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#fff';
                e.currentTarget.style.borderColor = '#ddd';
              }}
            >
              <span style={{ fontSize: 20 }}>📋</span>
              <span>Fiche Salariés RGPD - Badgeuse OTISUD</span>
            </a>
            <a
              href={reglementRGPD}
              download="Reglement_RGPD_Badgeuse_OTISUD.pdf"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                background: '#fff',
                borderRadius: 8,
                border: '1px solid #ddd',
                textDecoration: 'none',
                color: '#333',
                fontWeight: 500,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f0f0f0';
                e.currentTarget.style.borderColor = '#1976d2';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#fff';
                e.currentTarget.style.borderColor = '#ddd';
              }}
            >
              <span style={{ fontSize: 20 }}>📜</span>
              <span>Règlement RGPD - Badgeuse OTISUD</span>
            </a>
            <a
              href={dpia}
              download="DPIA_Badgeuse_OTISUD.pdf"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                background: '#fff',
                borderRadius: 8,
                border: '1px solid #ddd',
                textDecoration: 'none',
                color: '#333',
                fontWeight: 500,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f0f0f0';
                e.currentTarget.style.borderColor = '#1976d2';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#fff';
                e.currentTarget.style.borderColor = '#ddd';
              }}
            >
              <span style={{ fontSize: 20 }}>🔍</span>
              <span>DPIA - Analyse d'Impact Badgeuse OTISUD</span>
            </a>
          </div>
        </div>

        <div style={{ lineHeight: 1.8, color: '#333' }}>
          <section style={{ marginBottom: 32 }}>
            <h2 style={{ color: '#1976d2', fontSize: 20, fontWeight: 600, marginBottom: 12 }}>
              1. Responsable du traitement
            </h2>
            <p style={{ marginBottom: 8 }}>
              <strong>SPL OTI DU SUD</strong><br />
              Office de Tourisme Intercommunal du Sud de La Réunion
            </p>
            <p style={{ marginBottom: 8 }}>
              <strong>Adresse :</strong><br />
              379 Rue Hubert Delisle<br />
              97430 Le Tampon
            </p>
            <p style={{ marginBottom: 8 }}>
              <strong>SIREN :</strong> 882 699 556
            </p>
            <p style={{ marginBottom: 8 }}>
              <strong>Référent RGPD :</strong><br />
              David Philippe – Manager SI<br />
              Email : <a href="mailto:d.philippe@otisud.com" style={{ color: '#1976d2' }}>d.philippe@otisud.com</a><br />
              Téléphone : <a href="tel:0693419291" style={{ color: '#1976d2' }}>06 93 41 92 91</a>
            </p>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ color: '#1976d2', fontSize: 20, fontWeight: 600, marginBottom: 12 }}>
              2. Finalités du traitement
            </h2>
            <p style={{ marginBottom: 12 }}>
              L'application de badgeage est utilisée pour :
            </p>
            <ul style={{ marginLeft: 24, marginBottom: 12 }}>
              <li style={{ marginBottom: 8 }}>
                <strong>Suivi du temps de travail :</strong> Enregistrement des entrées, sorties et pauses
              </li>
              <li style={{ marginBottom: 8 }}>
                <strong>Conformité légale :</strong> Respect des obligations légales en matière de gestion du temps de travail
              </li>
              <li style={{ marginBottom: 8 }}>
                <strong>Préparation de la paie :</strong> Calcul des heures travaillées pour la paie
              </li>
              <li style={{ marginBottom: 8 }}>
                <strong>Gestion des anomalies :</strong> Traitement des oublis et des hors zone
              </li>
              <li style={{ marginBottom: 8 }}>
                <strong>Suivi de la présence :</strong> Vérification de la présence sur les sites (commune de travail uniquement)
              </li>
              <li style={{ marginBottom: 8 }}>
                <strong>Production d'indicateurs RH :</strong> Indicateurs nominaux limités (retards, pauses, absences) dans le seul but de contrôler le respect des horaires et <strong>non la productivité</strong>
              </li>
            </ul>
            <p style={{ marginBottom: 8, padding: 12, background: '#e3f2fd', borderRadius: 8, border: '1px solid #1976d2', fontStyle: 'italic' }}>
              <strong>Important :</strong> Les indicateurs (retards, absences, pauses) servent uniquement à vérifier le respect des horaires. Ils ne mesurent pas la productivité minute par minute des salariés.
            </p>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ color: '#1976d2', fontSize: 20, fontWeight: 600, marginBottom: 12 }}>
              3. Bases légales du traitement
            </h2>
            <p style={{ marginBottom: 12 }}>
              Le traitement de vos données personnelles est fondé sur :
            </p>
            <ul style={{ marginLeft: 24, marginBottom: 12 }}>
              <li style={{ marginBottom: 8 }}>
                <strong>Article 6.1.c du RGPD (Obligation légale) :</strong> Respect des obligations légales en matière de gestion du temps de travail et de préparation de la paie
              </li>
              <li style={{ marginBottom: 8 }}>
                <strong>Article 6.1.f du RGPD (Intérêt légitime) :</strong> Sécurité des biens et des personnes, contrôle d'accès aux locaux, organisation des équipes
              </li>
            </ul>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ color: '#1976d2', fontSize: 20, fontWeight: 600, marginBottom: 12 }}>
              4. Données collectées
            </h2>
            <p style={{ marginBottom: 12 }}>
              Les catégories de données personnelles collectées sont :
            </p>
            <ul style={{ marginLeft: 24, marginBottom: 12 }}>
              <li style={{ marginBottom: 8 }}>
                <strong>Identité :</strong> Nom, prénom, email, rôle, service
              </li>
              <li style={{ marginBottom: 8 }}>
                <strong>Badges :</strong> Numéro de badge NFC, historique des badges
              </li>
              <li style={{ marginBottom: 8 }}>
                <strong>Badgeages :</strong> Date/heure, type d'action (entrée/sortie/pause/retour), lieu, code, commentaire éventuel
              </li>
              <li style={{ marginBottom: 8 }}>
                <strong>Localisation :</strong> Latitude/longitude (3 décimales de précision), uniquement pour les agents hors locaux, conservée 3 semaines maximum
              </li>
              <li style={{ marginBottom: 8 }}>
                <strong>Oubli badgeage :</strong> Raison, commentaire, validation RH
              </li>
            </ul>
            <p style={{ marginBottom: 8, padding: 12, background: '#fff3e0', borderRadius: 8, border: '1px solid #ff9800' }}>
              <strong>Note importante :</strong> La localisation est enregistrée avec une précision réduite (3 décimales) et uniquement pour les agents travaillant hors des locaux. Elle est automatiquement supprimée après 3 semaines.
            </p>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ color: '#1976d2', fontSize: 20, fontWeight: 600, marginBottom: 12 }}>
              5. Durées de conservation
            </h2>
            <p style={{ marginBottom: 12 }}>
              Les données sont conservées pour les durées suivantes :
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12, background: '#fff', borderRadius: 8, overflow: 'hidden' }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '2px solid #ddd', fontWeight: 600, color: '#666' }}>Type de données</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '2px solid #ddd', fontWeight: 600, color: '#666' }}>Durée de conservation</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid #eee' }}>Badgeages</td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid #eee' }}>5 ans (dans la limite de 5 ans après le départ)</td>
                </tr>
                <tr>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid #eee' }}>Localisation</td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid #eee' }}>3 semaines maximum</td>
                </tr>
                <tr>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid #eee' }}>Justificatifs</td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid #eee' }}>5 ans</td>
                </tr>
                <tr>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid #eee' }}>Badges (historique)</td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid #eee' }}>Pendant le contrat + archivage</td>
                </tr>
              </tbody>
            </table>
            <p style={{ marginBottom: 8, padding: 12, background: '#fff3e0', borderRadius: 8, border: '1px solid #ff9800' }}>
              <strong>⚠️ Important :</strong> Les données de localisation sont automatiquement purgées après 3 semaines. Les données de badgeage sont automatiquement purgées après 5 ans. Ces purges sont effectuées automatiquement par le système.
            </p>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ color: '#1976d2', fontSize: 20, fontWeight: 600, marginBottom: 12 }}>
              6. Destinataires des données
            </h2>
            <p style={{ marginBottom: 12 }}>
              Les données peuvent être communiquées à :
            </p>
            <ul style={{ marginLeft: 24, marginBottom: 12 }}>
              <li style={{ marginBottom: 8 }}>
                <strong>RH :</strong> Gestion du temps et paie
              </li>
              <li style={{ marginBottom: 8 }}>
                <strong>Managers :</strong> Organisation des équipes (accès limité à leur service uniquement)
              </li>
              <li style={{ marginBottom: 8 }}>
                <strong>IT :</strong> Maintenance et supervision technique
              </li>
            </ul>
            <p style={{ marginBottom: 8, padding: 12, background: '#e8f5e9', borderRadius: 8, border: '1px solid #4caf50' }}>
              <strong>✓ Pas de transfert hors UE :</strong> Hébergement OVH France, conforme RGPD
            </p>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ color: '#1976d2', fontSize: 20, fontWeight: 600, marginBottom: 12 }}>
              7. Vos droits
            </h2>
            <p style={{ marginBottom: 12 }}>
              Conformément au RGPD, vous disposez des droits suivants :
            </p>
            <ul style={{ marginLeft: 24, marginBottom: 12 }}>
              <li style={{ marginBottom: 8 }}>
                <strong>Droit d'accès :</strong> Vous pouvez demander l'accès à vos données personnelles
              </li>
              <li style={{ marginBottom: 8 }}>
                <strong>Droit de rectification :</strong> Vous pouvez demander la correction de vos données inexactes
              </li>
              <li style={{ marginBottom: 8 }}>
                <strong>Droit à l'effacement :</strong> Vous pouvez demander la suppression de vos données dans les limites légales
              </li>
              <li style={{ marginBottom: 8 }}>
                <strong>Droit à la limitation :</strong> Vous pouvez demander la limitation du traitement de vos données
              </li>
              <li style={{ marginBottom: 8 }}>
                <strong>Droit d'opposition :</strong> Vous pouvez vous opposer au traitement de vos données pour des motifs légitimes
              </li>
              <li style={{ marginBottom: 8 }}>
                <strong>Droit à la portabilité :</strong> Vous pouvez demander la récupération de vos données dans un format structuré
              </li>
            </ul>
            <p style={{ marginBottom: 8, padding: 12, background: '#e3f2fd', borderRadius: 8, border: '1px solid #1976d2' }}>
              <strong>Pour exercer vos droits :</strong> Contactez le référent RGPD à l'adresse <a href="mailto:d.philippe@otisud.com" style={{ color: '#1976d2' }}>d.philippe@otisud.com</a> ou par téléphone au <a href="tel:0693419291" style={{ color: '#1976d2' }}>06 93 41 92 91</a> en précisant votre demande et en joignant une copie de votre pièce d'identité.
            </p>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ color: '#1976d2', fontSize: 20, fontWeight: 600, marginBottom: 12 }}>
              8. Sécurité des données
            </h2>
            <p style={{ marginBottom: 12 }}>
              L'OTI du SUD met en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données personnelles :
            </p>
            <ul style={{ marginLeft: 24, marginBottom: 12 }}>
              <li style={{ marginBottom: 8 }}>
                <strong>Authentification nominative :</strong> Via code personnel sécurisé
              </li>
              <li style={{ marginBottom: 8 }}>
                <strong>Connexion sécurisée :</strong> HTTPS (chiffrement des données en transit)
              </li>
              <li style={{ marginBottom: 8 }}>
                <strong>Accès limités :</strong> Accès restreints aux profils autorisés
              </li>
              <li style={{ marginBottom: 8 }}>
                <strong>Logs des accès :</strong> Journalisation des accès administratifs
              </li>
              <li style={{ marginBottom: 8 }}>
                <strong>RLS (Row Level Security) :</strong> Contrôle d'accès au niveau des lignes activé
              </li>
              <li style={{ marginBottom: 8 }}>
                <strong>Hébergement sécurisé :</strong> OVH France, conforme RGPD
              </li>
              <li style={{ marginBottom: 8 }}>
                <strong>Purge automatique :</strong> Suppression automatique des données selon les durées de conservation
              </li>
            </ul>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ color: '#1976d2', fontSize: 20, fontWeight: 600, marginBottom: 12 }}>
              9. Réclamation
            </h2>
            <p style={{ marginBottom: 12 }}>
              Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une réclamation auprès de la Commission Nationale de l'Informatique et des Libertés (CNIL) :
            </p>
            <p style={{ marginBottom: 8 }}>
              <strong>CNIL</strong><br />
              3 Place de Fontenoy - TSA 80715<br />
              75334 PARIS CEDEX 07<br />
              Téléphone : 01 53 73 22 22<br />
              Site web : <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" style={{ color: '#1976d2' }}>www.cnil.fr</a>
            </p>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ color: '#1976d2', fontSize: 20, fontWeight: 600, marginBottom: 12 }}>
              10. Contact et conformité
            </h2>
            <p style={{ marginBottom: 8 }}>
              Pour toute question relative au traitement de vos données personnelles, vous pouvez contacter :
            </p>
            <p style={{ marginBottom: 8, padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
              <strong>Référent RGPD - OTI du SUD</strong><br />
              David Philippe – Manager SI<br />
              Email : <a href="mailto:d.philippe@otisud.com" style={{ color: '#1976d2' }}>d.philippe@otisud.com</a><br />
              Téléphone : <a href="tel:0693419291" style={{ color: '#1976d2' }}>06 93 41 92 91</a>
            </p>
            <p style={{ marginBottom: 8, padding: 12, background: '#e8f5e9', borderRadius: 8, border: '1px solid #4caf50' }}>
              <strong>✓ Conformité et CSE :</strong> Une analyse d'impact (DPIA) a été réalisée et des mesures de protection mises en place. À ce jour, aucun CSE n'est en place. L'OTI du Sud s'engage à consulter cette instance dès son installation, conformément à l'article L.2312-38 du Code du travail.
            </p>
          </section>

          <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid #e0e0e0', textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: '#666' }}>
              Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <button
              onClick={onClose}
              style={{
                marginTop: 16,
                background: '#1976d2',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '12px 24px',
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RGPDMentions;

