// Email service using Resend for sending calendar invites

import { Resend } from 'resend';
import { generateICSFile, generateICSFilename, ICSAction, WorkoutData, UserData } from './ics-generator';

// Default from email
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@crossfit-app.com';

// Initialize Resend lazily to avoid errors when API key is not configured
let resend: Resend | null = null;
function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

export interface EmailResult {
  success: boolean;
  error?: string;
  messageId?: string;
}

/**
 * Send a calendar invite email with ICS attachment
 */
export async function sendCalendarInvite(
  workout: WorkoutData,
  organizer: UserData,
  attendee: UserData,
  action: ICSAction = 'create'
): Promise<EmailResult> {
  try {
    // Check if Resend is configured
    const resendClient = getResendClient();
    if (!resendClient) {
      console.warn('RESEND_API_KEY not configured, skipping email');
      return { success: false, error: 'Email service not configured' };
    }

    // Generate ICS file content
    const icsContent = generateICSFile(workout, organizer, attendee, action);
    const icsFilename = generateICSFilename(workout);

    // Determine email subject and body based on action
    let subject: string;
    let htmlBody: string;
    let textBody: string;

    switch (action) {
      case 'cancel':
        subject = `Workout Cancelled: ${workout.title}`;
        htmlBody = `
          <h2>Workout Cancelled</h2>
          <p>The following workout has been cancelled:</p>
          <h3>${workout.title}</h3>
          <p><strong>Date:</strong> ${new Date(workout.date).toLocaleString()}</p>
          ${workout.description ? `<p><strong>Description:</strong> ${workout.description}</p>` : ''}
          <p>The calendar event has been removed from your calendar.</p>
        `;
        textBody = `
Workout Cancelled

The following workout has been cancelled:

${workout.title}
Date: ${new Date(workout.date).toLocaleString()}
${workout.description ? `Description: ${workout.description}` : ''}

The calendar event has been removed from your calendar.
        `;
        break;

      case 'update':
        subject = `Workout Updated: ${workout.title}`;
        const updateDate = new Date(workout.date);
        const updateDateStr = new Intl.DateTimeFormat('en-US', { 
          weekday: 'long',
          year: 'numeric',
          month: 'long', 
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          timeZone: 'Europe/Zurich',
          timeZoneName: 'short'
        }).format(updateDate);
        htmlBody = `
          <h2>Workout Updated</h2>
          <p>A workout you're registered for has been updated:</p>
          <h3>${workout.title}</h3>
          <p><strong>Date:</strong> ${updateDateStr}</p>
          ${workout.workout_type ? `<p><strong>Type:</strong> ${workout.workout_type}</p>` : ''}
          ${workout.description ? `<p><strong>Description:</strong> ${workout.description}</p>` : ''}
          <p>Your calendar has been updated with the latest details.</p>
        `;
        textBody = `
Workout Updated

A workout you're registered for has been updated:

${workout.title}
Date: ${updateDateStr}
${workout.workout_type ? `Type: ${workout.workout_type}` : ''}
${workout.description ? `Description: ${workout.description}` : ''}

Your calendar has been updated with the latest details.
        `;
        break;

      default: // create
        subject = `Workout Invitation: ${workout.title}`;
        const createDate = new Date(workout.date);
        // Format date in a readable way - the date is stored in UTC but represents the local workout time
        const createDateStr = new Intl.DateTimeFormat('en-US', { 
          weekday: 'long',
          year: 'numeric',
          month: 'long', 
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          timeZone: 'Europe/Zurich',
          timeZoneName: 'short'
        }).format(createDate);
        htmlBody = `
          <h2>Workout Invitation</h2>
          <p>You've been registered for the following workout:</p>
          <h3>${workout.title}</h3>
          <p><strong>Date:</strong> ${createDateStr}</p>
          ${workout.workout_type ? `<p><strong>Type:</strong> ${workout.workout_type}</p>` : ''}
          ${workout.description ? `<p><strong>Description:</strong> ${workout.description}</p>` : ''}
          <p>The workout has been added to your calendar automatically.</p>
          <p>See you there! 💪</p>
        `;
        textBody = `
Workout Invitation

You've been registered for the following workout:

${workout.title}
Date: ${createDateStr}
${workout.workout_type ? `Type: ${workout.workout_type}` : ''}
${workout.description ? `Description: ${workout.description}` : ''}

The workout has been added to your calendar automatically.

See you there! 💪
        `;
    }

    // Send email with ICS attachment
    const response = await resendClient.emails.send({
      from: FROM_EMAIL,
      to: attendee.email,
      subject: subject,
      html: htmlBody,
      text: textBody,
      attachments: [
        {
          filename: icsFilename,
          content: Buffer.from(icsContent).toString('base64'),
          contentType: 'text/calendar',
        },
      ],
    });

    if (response.error) {
      console.error('Failed to send email:', response.error);
      return { success: false, error: response.error.message };
    }

    console.log('Email sent successfully:', response.data?.id);
    return { success: true, messageId: response.data?.id };
  } catch (error) {
    console.error('Error sending calendar invite:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Send calendar invites to multiple attendees
 */
export async function sendCalendarInvites(
  workout: WorkoutData,
  organizer: UserData,
  attendees: UserData[],
  action: ICSAction = 'create'
): Promise<EmailResult[]> {
  const results = await Promise.all(
    attendees.map(attendee => 
      sendCalendarInvite(workout, organizer, attendee, action)
    )
  );

  return results;
}

/**
 * Helper function to send invite to workout creator
 */
export async function notifyWorkoutCreator(
  workout: WorkoutData,
  creator: UserData
): Promise<EmailResult> {
  return sendCalendarInvite(workout, creator, creator, 'create');
}

/**
 * Helper function to send invite to newly registered user
 */
export async function notifyWorkoutRegistration(
  workout: WorkoutData,
  organizer: UserData,
  registrant: UserData
): Promise<EmailResult> {
  return sendCalendarInvite(workout, organizer, registrant, 'create');
}

/**
 * Helper function to send updates to all registered users
 */
export async function notifyWorkoutUpdate(
  workout: WorkoutData,
  organizer: UserData,
  attendees: UserData[]
): Promise<EmailResult[]> {
  return sendCalendarInvites(workout, organizer, attendees, 'update');
}

/**
 * Helper function to send cancellation to all registered users
 */
export async function notifyWorkoutCancellation(
  workout: WorkoutData,
  organizer: UserData,
  attendees: UserData[]
): Promise<EmailResult[]> {
  return sendCalendarInvites(workout, organizer, attendees, 'cancel');
}

/**
 * Notify users that a new date was added to a poll.
 * Sent to the poll creator + everyone who already voted (minus the person who added).
 */
export async function notifyPollOptionAdded(
  poll: { id: number; title: string },
  newOption: { date: string; label?: string | null },
  addedBy: UserData,
  recipients: UserData[]
): Promise<EmailResult[]> {
  const resendClient = getResendClient();
  if (!resendClient) {
    console.warn('RESEND_API_KEY not configured, skipping poll notification');
    return [];
  }
  if (recipients.length === 0) return [];

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://go-pure.ch';
  const pollUrl = `${appUrl}/calendar/${poll.id}`;

  const when = new Date(newOption.date);
  const whenStr = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(when);

  const subject = `New date added to poll: ${poll.title}`;
  const htmlBody = `
    <h2>New date added to poll</h2>
    <p><strong>${addedBy.name}</strong> just added a new date option to the poll <strong>${poll.title}</strong>:</p>
    <p style="font-size: 1.1em; padding: 12px; background: #f4f4f4; border-radius: 6px;">
      📅 ${whenStr}${newOption.label ? ` &mdash; ${newOption.label}` : ''}
    </p>
    <p>
      <a href="${pollUrl}" style="display: inline-block; padding: 10px 18px; background: #4ade80; color: #000; text-decoration: none; border-radius: 6px; font-weight: bold;">
        Open poll & vote
      </a>
    </p>
    <p style="color: #888; font-size: 0.9em;">You're receiving this because you voted in (or created) this poll.</p>
  `;
  const textBody = `New date added to poll: ${poll.title}\n\n${addedBy.name} added: ${whenStr}${newOption.label ? ` - ${newOption.label}` : ''}\n\nOpen the poll to vote: ${pollUrl}\n`;

  const results = await Promise.all(
    recipients.map(async (r): Promise<EmailResult> => {
      try {
        const { data, error } = await resendClient.emails.send({
          from: FROM_EMAIL,
          to: r.email,
          subject,
          html: htmlBody,
          text: textBody,
        });
        if (error) {
          return { success: false, error: error.message };
        }
        return { success: true, messageId: data?.id };
      } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
      }
    })
  );
  return results;
}
