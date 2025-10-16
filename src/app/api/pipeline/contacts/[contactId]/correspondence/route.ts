import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

type RouteParams = {
  params: { contactId: string };
};

type RawRecipient = {
  email?: string | null;
  type?: string | null;
  contactId?: string | null;
};

interface RawMessage {
  id: string;
  mailreefMessageId: string | null;
  customThreadId: string | null;
  direction: string;
  fromEmail: string | null;
  subject: string | null;
  bodyText: string | null;
  bodyHtml: string | null;
  eventTimestamp: string;
  emailAccountId: string | null;
  recipients: Prisma.JsonValue;
}

export async function GET(_: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.organizationId) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { message: 'Forbidden' },
        { status: 403 }
      );
    }

    const organizationId = session.user.organizationId;
    const contactId = params.contactId;

    if (!contactId) {
      return NextResponse.json(
        { message: 'Contact ID is required' },
        { status: 400 }
      );
    }

    const contact = await prisma.contacts.findFirst({
      where: {
        id: contactId,
        organizationId,
      },
      select: {
        id: true,
        email: true,
        threadId: true,
        fullName: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!contact) {
      return NextResponse.json(
        { message: 'Contact not found' },
        { status: 404 }
      );
    }

    const contactMatch = Prisma.sql`r."contactId" = ${contactId}`;
    const threadMatch = contact.threadId
      ? Prisma.sql` OR m."customThreadId" = ${contact.threadId}`
      : Prisma.sql``;
    const emailMatch = contact.email
      ? Prisma.sql` OR LOWER(m."fromEmail") = LOWER(${contact.email})`
      : Prisma.sql``;

    const query = Prisma.sql`
      SELECT
        m."id",
        m."mailreefMessageId",
        m."customThreadId",
        m."direction",
        m."fromEmail",
        m."subject",
        m."bodyText",
        m."bodyHtml",
        m."eventTimestamp",
        m."emailAccountId",
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'email', r."recipientEmail",
              'type', r."recipientType",
              'contactId', r."contactId"
            )
          ) FILTER (WHERE r."recipientEmail" IS NOT NULL),
          '[]'::json
        ) AS recipients
      FROM "MailReefMessage" m
      LEFT JOIN "MailReefRecipient" r
        ON r."mailReefMessageId" = m."mailreefMessageId"
       AND r."organizationId" = m."organizationId"
      WHERE m."organizationId" = ${organizationId}
        AND (
          ${contactMatch}
          ${threadMatch}
          ${emailMatch}
        )
      GROUP BY
        m."id",
        m."mailreefMessageId",
        m."customThreadId",
        m."direction",
        m."fromEmail",
        m."subject",
        m."bodyText",
        m."bodyHtml",
        m."eventTimestamp",
        m."emailAccountId"
      ORDER BY m."eventTimestamp" ASC;
    `;

    const rawMessages = await prisma.$queryRaw<RawMessage[]>(query);

    if (!rawMessages.length) {
      return NextResponse.json({
        contact: {
          id: contact.id,
          name:
            contact.fullName ||
            [contact.firstName, contact.lastName]
              .filter(Boolean)
              .join(' ')
              .trim() ||
            'Unnamed Contact',
          email: contact.email ?? '',
        },
        messages: [],
      });
    }

    const seen = new Set<string>();
    const messages = rawMessages
      .filter((message) => {
        const key = message.mailreefMessageId ?? message.id;
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      })
      .map((message) => {
        const rawRecipients = Array.isArray(message.recipients)
          ? (message.recipients as RawRecipient[])
          : [];

        return {
          id: message.id,
          messageId: message.mailreefMessageId ?? message.id,
          direction: message.direction,
          fromEmail: message.fromEmail ?? '',
          subject: message.subject ?? '',
          bodyText: message.bodyText ?? '',
          bodyHtml: message.bodyHtml ?? null,
          eventTimestamp: message.eventTimestamp,
          emailAccountId: message.emailAccountId,
          recipients: rawRecipients
            .filter((recipient) => recipient?.email)
            .map((recipient) => ({
              email: recipient.email ?? '',
              type: recipient.type ?? 'to',
              contactId: recipient.contactId ?? null,
            })),
        };
      });

    const response = {
      contact: {
        id: contact.id,
        name:
          contact.fullName ||
          [contact.firstName, contact.lastName]
            .filter(Boolean)
            .join(' ')
            .trim() ||
          'Unnamed Contact',
        email: contact.email ?? '',
      },
      messages,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Pipeline correspondence API error:', error);
    return NextResponse.json(
      { message: 'Failed to load correspondence history' },
      { status: 500 }
    );
  }
}
