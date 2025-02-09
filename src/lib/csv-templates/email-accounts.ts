export const emailAccountsTemplate = {
  headers: [
    'email',
    'First Name',
    'Last Name',
    'IMAP Username',
    'IMAP Password',
    'IMAP Host',
    'IMAP Port',
    'SMTP Username',
    'SMTP Password',
    'SMTP Host',
    'SMTP Port'
  ],
  example: [
    'user@example.com',
    'John',
    'Doe',
    'user@example.com',
    'password123',
    'mail.example.com',
    '993',
    'user@example.com',
    'password123',
    'mail.example.com',
    '587'
  ],
  required: [
    'email',
    'IMAP Username',
    'IMAP Password',
    'IMAP Host',
    'IMAP Port',
    'SMTP Username',
    'SMTP Password',
    'SMTP Host',
    'SMTP Port'
  ],
  optional: [
    'First Name',
    'Last Name'
  ],
  descriptions: {
    email: 'Email address for the account',
    'First Name': 'First name of the account owner',
    'Last Name': 'Last name of the account owner',
    'IMAP Username': 'Username for incoming mail (usually same as email)',
    'IMAP Password': 'Password for incoming mail',
    'IMAP Host': 'IMAP server hostname',
    'IMAP Port': 'IMAP server port (usually 993 for SSL)',
    'SMTP Username': 'Username for outgoing mail (usually same as email)',
    'SMTP Password': 'Password for outgoing mail',
    'SMTP Host': 'SMTP server hostname',
    'SMTP Port': 'SMTP server port (usually 587 for TLS)'
  }
}; 