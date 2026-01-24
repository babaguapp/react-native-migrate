import { supabase } from '@/lib/supabaseClient';

export type NotificationType = 
  | 'join_request'
  | 'participant_accepted'
  | 'participant_left'
  | 'meeting_updated'
  | 'meeting_cancelled'
  | 'organizer_changed'
  | 'became_organizer'
  | 'application_accepted'
  | 'application_rejected'
  | 'removed_from_meeting';

export async function sendNotification(
  targetUserId: string,
  type: NotificationType,
  title: string,
  message: string,
  meetingId?: string,
  relatedUserId?: string
) {
  try {
    const { error } = await supabase.rpc('create_notification', {
      p_user_id: targetUserId,
      p_type: type,
      p_title: title,
      p_message: message,
      p_meeting_id: meetingId || null,
      p_related_user_id: relatedUserId || null,
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error sending notification:', error);
    return false;
  }
}

export async function notifyJoinRequest(
  organizerId: string,
  applicantName: string,
  meetingId: string,
  applicantId: string
) {
  return sendNotification(
    organizerId,
    'join_request',
    'Nowe zgłoszenie',
    `${applicantName} chce dołączyć do Twojego spotkania`,
    meetingId,
    applicantId
  );
}

export async function notifyParticipantAccepted(
  participantIds: string[],
  newParticipantName: string,
  meetingId: string,
  newParticipantId: string
) {
  const promises = participantIds.map(participantId =>
    sendNotification(
      participantId,
      'participant_accepted',
      'Nowy uczestnik',
      `${newParticipantName} dołączył/a do spotkania`,
      meetingId,
      newParticipantId
    )
  );
  await Promise.all(promises);
}

export async function notifyApplicationAccepted(
  applicantId: string,
  meetingId: string,
  activityName: string
) {
  return sendNotification(
    applicantId,
    'application_accepted',
    'Zgłoszenie zaakceptowane! 🎉',
    `Zostałeś przyjęty do spotkania "${activityName}"`,
    meetingId
  );
}

export async function notifyApplicationRejected(
  applicantId: string,
  meetingId: string,
  activityName: string
) {
  return sendNotification(
    applicantId,
    'application_rejected',
    'Zgłoszenie odrzucone',
    `Niestety, Twoje zgłoszenie do spotkania "${activityName}" zostało odrzucone`,
    meetingId
  );
}

export async function notifyRemovedFromMeeting(
  participantId: string,
  meetingId: string,
  activityName: string
) {
  return sendNotification(
    participantId,
    'removed_from_meeting',
    'Usunięto ze spotkania',
    `Zostałeś usunięty ze spotkania "${activityName}"`,
    meetingId
  );
}

export async function notifyParticipantLeft(
  participantIds: string[],
  leavingParticipantName: string,
  meetingId: string,
  leavingParticipantId: string
) {
  const promises = participantIds.map(participantId =>
    sendNotification(
      participantId,
      'participant_left',
      'Uczestnik opuścił spotkanie',
      `${leavingParticipantName} opuścił/a spotkanie`,
      meetingId,
      leavingParticipantId
    )
  );
  await Promise.all(promises);
}

export async function notifyMeetingUpdated(
  participantIds: string[],
  meetingId: string
) {
  const promises = participantIds.map(participantId =>
    sendNotification(
      participantId,
      'meeting_updated',
      'Spotkanie zaktualizowane',
      'Organizator zaktualizował szczegóły spotkania',
      meetingId
    )
  );
  await Promise.all(promises);
}

export async function notifyMeetingCancelled(
  participantIds: string[],
  meetingId: string
) {
  const promises = participantIds.map(participantId =>
    sendNotification(
      participantId,
      'meeting_cancelled',
      'Spotkanie anulowane',
      'Spotkanie zostało anulowane',
      meetingId
    )
  );
  await Promise.all(promises);
}

export async function notifyBecameOrganizer(
  newOrganizerId: string,
  meetingId: string
) {
  return sendNotification(
    newOrganizerId,
    'became_organizer',
    'Jesteś teraz organizatorem',
    'Poprzedni organizator opuścił spotkanie. Teraz Ty jesteś organizatorem!',
    meetingId
  );
}

export async function notifyOrganizerChanged(
  participantIds: string[],
  newOrganizerName: string,
  meetingId: string,
  newOrganizerId: string
) {
  const promises = participantIds.map(participantId =>
    sendNotification(
      participantId,
      'organizer_changed',
      'Zmiana organizatora',
      `${newOrganizerName} jest teraz organizatorem spotkania`,
      meetingId,
      newOrganizerId
    )
  );
  await Promise.all(promises);
}

