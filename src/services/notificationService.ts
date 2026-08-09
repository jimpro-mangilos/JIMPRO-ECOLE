import { supabase } from '../lib/supabase';

interface NotificationData {
  paiementId: string;
  nomEleve: string;
  montantPaye: number;
  montantEnLettre: string;
  numeroRecu: string;
  telephone: string;
  email?: string;
  ecole_id?: string;
}

export async function sendSMSNotification(data: NotificationData): Promise<boolean> {
  try {
    const message = `Bonjour, Paiement reçu pour ${data.nomEleve}. Montant: ${data.montantPaye} FC (${data.montantEnLettre}). Reçu N°: ${data.numeroRecu}. Merci.`;

    const { error } = await supabase.from('notifications_log').insert({
      paiement_id: data.paiementId,
      type_notification: 'sms',
      destinataire: data.telephone,
      message: message,
      statut: 'sent',
      sent_at: new Date().toISOString(),
      ecole_id: data.ecole_id,
    });

    if (error) {
      console.error('Erreur lors de l\'enregistrement du SMS:', error);
      return false;
    }

    console.log('SMS notification logged:', message);
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'envoi du SMS:', error);

    await supabase.from('notifications_log').insert({
      paiement_id: data.paiementId,
      type_notification: 'sms',
      destinataire: data.telephone,
      message: 'Erreur lors de l\'envoi',
      statut: 'failed',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      ecole_id: data.ecole_id,
    });

    return false;
  }
}

export async function sendEmailNotification(data: NotificationData): Promise<boolean> {
  try {
    if (!data.email) {
      console.log('Pas d\'email fourni, notification ignorée');
      return false;
    }

    const message = `
      Bonjour,

      Nous confirmons la réception du paiement pour ${data.nomEleve}.

      Détails du paiement:
      - Montant: ${data.montantPaye} FC
      - En lettres: ${data.montantEnLettre}
      - Numéro de reçu: ${data.numeroRecu}
      - Date: ${new Date().toLocaleDateString('fr-FR')}

      Merci de votre confiance.

      Cordialement,
      L'administration
    `;

    const { error } = await supabase.from('notifications_log').insert({
      paiement_id: data.paiementId,
      type_notification: 'email',
      destinataire: data.email,
      message: message,
      statut: 'sent',
      sent_at: new Date().toISOString(),
      ecole_id: data.ecole_id,
    });

    if (error) {
      console.error('Erreur lors de l\'enregistrement de l\'email:', error);
      return false;
    }

    console.log('Email notification logged');
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email:', error);

    await supabase.from('notifications_log').insert({
      paiement_id: data.paiementId,
      type_notification: 'email',
      destinataire: data.email || '',
      message: 'Erreur lors de l\'envoi',
      statut: 'failed',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      ecole_id: data.ecole_id,
    });

    return false;
  }
}

export async function sendNotifications(data: NotificationData): Promise<{ sms: boolean; email: boolean }> {
  const [smsResult, emailResult] = await Promise.all([
    sendSMSNotification(data),
    data.email ? sendEmailNotification(data) : Promise.resolve(false),
  ]);

  return {
    sms: smsResult,
    email: emailResult,
  };
}
