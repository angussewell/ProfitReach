# Node.js SDK
A Node.js wrapper for API to manage messaging, mail and calendars.

Suggest Edits
Feature available for : LinkedIn, WhatsApp, Instagram, Messenger, Telegram, Google, Microsoft, IMAP, X (Twitter)

Introduction
Unipile Node.js SDK is a package written in Typescript that will facilitate the use of API.

Github repository.

Requirements
Node 18 recommended.

Installation

  npm install unipile-node-sdk
Usage
JavaScript

import { UnipileClient } from 'unipile-node-sdk';

const client = new UnipileClient('https://{YOUR_DSN}', '{YOUR_ACCESS_TOKEN}');

//LINKEDIN
await client.account.connectLinkedin({
  username: 'your LinkedIn username',
  password: 'your LinkedIn password',
});

//INSTAGRAM
await client.account.connectInstagram({
  username: 'your Instagram username',
  password: 'your Instagram password',
});

//WHATSAPP
const { qrCodeString: whatsappQrCode } = await client.account.connectWhatsapp();
console.log(whatsappQrCode); // scan the QR code to finish the connection

//TELEGRAM
const { qrCodeString: telegramQrCode } = await client.account.connectTelegram();
console.log(telegramQrCode); // scan the QR code to finish the connection

//MESSENGER
await client.account.connectMessenger({
  username: 'your Messenger username',
  password: 'your Messenger password',
});

const chats = await client.messaging.getAllChats();
const messages = await client.messaging.getAllMessages();
const attendees = await client.messaging.getAllAttendees();

# Connection methods
Before you can handle chats and messages, you must connect an account of the wanted messaging provider. Discover Unipile's connection methods in this section.

Suggest Edits
Overview
Unipile's API provides two account connection methods, ensuring that you can seamlessly synchronize accounts for different messaging services. Connecting an account involve authentication to the messaging provider through Unipile's API.

Supported authentication features for Messaging
WhatsApp	Linkedin	Instagram	Messenger	Telegram	Twitter
Hosted Authentification	🟢	🟢	🟢	🟢	🟢	🟢
Custom Authentification	🟢	🟢	🟢	🟢	🟢	🟢
QR Code scanning	🟢				🟢	
Authentication with username / password		🟢	🟠	🟠	🔴	🟠
2FA with SMS		🟢	🟠	🟠		
2FA with Authentication App		🟢	🟢	🟠	🟢	
2FA with In-App Validation		🟢		🟠	🔴	
One-Time Password		🟢		🟠		
Supported authentification features for Emails
Google	Microsoft	IMAP
Hosted Authentification	🟢	🟢	🟢
Custom Authentification	🟢	🟢	🟢
Authentification with OAuth Provider Screen	🟢	🟢	
Authentication with username / password	🟢		🟢
Hosted auth wizard
Hosted Auth Wizard is the quickest and most straightforward way to connect accounts, as it involves a single API call to generate an temporary link to redirect users to a Unipile's Hosted auth wizard. The wizard guides users step-by-step, supporting various authentication methods.

Hosted auth wizard for Linkedin
Hosted auth wizard for Linkedin

Custom authentication
If you want to embed a custom authentication form/wizard in your application, choose the Custom authentication approach. This approach offers the freedom to build a unique and tailored authentication experience that aligns with your application's specific needs.

However, it's a more advanced approach that needs more work as it requires implementing specific authentication scenarios like QR Code scanning, 2FA, and One-Time Password by yourself.

Recommended Steps for Account Management Integration
We assume that you have chosen the Hosted Auth method, as the majority of our customers do:

Add a "Connect an account" button to your product. Upon clicking this button, use our Hosted Auth API to generate a unique link for the user and redirect them to it.
Create a database to store your users' connected accounts. Suggested structure: id | user_id (yours) | account_type (LINKEDIN, GMAIL, WHATSAPP, etc.) | account_id | status (OK, CREDENTIALS, etc.) | last_update (datetime) | created_on (datetime)
Create a backend endpoint to handle calls from our API when a user successfully connects their account. In this endpoint, you will store the account_id of the account the user just connected, linked to your internal user_id (we provide this to simplify matching).
Create a landing page for the user upon successful (and failed) connection that will refresh their list of accounts stored on your side. For each account on your list, you may need to add a "Reconnect" button, which handles the same Hosted Auth API process but with the parameter "reconnect".
Set up a webhook in our API to handle account status changes.
Create a backend endpoint to process the webhook for status changes and compare the new status with the stored one. If there's a change, you can update the status and initiate some actions. The most critical status is CREDENTIALS, which requires user action to reconnect. You can send an email to your customers asking them to reconnect (or just display it in the UI).
Google Chrome Extension case
If your application has a browser extension and want to connect LinkedIn account, you can implement background authentication by utilizing the collected cookie of the account you want to connect and make a Custom authentication with cookies. When you receive the webhook notification for account disconnection, you can collect a new cookie and use the 'reconnect' method without any action of your user. This ensures a seamless user experience.

Recommended Steps for smooth LinkedIn cookie synchronization with Chrome extension:

Collect the following data: li_a, li_at, user_agent, ip (for Unipile, use a country-based IP), and an identifier for the connected account (to handle user account switching, you have to parse html of linkedin page to find the linkedin user id in their JSON {"data":{"plainId":..)).
Send this data to your backend at regular intervals, storing it as follows for example: internal_user_id, unipile_account_id (empty on the first call), unipile_status, date_last_cookie, date_last_status_unipile, li_a, li_at, user_agent, ip, date_last_try_connect
In your backend, if unipile_account_id is empty, your backend should use our custom authentication to connect the account initially
When the LinkedIn account is disconnected and you receive a webhook notification, your backend can use the custom authentication 'reconnect' function with the last recorded cookie and the account_id retrieved during the initial connection.
If reconnection fails, retry every hour for 4 hours (to accommodate LinkedIn downtimes), allowing users time to reconnect and use their extension naturally.
If unsuccessful after this period, send an email to the user prompting them to reconnect to LinkedIn and, if the date_last_cookie is outdated, verify that their extension is properly configured.

# Hosted auth wizard
Learn how to use Hosted Auth Wizard to connect accounts on your application.

Suggest Edits
Feature available for : LinkedIn, WhatsApp, Instagram, Messenger, Telegram, Google, Microsoft, IMAP, X (Twitter)

The Hosted Auth Wizard is a pre-built, optimised authentication interface that simplifies the process of connecting user accounts securely. With its built-in features, you can significantly reduce your development time and provide a streamlined authentication experience. The Hosted Auth Wizard offers support for various authentication methods, including QR code scanning, credentials-based authentication and OAuth. You can show only the providers you allow your users to connect to.


Overview

📘
You can specify the 'name' parameter with your internal user ID when requesting a hosted auth link. We will return this parameter when we call your 'notify_url', in order to match the connected account with your user.

Quickstart
Step 1 : Generate a Hosted Auth Wizard link
To generate a hosted auth link, you'll need to make an API Request with the following parameters:

Specifies whether you want to create a new connection or reconnect a disconnected account.
Your Unipile API endpoint.
The expiration date and time for the link in ISO 8601 format. Make sure it is a relatively short expiration period, ranging from a few minutes to a few hours. All links expire upon daily restart, regardless of their stated expiration date. A new link must be generated each time a user clicks on your app to connect.
A list of messaging providers the user can choose from in the wizard. You can specify a specific provider or use "*" for all providers.
Upon a user's successful login, you can configure two distinct URLs, one for success (success_redirect_url) and another for failure (failure_redirect_url), to which the user will be redirected. Additionally, you have the option to receive a webhook notification containing account-related information at a URL of your choosing (notify_url).
You can specify the 'name' parameter with your internal user ID when requesting a hosted auth link. We will return this parameter when we call your 'notify_url', in order to match the connected account with your user
cURL
JavaScript

curl --request POST \
     --url https://apiXXX.unipile.com:XXX/api/v1/hosted/accounts/link \
     --header 'X-API-KEY: XXXXXXXX' \
     --header 'accept: application/json' \
     --header 'content-type: application/json' \
     --data '
{
  "type": "create",
  "providers": ["LINKEDIN", "WHATSAPP", "GOOGLE"],
  "api_url": "https://apiXXX.unipile.com:XXX",
  "expiresOn": "2024-12-22T12:00:00.701Z" 
}
'
 // More parameters here https://developer.unipile.com/reference/hostedcontroller_requestlink
The utmost caution must be exercised to prevent the inadvertent exposure of your X-API-KEY. To accomplish this, it is necessary to establish an intermediary backend process responsible for make this api call who generate the unique link tailored to each user.

Upon a user's successful login, you can configure two distinct URLs, one for success (success_redirect_url) and another for failure (failure_redirect_url), to which the user will be redirected. Additionally, you have the option to receive a webhook notification containing account-related information at a URL of your choosing (notify_url).

Step 2 : Receive the Hosted Auth Link
Upon a successful API request, you'll receive a response containing a hosted auth URL. This URL is the link that will guide users through the authentication process.

JSON Response

{
  "object": "HostedAuthURL",
  "url": "https://account.unipile.com/pqb%2Gz77l.o72WXNPdqWX45jxqP5xMMlQp02zho8GAXZq0HWsAGiQ%3D"
}
Step 3: Implement the Hosted Auth Link
We strongly recommend the implementation of an automatic redirection mechanism when a user clicks a 'connect account' button within your application.

We do not recommend embedding our link in an iframe as this may cause some issues with solving the Linkedin captcha or loading the Microsoft Oauth screen..

Step 4: Receive callback when account is added
When your user successfully connects an account, you can receive a callback on a URL of your choice with the account_id and your internal ID to store the matching and make your future requests.

Add "notify_url" with your backend URL and "name" with your internal user ID parameters in your payload.

cURL
JavaScript

curl --request POST \
     --url https://apiXXX.unipile.com:XXX/api/v1/hosted/accounts/link \
     --header 'X-API-KEY: XXXXXXXX' \
     --header 'accept: application/json' \
     --header 'content-type: application/json' \
     --data '
{
  "type": "create",
  "providers": "*", 
  "api_url": "https://apiXXX.unipile.com:XXX",
  "expiresOn": "2024-12-22T12:00:00.701Z"
  "notify_url": "https://www.yourapp.com/account_callkback?youcanauth=asthis",
  "name": "myuser1234"
}
'
After the user connects their account, you will receive this payload on your notify URL.

JSON

{
  "status":"CREATION_SUCCESS", // or "RECONNECTED" for reconnect type
  "account_id":"e54m8LR22bA7G5qsAc8w",
  "name":"myuser1234"
}
Reconnecting an account with Hosted Auth Wizard
The reconnection link follows a similar path as the initial connection process, but with the type parameter set to reconnect, and it necessitates the inclusion of the account ID (reconnect_account).

Example usage
First, you need to set up a webhook to monitor account status updates. Specifically, you should look for the "CREDENTIALS" status change, which indicates that an account requires reconnection.
Upon detecting the "CREDENTIALS" status update, send an email to the user. In this email, provide a link that will allow them to initiate the reconnection process. Ensure that the email contains clear instructions and reassures the user about the security of the process.
When the user clicks on the reconnection link in the email, they should be directed to your backend service. This backend service generates a hosted Auth Wizard link using the Unipile API
After generating the hosted Auth Wizard link, redirect the user to this link. The user will follow the authentication steps to reconnect their account securely.
Custom Domain URL (White-label)
You can set up a CNAME using your own URL (e.g. auth.yourapp.com) pointing to account.unipile.com.

Once set up, please contact us for configuration. Finally, you can make a string replace of our domain by yours in the hosted auth URL.
Important: This feature is only available for Unipile account with active subscription.


# Message object
This section will explain in detail each field of the message object so you can properly integrate them in your application

Suggest Edits
id
Unique identifier of the message for Unipile.

Can be used to prevent duplicate entries.

chat_id
Unique identifier of the parent chat for Unipile.

Can be used to retrieve the parent chat.

provider_id
Unique identifier of the message for the provider.

Can be use to reference the message in the native web app of the provider.

chat_provider_id
Unique identifier of the parent chat for the provider.

Can be use to reference the chat in the native web app of the provider. For exemple, if you need a link "Open chat in LinkedIn".

account_id
Unique identifier of the parent account.

text
Textual body of the message.

Unipile does not support formatted text yet and will return plain text.

attachments
List of attachments.

sender_id
Unique identifier of the sender for the provider.

The format is specific to each provider, it can be a phone number, an email, a username or an ID.

Can be used to match attendees if any. In cases you don't have the attendee, you can still display this sender_id to identify the sender.


timestamp
Provider's server acknowledge datetime.

Can be used as message sent date.


is_sender
Boolean telling if the message sender is the account's user or someone else.

Can be used to design a message bubble.

seen
Per provider support

If is_sender is true, Boolean telling if the message has been seen / read by at least one recipient.

If is_sender is false, Boolean telling if the message has been seen / read by the connected user, which can be the case if the message is get after being seen on another app or device.

seen_by
Per provider support

List of message read receipts.

The key is the provider's user id, and the value can be a boolean telling if the message has been seen / read by this user, or a timestamp telling when it was seen / read.

delivered
Per provider support

Boolean telling if the message has been delivered to the recipient. Note that, depending on the provider, it does not guarantee that it's delivered to the recipient, but only to the provider's server.

hidden
Boolean telling if the message should be hidden in the conversation view.

For exemple, messages of type "John reacted 👍 to your message" are hidden, but visible as last message in chat lists.


deleted
Boolean telling if the message has been deleted.

Can be used to replace the content of a message by a generic "Message deleted"

edited
Per provider support

Boolean telling if the message has been edited.

is_event
Boolean telling the message is not an actual user message, but an event, specified by event_type.

event_type
If is_event is true, the type of event. Unipile support the following events :

A user reacted to a message (1)
A user reacted to owner message (2)
The group was created (3)
The group has changed title (4)
A new participant was added to the group (5)
A participant was removed from the group (6)
A participant left the group (7)
Missed voice call (8)
Missed audio call (9)
Some providers shows other kinds of events. Unipile does not support them yet and will set event_type as 0.

reactions
A list of reactions to the message.

key	value
value	The reaction, 👍 for exemple
sender_id	The provider's user id of who reacted
is_sender	Boolean telling if the reaction was sent by the connected user
quoted
Quoted message details if any.

Note that some providers (ex:WhatsApp) use the term "reply" in their UI, but Unipile prefer to use the term "quote" to distinguish it from threaded replies.


# Send Messages
Learn how to send messages with Unipile

Suggest Edits
Feature available for : LinkedIn, WhatsApp, Instagram, Messenger, Telegram

Send a message in an existing Chat / Group
Use the POST chats/{chat_id}/messages Method or use the appropriate SDK Method, to send a message by providing a chat_id you can find by retrieving chats lists, or when receiving a message to automate replies on Webhook trigger.

cURL
JavaScript

curl --request POST \
     --url https://{YOUR_DSN}/api/v1/chats/9f9uio56sopa456s/messages \
     --header 'X-API-KEY: {YOUR_ACCESS_TOKEN}' \
     --header 'accept: application/json' \
     --header 'content-type: multipart/form-data' \
     --form 'text=Hello world !'
📘
If you want to send a message into an existing chat using an attendee identifier, you can read the next section, but if you have the choice, always prefer the usage of chat_id.

Send a message to a User
There is two cases where you want to send a message to a User instead of in a Chat:

You don't have access to the id of the existing chat
The connected account does not have a conversation history this specific user, so there is no existing chat and you must start a new chat.
To send a message to a User, use the POST /chats Method or the appropriate SDK Method.

In the account_id field, provide the ID of the connected account to send the message from. In the attendees_ids field, give one user's Provider internal ID. Please refer to those guides if you need more informations about Users and how their IDs work.

Users overview
Retrieving users
The method will send a message in a 1 to 1 chat, and:

If the chat does not exist, it will be created, synced, and returned
If the user was not an attendee yet, it will be synced
cURL
SDK Node

curl --request POST \
     --url https://{YOUR_DSN}/api/v1/chats \
     --header 'X-API-KEY: {YOUR_ACCESS_TOKEN}' \
     --header 'accept: application/json' \
     --header 'content-type: multipart/form-data' \
     --form account_id=Yk08cDzzdsqs9_8ds \
     --form 'text=Hello world !' \
     --form attendees_ids=j08dsqQS89QSD \
LinkedIn specific use cases
With Linkedin, unless InMail, you can start new chats only with your Relations. You can use Unipile to invite people to be in your Relations : Send a contact invitation

If you have a Premium LinkedIn account and want to send InMails, set the inmail property to true in the payload. You have to consider the account type of user (with /me route or GET account) to use to good API (classic/recruiter/sales_navigator)

cURL
SDK Node

curl --request POST \
     --url https://{YOUR_DSN}/api/v1/chats \
     --header 'X-API-KEY: {YOUR_ACCESS_TOKEN}' \
     --header 'accept: application/json' \
     --header 'content-type: multipart/form-data' \
     --form account_id=Asdq-j08dsqQS89QSD \
     --form 'text=Hello world !' \
     --form attendees_ids=ACoqsqsqdsqdsdqsdssj08dsqQS89QSD \
     --form linkedin[api]=classic \
     --form linkedin[inmail]=true \
Send attachments
You can provide an additional attachment to the request body to send attachments along your text message.

Limitations may vary depending on the provider, but the standard maximum size is 15MB. You can send documents in PDF, image, or video formats.

cURL

curl --request POST \
     --url https://{YOUR_DSN}/api/v1/chats \
     --header 'X-API-KEY: {YOUR_ACCESS_TOKEN}' \
     --header 'accept: application/json' \
     --header 'content-type: multipart/form-data' \
     --form account_id=ACoqsqsqdsqdsdqsdssj08dsqQS89QSD \
     --form 'text=Hello world !' \
     --form attendees_ids=Asdq-j08dsqQS89QSD \
     --form 'attachments=@C:\Documents\cute_dog.png'
Create a group chat
To start a new group chat, use the POST /chats Method or the appropriate SDK Method and provider a list of user's Provider internal ID in attendees_ids along an optional title for the group name.

Please refer to those guides if you need more informations about Users and how their IDs work.

Users overview
Retrieving users
The chat and its group participants will be synced.

cURL

curl --request POST \
     --url https://{YOUR_DSN}/api/v1/chats \
     --header 'X-API-KEY: {YOUR_ACCESS_TOKEN}' \
     --header 'accept: application/json' \
     --header 'content-type: multipart/form-data' \
     --form account_id=k08cds98ds \
     --form 'text=Hello world !' \
     --form attendees_ids=j08dsqQS89QSD \
     --form attendees_ids=587Dsbcqs75QS \
     --form title=Vacation

# Retrieving messages
Learn how to retrieve messages of your connected accounts.

Suggest Edits
Feature available for : LinkedIn, WhatsApp, Instagram, Messenger, Telegram

Get message history of a chat
To get existing messages in a chat, use the GETchats/{chat_id}/messages Method or the appropriate SDK Method with a valid chat_id.

Most recent messages will be returned first, ordered by date.

By default, the limit of returned messages is set to 100.

cURL
JavaScript

curl --request GET \
     --url https://{YOUR_DSN}/api/v1/chats/{CHAT_ID}/messages \
     --header 'X-API-KEY: {YOUR_ACCESS_TOKEN}' \
     --header 'accept: application/json'
This method use pagination.

Get new messages
Unipile's API give you two options to receive messages in your application

In realtime with Webhooks
The recommended approach to listen for new messages in your application is by using a Webhook because they trigger in real time. Whenever the user account receives or sends a new message, the Webhook will call your specified URL with the given message that you can store to be displayed.

-> More informations on new messages webhooks

With a cron job
If your system cannot handle Webhooks, or if you don't need real time, you can create a cron job calling GET /messages Method at interval.

We advise fetching a larger period than your cron delay to account for any potential disconnects or errors that may result in losing outdated messages. In this case, implementing a unique ID verification on your history entry based on the message ID can help prevent duplicate entries.

Handle new chats
If you receive a message from someone you don't have a chat history with, a new chat is created and you should retrieve it manually as it's not sent by the webhook. Use the chat_id of the message with the GETchats/{id} Method to do so.

# Users overview
Suggest Edits
A user is a provider's user. They are the Attendees in chats.

Identifiers
Users have 2 identifiers:

A Provider internal ID, which is the ID used internally by the provider to identify the user and used in Unipile to reference attendees of resources. For exemple in Message object.

Linkedin (regular user): Last part of the internal profile URL : linkedin.com/in/ACoAAAcDMMQBODyLwZrRcgYhrkCafURGqva0U4E
Each user has a multiple fixed provider ID for Classic, Recruiter and Sales Navigator, they start differently and you need to convert it with get profile route using the right "api" parameter for sending message in each product.:
Sales Navigator: ACw...
Recruiter: AE...
Classic: ACo...
Whatsapp : 33600000000@s.whatsapp.net (The WhatsApp provider's internal ID is deterministic. You can test if a number has WhatsApp by using the GET /users/{identifier} route.)
Instagram: A sequence of numbers like 013456789 (You can get the Instagram provider’s internal ID from a username by using the GET /users/{identifier} route.)
Telegram: A sequence of numbers like 013456789 (You can get the Telegram provider’s internal ID from a username by using the GET /users/{identifier} route.)
X - Twitter : A sequence of numbers like 013456789 (You can get the X provider’s internal ID from a username by using the GET /users/{identifier} route.)
A Provider public ID, which is the public ID used by the users to share their profile. It can be found as:

Linkedin (regular user) : Last part of the public profile URL : linkedin.com/in/julien-crepieux
Linkedin (company) : Last part of the public profile URL : linkedin.com/company/unipile
Whatsapp : Phone number : 33600000000
Instagram: A username : unipile
Telegram: Phone number: 33600000000
X - Twitter: A username : @UnipileApp (with or without the @)
Attendees
Since it's impossible to sync the millions of users of a provider, Unipile only sync "know users" that we call Attendees.

They have an additional identifier, a Unipile ID, which is a unique ID used in Unipile to reference attendees of resources, for exemple in Group Participants.

Unipile consider users as known (therefore as Attendees) if you have a relation with them (through contacts or chats) so you can easily retrieve them from those relational elements. Therefore, they are one of the following

Contacts of the connected account (known as Relations in LinkedIn, known as Friends in Facebook)
Public non-contacts with whom the connected account has an existing chat
Public non-contacts who participate in the same groups as the connected account
Unknown Users
Unknown are all the rest:

Public non-contact without an existing chat
Private users
They become known (therefore a synced Attendee) as soon as you start a chat with them.

# Retrieving users
Suggest Edits
Feature available for : Linkedin, WhatsApp, Instagram, Telegram

Get an Attendee
Once you have chat and messages, you might want to match them with Users. Use the GET /chat_attendees/{id} or GET /chat_attendees API Methods or the appropriate SDK Methods.

Get a User with a public identifier
You can retrieve a user profile, including its Provider Internal ID providing the Provider Public ID by using the GET /users/{provider_public_id} API Method or the appropriate SDK Method.

This can be useful to start new chats with unknown users.

If the user is unknown, this method does not sync the user into Unipile. It's a just a proxy to the provider. This means he will not appear in attendees lists unless you start a new chat with him.

Get a public identifier from an Attendee
For now, public identifiers are not present in Attendees, so you can use the GET /users/{provider_id} Method or the appropriate SDK Method to find it by passing the Provider Internal ID found in Attendees and Messages

Be careful how you implement action GET /users/{provider_id/provider_public_id}, please have a look on Provider limits and restrictions

Example of retrieving a full LinkedIn profile
Using route Retrieve a profile
cURL
Node SDK

curl --request GET \
     --url https://{YOUR_DSN}/api/v1/users/julien-crepieux?linkedin_sections=%2A&account_id=3H-KVe-mQ2GT9M0hKSkgHgs \
     --header 'X-API-KEY: {YOUR_ACCESS_TOKEN}' \
     --header 'accept: application/json' \
Result
JSON

{
	"object": "UserProfile",
	"provider": "LINKEDIN",
	"provider_id": "ACoAAAcDMMQBODyLwZrRcgYhrkCafURGqva0U4E",
	"public_identifier": "julien-crepieux",
	"first_name": "Julien",
	"last_name": "Crepieux",
	"headline": "Co-founder & CEO at Unipile | One API to Enhance your App with Multi-Channel Messaging",
	"primary_locale": {
		"country": "FR",
		"language": "fr"
	},
	"is_open_profile": false,
	"is_premium": true,
	"is_influencer": false,
	"is_creator": true,
	"is_relationship": true,
	"network_distance": "FIRST_DEGREE",
	"is_self": false,
	"websites": [
		"https://www.unipile.com"
	],
	"follower_count": 12801,
	"connections_count": 12541,
	"location": "Riorges, Auvergne-Rhône-Alpes, France",
	"profile_picture_url": "https://media.licdn.com/dms/image/v2/D4D03AQHzFyxxK8jpRg/profile-displayphoto-shrink_100_100/profile-displayphoto-shrink_100_100/0/1692795345827?e=1736380800&v=beta&t=4dob_N5yuQjNW3z9axCR2SB0uy7uSiGhW9DwI3cnapE",
	"profile_picture_url_large": "https://media.licdn.com/dms/image/v2/D4D03AQHzFyxxK8jpRg/profile-displayphoto-shrink_800_800/profile-displayphoto-shrink_800_800/0/1692795345827?e=1736380800&v=beta&t=dFsLL5e26SJ-tex8j1lgmaVcoL0sheCZzyDIT8WtDVs",
	"background_picture_url": "https://media.licdn.com/dms/image/v2/D4E16AQGuyKQrYe6MiQ/profile-displaybackgroundimage-shrink_200_800/profile-displaybackgroundimage-shrink_200_800/0/1700839352634?e=1736380800&v=beta&t=H-QkJv5B8gJYgWupfuxIWTIo08mU79qKq7EAphb0WJM",
	"education": [
		{
			"degree": "Master of Business Administration (MBA) Entrepreneuriat et Management des PMO, Stratégie d'entreprise, Management, Gestion de Projet,",
			"school": "iaelyon School of Management",
			"start": "1/1/2004",
			"end": "1/1/2005"
		},
		{

# Invite users
Suggest Edits
Feature available for : Linkedin

Send an invitation to a User
If your are not in relation with a user you can invite him to connect.

To send an invitation to a User, use the POST /users/invite Method or the appropriate SDK Method.

In the account_id field, provide the ID of the connected account to send the message from. In the provider_id field, give one user's Provider internal ID. Please refer to those guides if you need more informations about Users and how their IDs work.

Users overview
Retrieving users
Please have a look on Provider limits and restrictions

Example of Inviting Someone on LinkedIn
You need to have already connected your LinkedIn account to proceed with this request. Make sure to use the account_id in each request. Note that you can't use a new account for testing, as LinkedIn restricts sending invitations from accounts with low connection history or engagement.

Step 1 - Convert Public ID to Provider ID
For instance, if you want to invite this profile: https://www.linkedin.com/in/julien-crepieux/ , you should use only the last part of the URL in the Retrieve a profile route

cURL
Node SDK

curl --request GET \
     --url https://{YOUR_DSN}/api/v1/users/julien-crepieux?account_id=3H-KVe-mQ2GT9M0hKSkgHgs \
     --header 'X-API-KEY: {YOUR_ACCESS_TOKEN}' \
     --header 'accept: application/json' 
The response will include the profile information, and you need to collect the provider_id (ACoAAAcDMMQBODyLwZrRcgYhrkCafURGqva0U4E) for the next step. For example:

JSON

{
	"object": "UserProfile",
	"provider": "LINKEDIN",
	"provider_id": "ACoAAAcDMMQBODyLwZrRcgYhrkCafURGqva0U4E",
	"public_identifier": "julien-crepieux",
	"first_name": "Julien",
	"last_name": "Crepieux",
   [...]
}
Step 2 - Send the invitation
Now that you have the provider_id, you can proceed to send the invitation

cURL
Node SDK

curl --request POST \
     --url https://{YOUR_DSN}/api/v1/users/invite \
     --header 'X-API-KEY: {YOUR_ACCESS_TOKEN}' \
     --header 'accept: application/json' \
     --header 'content-type: application/json' \
     --data '{
    	"provider_id": "ACoAAAcDMMQBODyLwZrRcgYhrkCafURGqva0U4E",
    	"account_id": "tvKrFOnCQEeTTpO3GNklng",
        "message": "Hello\nWorld"
    }'

# Email object
This section will explain in detail each field of the email object so you can properly integrate them in your application

Suggest Edits
object
Fixed value "Email"

id
Unique identifier of the email for Unipile.

Can be used to prevent duplicate entries.

account_id
Unique identifier of the parent account.

date
Provider's server acknowledge datetime.

from_attendee
Information on the sender

from_attendee.display_name
Name set by the sender

from_attendee.identifier
Email of the sender

from_attendee.identifier_type
Fixed value "EMAIL_ADDRESS

to_attendees
List of "to" recipients of email

to_attendees.display_name
Name of recipient set by the sender

to_attendees.identifier
Email of the recipient

to_attendees.identifier_type
Fixed value "EMAIL_ADDRESS

cc_attendees
List of "cc" recipients of email

cc_attendees.display_name
Name of recipient set by the sender

cc_attendees.identifier
Email of the recipient

cc_attendees.identifier_type
Fixed value "EMAIL_ADDRESS

bcc_attendees
List of "bcc" recipients of email

bcc_attendees.display_name
Name of recipient set by the sender

bcc_attendees.identifier
Email of the recipient

bcc_attendees.identifier_type
Fixed value "EMAIL_ADDRESS

reply_to_attendees
List of "reply_to" of email

reply_to_attendees.display_name
Name of recipient set by the sender

reply_to_attendees.identifier
Email of the recipient

reply_to_attendees.identifier_type
Fixed value "EMAIL_ADDRESS"

provider_id
Json of provider value, ex : {"message_id":"D8.08.07528.0034A846(A)hs.mta1vrest.cc.prd.sparkpost","uid":"AQMkADAwATM3ZmYAZS04YjYyLTkzMwA4LTAwAi0wMAoARgAAA6SPCWnzzEdJj0W3b32H3c8HAPXMsqSCUH9FpzZzxeMbKMQAAAIBDAAAAPXMsqSCUH9FpzZzxeMbKMQABHfkN3EAAAA="}

subject
Subject of the email.

body
Content of the email.

body_plain
Text content of the email.

has_attachments
Boolean, true if have attachment

attachments
List of attachments

attachments.id
Unique identifier of the attachment

attachments.name
Name of the attachment, including extension

attachments.extension
Extension of the attachment

attachments.size
Size of the attachment in bytes

attachments.mime
Mime type of the attachment

folders
Folders of the email

role
Role of the folder of the email

read_date
Date of first API get email

is_complete
Status of email fetching

headers
Headers of the email if requested

headers.name
Name of the header

headers.value
Value of the header

# Send Email
Learn how to send messages with Unipile

Suggest Edits
Feature available for : Google, Microsoft, IMAP

Send an email
Use the POST emails Method or use the appropriate SDK Method, to send an email to every recipient.

cURL
JavaScript

curl --request POST \
  --url https://{YOUR_DSN}/api/v1/emails \
  --header 'Content-Type: multipart/form-data' \
  --header 'X-API-KEY: {YOUR_ACCESS_TOKEN}' \
  --form account_id=kzAxdybMQ7ipVxK1U6kwZw \
  --form 'subject=Hello from Unipile' \
  --form 'body=Hello, this is a test email from Unipile' \
  --form 'to=[
	{
		"display_name": "John Doe",
		"identifier": "john.doe@gmail.com"
	}
]' \
  --form 'cc=[
	{
		"display_name": "Jane Doe",
		"identifier": "jane.doe@gmail.com"
	}
]' \
Send attachments
You can provide an additional attachment to the request body to send attachments along your email.

cURL
JavaScript

curl --request POST \
  --url https://{YOUR_DSN}/api/v1/emails \
  --header 'Content-Type: multipart/form-data' \
  --header 'X-API-KEY: {YOUR_ACCESS_TOKEN}' \
  --form account_id=kzAxdybMQ7ipVxK1U6kwZw \
  --form 'subject=Hello from Unipile' \
  --form 'body=Hello, this is a test email from Unipile' \
  --form 'to=[
	{
		"display_name": "John Doe",
		"identifier": "john.doe@gmail.com"
	}
]' \
  --form 'attachments=@C:\Documents\cute_dog.png'
Send with custom headers
You can set additional custom headers using the "X-" syntax.

cURL
JavaScript

curl --request POST \
  --url https://{YOUR_DSN}/api/v1/emails \
  --header 'Content-Type: multipart/form-data' \
  --header 'X-API-KEY: {YOUR_ACCESS_TOKEN}' \
  --form account_id=kzAxdybMQ7ipVxK1U6kwZw \
  --form 'subject=Hello from Unipile' \
  --form 'body=Hello, this is a test email from Unipile' \
  --form 'to=[
	{
		"display_name": "John Doe",
		"identifier": "john.doe@gmail.com"
	}
]' \
  --form 'cc=[
	{
		"display_name": "Jane Doe",
		"identifier": "jane.doe@gmail.com"
	}
]' \
  --form 'custom_headers=[
    {
      "name": "X-My-Custom-Header",
      "value": "Example value"
    }]'
Reply to an email
You can set additional parameter "reply_to" with unipile internal "id" of email

cURL

curl --request POST \
  --url https://{YOUR_DSN}/api/v1/emails \
  --header 'Content-Type: multipart/form-data' \
  --header 'X-API-KEY: {YOUR_ACCESS_TOKEN}' \
  --form account_id=kzAxdybMQ7ipVxK1U6kwZw \
  --form 'subject=Re:Hello from Unipile' \
  --form 'body=Hello, this is a test reply from Unipile' \
  --form 'to=[
	{
		"display_name": "John Doe",
		"identifier": "john.doe@gmail.com"
	}
]' \
  --form 'reply_to=X4R9___qXQKIu80oAF0lJA
Personalize "from"
You can set additional parameter "from" with your display name and/or alias configured on your provider.

cURL

curl --request POST \
  --url https://{YOUR_DSN}/api/v1/emails \
  --header 'Content-Type: multipart/form-data' \
  --header 'X-API-KEY: {YOUR_ACCESS_TOKEN}' \
  --form account_id=kzAxdybMQ7ipVxK1U6kwZw \
  --form 'subject=Hello from Unipile' \
  --form 'body=Hello, this is a test email from Unipile' \
   --form 'from={
		"display_name": "Jake Doe",
		"identifier": "myalias.doe@gmycompany.com"
	}' \
  --form 'to=[
	{
		"display_name": "John Doe",
		"identifier": "john.doe@gmail.com"
	}
]' \
  --form 'cc=[
	{
		"display_name": "Jane Doe",
		"identifier": "jane.doe@gmail.com"
	}
]' \
Tracking options
You can receive a webhook when an email is read or a link is clicked.

cURL
JavaScript

curl --request POST \
  --url https://{YOUR_DSN}/api/v1/emails \
  --header 'Content-Type: multipart/form-data' \
  --header 'X-API-KEY: {YOUR_ACCESS_TOKEN}' \
  --form account_id=kzAxdybMQ7ipVxK1U6kwZw \
  --form 'subject=Hello from Unipile' \
  --form 'body=Hello, this is a test email from Unipile' \
  --form 'to=[
	{
		"display_name": "John Doe",
		"identifier": "john.doe@gmail.com"
	}
]' \
  --form 'cc=[
	{
		"display_name": "Jane Doe",
		"identifier": "jane.doe@gmail.com"
	}
]' \
  --form 'tracking_options={
  "opens": true,
	"links": true,
	"label": "myownid"
}'

# Retrieving emails
Learn how to retrieve messages of your connected accounts.

Suggest Edits
Feature available for : Google, Microsoft, IMAP

Get emails history
To get existing emails, use the GETemails Method or the appropriate SDK Method .

Most recent messages will be returned first, ordered by date.

By default, the limit of returned messages is set to 100.

You can use lot of parameters to get only a folder, date, recipient, sender, see GETemails

cURL
JavaScript

curl --request GET \
     --url https://{YOUR_DSN}/api/v1/emails \
     --header 'X-API-KEY: {YOUR_ACCESS_TOKEN}' \
     --header 'accept: application/json'
     --data '
{
  "account_id": "5D586za6a-aAaasqXX",
  "limit": 10
}
'
This method use pagination.

Get new emails
Unipile's API give you two options to receive emails in your application

In realtime with Webhooks
The recommended approach to listen for new messages in your application is by using a Webhook because they trigger in real time. Whenever the user account receives or sends a new email, the Webhook will call your specified URL with the given email that you can store to be displayed.

-> More informations on new emails webhooks

With a cron job
If your system cannot handle Webhooks, or if you don't need real time, you can create a cron job calling GET /emails Method at interval.

We advise fetching a larger period than your cron delay to account for any potential disconnects or errors that may result in losing outdated emails. In this case, implementing a unique ID verification on your history entry based on the email ID can help prevent duplicate entries.

