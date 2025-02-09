# OAuth for Mail360
Mail360 uses the O-auth (Open Authorization) standard and allows you to authorize your API requests. The Oauth protocol facilitates application owners to securely share their resources with third party applications without having to compromise their credentials.

OAuth overview :
When using OAuth, the client can access the required data using access tokens, without using the user credentials directly. These tokens contain information about the scope of the access, duration of the access and so on. This token is issued by the authorization server after verifying that the request has been made by a legitimate party. The client can then use this token to access the data they need using APIs :

Let us look at an example of how this works :

The application owner, creating an application based on Mail360, signs up for an account.
The owner then generates Client ID, Client Secret.
Next, the owner generates a refresh token. This token can access data that falls under the specific scopes they have selected.
In Mail360's REST API, the Access tokens can be generated based on these Refresh tokens.
The access tokens have a expiry period, after which they need to be regenerated and used. This will ensure that the data is securely accessed using the valid credentials.
Generating Client id and Client secret in Mail360 
You can generate your client id and client secret for your application directly within your Mail360 account.

Login to your Mail360 account.
Navigate to the Authentication section in the left pane. Click the Generate option to generate your client id and client secret.
You will be able to view both the credentials at the top of the section.
These credentials are common for all scope.
Generating refresh token 
The Refresh token can be generated in the UI directly. 

Click the Generate button in the refresh token section.
In the Generate refresh token pop-up, select the scopes you would like to generate the refresh token for. Click Add to include the scopes.
Next, you will be taken to the Zoho accounts page. Click Accept to authorize the action. The refresh token will be generated.
You can generate multiple refresh tokens for different set of scopes depending on your requirement.
A total of 10 refresh tokens can be generated.
Using OAuth to access APIs 
You can generate your access tokens using Refresh token by calling the API given below :

Request URL 
https://mail360.zoho.com/api/access-token

Request body
Parameter	Type	Description
client_id	String	Client id generated for the app in Mail360
client_secret	String	Client secret associated with the app in Mail360
refresh_token	String	Refresh token generated previously for which the access token is required.
The access token will be available for a period of 3600 seconds.

Sample request
curl "https://mail360.zoho.com/api/access-token" \
-X POST \
-H "Accept: application/json" \
-H "Content-Type: application/json" \
-d '{
    "refresh_token": "****",
    "client_id": "****",
    "client_secret": "****"
}'
Sample response
{
"status": {
"code":200,
"description":"success"
},
"data": {
"access_token":"73639377.44f1e7513097d484c88750860f9adef7.c9cadb4f21291d6e4ef8a35622a8bec5",
"expires_in_sec":3600
}

# Add a Native Account
Purpose 
This API is used to add a new account as a native account in Mail360. Native accounts are email accounts hosted within Mail360.

OAuth Scope
Use the scope

MailApps.accounts.ALL (or) MailApps.accounts.CREATE

ALL - Full access to the accounts.

CREATE - Add a new account.

To generate Authtoken, refer here.

Request URL
Method: POST

https://mail360.zoho.com/api/accounts

Request Body (JSON object)
emailid* string
This is the new email address that needs to be created within a domain that has been verified in Mail360.
accountType* integer
This refers to the type of account to be added.
Provide the value as 1 to create a native account.
 

* - Mandatory parameter

Sample Request
curl "https://mail360.zoho.com/api/accounts" \
-X POST \
-H "Accept: application/json" \
-H "Content-Type: application/json" \
-H "Authorization:Zoho-oauthtoken ***" \
-d '{
    "displayName": "Paula",
    "accountType": "1",
    "emailid": "paula.m@zylker.com"
}'
Sample Response
{
  "status": {
    "code": 200,
    "description": "success"
  },
  "data": {
    "account_key": "M0BS3O****"
  }
}

OAuth for Mail360
Accounts
POSTAdd native account
POSTAdd sync account
POSTAdd sync account using OAuth flow
GETGet all accounts
GETGet specific account
PUTEnable account
PUTDisable account
PUTUpdate password
DELETEDelete account
Messages
Attachments
Folders
Labels
Drafts
Templates
Threads

# Add a Sync Account
Purpose 
This API is used to add an account as a sync account in Mail360. Sync accounts in Mail360 are email accounts from third-party providers that are synced via IMAP for access through Mail360 APIs.

OAuth Scope
Use the scope

MailApps.accounts.ALL (or) MailApps.accounts.CREATE

ALL - Full access to the accounts.

CREATE - Add a new account.

To generate Authtoken, refer here.

Request URL
Method: POST

https://mail360.zoho.com/api/accounts

Request Body (JSON object)
emailid* string
This is the email ID of the account to be added as a sync account.
accountType* integer
This refers to the type of account to be added.
Provide the value as 2 to create a sync account.
displayName string
This is the short name to be used to identify the account.
incomingUser* string
This is the username or email id of the sync account.
incomingPasswd* string
This is the password or app-specific password to access the sync account through IMAP.
incomingServer* string
This is the host name of the IMAP server.
incomingServerPort* integer
This is the port detail of the IMAP server.
sslEnabled boolean
This is an optional parameter that will be decided based on the given port number itself.
The possible value can be
true - to connect with SSL.
false - to not connect with SSL.
startTls boolean
The possible value can be
true - if you want to use TLS.
false - if you do not want to use TLS.
gmailTypeSync  boolean
This parameter is applicable for Gmail accounts when sync needs to be based on labels.
The possible value can be
true - if sync should be based on labels.
false - if sync doesn't need to be based on labels
syncFromDate string
This is the timestamp value of the date from which the mail should be synced.
outgoingServer* string
This is the SMTP hostname of the email server.
outgoingServerPort* integer
This is the SMTP port number.
smtpConnection* integer
This is the connection mode to add the account.
The possible value can be
0 - PLAIN
1 - SSL
2 - TLS
outgoingUser* string
This is the username that should be used for the SMTP connection.
outgoingPasswd* string
This is the password to be used for the SMTP connection.
saveSentCopy integer
The value of this parameter determines whether to save a copy of sent mail in Mail360 storage or not.
The possible value can be
0 - Do not save sent emails.
1 - Save sent emails
 

* - Mandatory parameter

Sample Request
curl "https://mail360.zoho.com/api/accounts" \
-X POST \
-H "Accept: application/json" \
-H "Content-Type: application/json" \
-H "Authorization:Zoho-oauthtoken ***" \
-d '{
    "emailid":"rebecca@gmail.com",
    "accountType":"2",
    "incomingUser":"***@gmail.com",
    "incomingPasswd":"********",
    "incomingServer":"imap.gmail.com",
    "incomingServerPort":"993",
    "isCustomSmtp":"true",
    "outgoingServer":"smtp.gmail.com",
    "outgoingServerPort":"465",
    "smtpConnection":"1",
    "outgoingAuth":"true",
    "outgoingUser":"***@gmail.com",
    "outgoingPasswd":"*******",
    "gmailTypeSync": "true"
}'
Sample Response
{
  "status": {
    "code": 200,
    "description": "success"
  },
  "data": {
    "account_key": "M0BS3O****"
  }
}

# Add a sync account using OAuth
Purpose 
This API is used to add a sync account in Mail360 using Oauth flow. Before adding an account via OAuth, connectors must be configured.

OAuth Scope
Use the scope

MailApps.accounts.ALL (or) MailApps.accounts.CREATE

ALL - Full access to the accounts.

CREATE - Add a new account through OAuth.

To generate Authtoken, refer here.

Request URL
Method: POST

https://mail360.zoho.com/api/accounts/oauth

Request Body (JSON object)
hintEmail* string
This is the email ID of the account to be added as a sync account.
displayName string
This is the short name to be used to identify the account.
mailProvider* string
This is the email provider name for which a connector is created.
rUrl* string
This is the URL to which redirection needs to be done after authentication.
gmailTypeSync  boolean
This parameter is applicable for Gmail accounts, determining the type of sync (based on labels).
The possible value can be
true - if sync should be based on labels.
false - if sync should not be based on labels
syncFromDate string
This is the timestamp value of the date from which the mail should be synced.
saveSentCopy integer
The value of this parameter determines whether to save a copy of sent mail in Mail360 storage or not.
The possible value can be
0 - Do not save sent emails.
1 - Save sent emails
 

* - Mandatory parameter

Sample request
curl "https://mail360.zoho.com/api/accounts/oauth" \
-X POST \
-H "Accept: application/json" \
-H "Content-Type: application/json" \
-H "Authorization:Zoho-oauthtoken ***" \
-d '{
 "hintEmail":"tst@gmail.com",
 "mailProvider":"test",
 "rUrl":"https://app.login.callback/we232sas"
}'

Sample response
{
  "status": {
    "code": 200,
    "description": "success"
  },
  "data": {
    "success": true,
    "url": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?prompt=select_account&access_type=offline&scope=https://outlook.office.com/IMAP.AccessAsUser.All+https://outlook.office.com/POP.AccessAsUser.All+https://outlook.office.com/SMTP.Send+https://outlook.office.com/User.Read+https://outlook.office.com/Mail.ReadWrite.Shared+offline_access&response_type=code&redirect_uri=https://****/v2/redirect&state=98686Mo80B5kb9Ru4cc0b87Me8T04RceqR0Jc00K4JSLdT6kdT0791f7Az3rfLk82vC67c19ET8b3cc880206A700rb8687Me66h6wkb877Xb8689Agi795c0Kx970fk0820MQKx6GcbS84Mee0630c9Of1r700B0w6lh919b6ll9wlTC02R0I670Fc06m1was8t1dG8J95rO8d0846uc94Tgc997i6y8e9b&client_id=f7831120-6686-44fe-9d71-7b69c756a58c&login_hint=*****@outlook.com"
  }
}

# Get specific account
Purpose F
This API is used to retrieve a specific account added in Mail360 using the account key.

OAuth Scope
Use the scope

MailApps.accounts.ALL (or) MailApps.accounts.READ

ALL - Full access to the accounts.

READ - Read the specific account.

To generate Authtoken, refer here.

Request URL
Method: GET

https://mail360.zoho.com/api/accounts/{account_key}

Path Parameters
account_key* string
This key is used to identify the account. It is generated during account addition.
 

* - Mandatory parameter

Sample request
curl "https://mail360.zoho.com/api/accounts/C7T**aEzxN" \
-X GET \
-H "Accept: application/json" \
-H "Content-Type: application/json" \
-H "Authorization:Zoho-oauthtoken ***"
Sample Response
{
  "status": {
    "code": 200,
    "description": "success"
  },
  "data": {
    "account_key": "B0l04wc0S8M",
    "ac": [
      {
        "emailAddress": "paula@gmail.com",
        "displayName": "Paula",
        "type": "IMAP_ACCOUNT",
        "enabled": true,
        "isOAuthAcc": false,
        "incomingBlocked": false,
        "outgoingBlocked": false
      }
    ]
  }
}

# Enable an account
Purpose 
This API is used to enable an existing account.

OAuth Scope
Use the scope

MailApps.accounts.ALL (or) MailApps.accounts.UPDATE

ALL - Full access to the accounts.

UPDATE -To enable an existing account.

To generate Authtoken, refer here.

Request URL
Method: PUT

https://mail360.zoho.com/api/accounts/{account_key}

Path Parameters
account_key* string
This key is used to identify the account. It is generated during account addition.
Request Body (JSON object)
mode* string
This parameter represents the type of operation that is to be performed.
Provide the value as enableAccount.
 

* - Mandatory parameter

Sample request
curl "https://mail360.zoho.com/api/accounts/N7A**C0CM" \
-X PUT \
-H "Accept: application/json" \
-H "Content-Type: application/json" \
-H "Authorization:Zoho-oauthtoken ***" \
-d '{
"mode":"enableAccount"
}'
Sample response
{
   "status": {
       "code": 200,
       "description": "success"
  }
}

# Disable an account
Purpose 
This API is used to disable an existing account.

OAuth Scope
Use the scope

MailApps.accounts.ALL (or) MailApps.accounts.UPDATE

ALL - Full access to the accounts.

UPDATE -To disable an existing account.

To generate Authtoken, refer here.

Request URL
Method: PUT

https://mail360.zoho.com/api/accounts/{account_key}

Path Parameters
account_key* string
This key is used to identify the account. It is generated during account addition.
Request Body (JSON object)
mode* string
This parameter represents the type of operation that is to be performed.
Provide the value as disableAccount.
 

* - Mandatory parameter

Sample request
curl "https://mail360.zoho.com/api/accounts/N7A**C0CM" \
-X PUT \
-H "Accept: application/json" \
-H "Content-Type: application/json" \
-H "Authorization:Zoho-oauthtoken ***" \
-d '{
"mode":"disableAccount"
}'
Sample response
{
  "status": {
    "code": 200,
    "description": "success"
  }
}

# Update password
Purpose 
This API is used to change the password of an existing account.

OAuth Scope
Use the scope

MailApps.accounts.ALL (or) MailApps.accounts.UPDATE

ALL - Full access to the accounts.

UPDATE -To update an existing account password.

To generate Authtoken, refer here.

Request URL
Method: PUT

https://mail360.zoho.com/api/accounts/{account_key}

Path Parameters
account_key* string
This key is used to identify the account. It is generated during account addition.
Request Body (JSON object)
mode* string
This parameter represents the type of operation that is to be performed.
Provide the value as updatePassword.
newPassword* string
This is the new password that needs to be updated.
 

* - Mandatory parameter

Sample request
curl "https://mail360.zoho.com/api/accounts/N7A**C0CM" \
-X PUT \
-H "Accept: application/json" \
-H "Content-Type: application/json" \
-H "Authorization:Zoho-oauthtoken ***" \
-d '{
"mode":"updatePassword"
"newPassword":"Rebecca@123"
}'
Sample response
{
 "status": {
       "code": 200,
       "description": "success"
   }
}

# Delete an account
Purpose 
This API is used to delete an account.

OAuth Scope
Use the scope

MailApps.accounts.ALL (or) MailApps.accounts.DELETE

ALL - Full access to the accounts.

DELETE -To delete an account.

To generate Authtoken, refer here.

Request URL
Method: DELETE

https://mail360.zoho.com/api/accounts/{account_key}

Path Parameters
account_key* string
This key is used to identify the account. It is generated during account addition.
 
* - Mandatory parameter

Sample request
curl "https://mail360.zoho.com/api/accounts/GaK**wc05r" \
-X DELETE \
-H "Accept: application/json" \
-H "Content-Type: application/json" \
-H "Authorization:Zoho-oauthtoken ****" \
Sample response
{
  "status": {
    "code": 200,
    "description": "success"
  }
}

# Send an Email
Purpose
This API is used to send an email.

OAuth Scope
Use the scope

MailApps.messages.ALL (or) MailApps.messages.CREATE

ALL - Full access to the messages.

CREATE - Create a new email.

To generate Authtoken, refer here.

Request URL
Method: POST

https://mail360.zoho.com/api/accounts/{account_key}/messages

Path Parameters
account_key* string
This key is used to identify the account from which the email is sent. It is generated during account addition.
This parameter can be retrieved using the Get All Accounts API.
Request Body (JSON object)
fromAddress* string
Provide the sender's email address.
toAddress* string
Provide the recipient's email address.
ccAddress string
Provide the recipient's email address for the Cc field.
bccAddress string
Provide the recipient's email address for the Bcc field.
subject string
Provide the subject of the email.
content string
Provide the content of the email.
mailFormat string
Specify the format in which the mail needs to be sent. The value can be
html
plaintext
The default value is html.
inReplyTo string
Specifies the email address to which the recipients should reply.
refHeader string
Specifies the reference header.
attachments Array of JSON objects
This parameter is an array consisting of JSON objects.
Each object in this array contain a key-value pair formatted as: "fileId" : "sampleID". The key, fileId, is constant across all objects. The value associated with fileId signifies the ID of the file that has been uploaded as an attachment and is of the string data type. This value can be obtained from Upload attachment API.
 

To Schedule an Email:
With this API you can also schedule when to send your email. To schedule an email, follow the same procedure as above along with the upcoming additional parameters.

isSchedule boolean
Depending on whether the mail has to be scheduled or not, the value can be
true - if the email should be scheduled.
false - if the email should be sent immediately.          
scheduleType int
Specifies the type of scheduling.
Provide the value as 
6, to choose the custom date and time of your choice.
timeZone string
Specify the timezone to schedule your email.
This parameter is mandatory if scheduleType is set to value 6. For example: GMT 5:30 (India Standard Time - Asia/Calcutta).
scheduleTime string
Specify the date and time you want to schedule your email. 
This parameter is mandatory if scheduleType is set to value 6. Format: MM/DD/YYYY HH:MM:SS. For example: 09/15/2023 14:30:28
 

* - Mandatory parameter

Note:

While the Messages APIs focus on individual messages, the Threads APIs deal with entire conversation threads, each of which contains multiple messages.

Sample Request
curl "https://mail360.zoho.com/api/accounts/x7**0s/messages" \
-X POST \
-H "Accept: application/json" \
-H "Content-Type: application/json" \
-H "Authorization:Zoho-oauthtoken 8024329**d5ac77" \
-d '{
    "subject": "Hello",
    "content": "Hello from Mail 360",
    "fromAddress": "rebecca@gmail.com",
    "toAddress": "paula@zylker.com",
     "attachments" : [ 
        {
            "fileId" : "745ace**-ent"
        }
    ]
}'
Sample Success Response
{
    "status": {
        "code": 200,
        "description": "success"
    },
    "data": {
        "messageId": "1586437732559010001",
        "fromAddress": "rebecca@zylker.com",
        "toAddress": "paula@zylker.com",
        "subject": "Hello"
    }
}
Sample Failure Response
{
    "status": {
        "code": 500,
        "description": "Internal Error"
    },
    "data": {
        "moreInfo": "Internal Error"
    }
}

# Send Reply
Purpose
This API is used to reply to an email.

OAuth Scope
Use the scope

MailApps.messages.ALL (or) MailApps.messages.CREATE

ALL - Full access to the messages.

CREATE - Create a reply email.

To generate Authtoken, refer here.

Request URL
Method: POST

https://mail360.zoho.com/api/accounts/{account_key}/messages/{messageId}

Path Parameters
account_key* string
This is the unique key to identify a specific account. It is generated during account addition.
This parameter can be fetched from Get all accounts API.
messageId* string
This is the unique key used to identify a specific email.
Request Body (JSON object)
fromAddress* string
Provide the sender's email address.
ccAddress string
Provide the recipient's email address for Cc.
bccAddress string
Provide the recipient's email addresses for Bcc.
action* string
Specifies the type of email-related action that should be performed on the message.
The possible values can be:
reply - specifies that the user intends to respond only to the sender of the original message.
replyall - specifies that the user wishes to respond to both the sender and all other recipients of the original message.
forward - specifies that the user wants to forward the original message to a new recipient or group of recipients.
toAddress* string
Provide the recipient's email address.
This parameter becomes mandatory when the value of the action is set to forward.
subject string
Provide the subject of the email.
content string
Provide the content of the email.
mailFormat string
Specify the format in which the mail needs to be sent. The value can be
html
plaintext
The default value is html.
inReplyTo string
Provide the email address to which the recipients should reply.
refHeader string
Specifies the reference header.
attachments Array of JSON objects
This parameter is an array consisting of JSON objects.
Each object in this array contain a key-value pair formatted as: "fileId" : "sampleID". The key, fileId, is constant across all objects. The value associated with fileId signifies the ID of the file that has been uploaded as an attachment and is of the string data type. This value can be obtained from Upload attachment API.
 

To Schedule an Email Reply:
With this API you can also schedule when to send your email reply. To schedule an email reply, follow the same procedure as above along with the upcoming additional parameters.

isSchedule boolean
Depending on whether the mail has to be scheduled or not, the value can be
true - if the email should be scheduled.
false - if the email should be sent immediately.          
scheduleType int
Specifies the type of scheduling.
Provide the value as 
6, to choose the custom date and time of your choice.
timeZone string
Specify the timezone to schedule your email.
This parameter is mandatory if scheduleType is set to value 6. For example: GMT 5:30 (India Standard Time - Asia/Calcutta).
scheduleTime string
Specify the date and time you want to schedule your email. 
This parameter is mandatory if scheduleType is set to value 6. Format: MM/DD/YYYY HH:MM:SS. For example: 09/15/2023 14:30:28
 

* - Mandatory parameter

Note:

While the Messages APIs focus on individual messages, the Threads APIs deal with entire conversation threads, each of which contains multiple messages.

Sample request - Action : reply/replyall/forward
curl "https://mail360.zoho.com/api/accounts/x7**00s/messages/167**01" \
-X POST \
-H "Accept: application/json" \
-H "Content-Type: application/json" \
-H "Authorization:Zoho-oauthtoken 802432953.3e6146aa6bb42b3a1076454603fa7090.f4c5c6f05d0fa481454ecf321f04fd6c" \
-d '{
    "fromAddress":"paul@zylker.com",
    "content":"This is a test reply.",
    "subject":"Re: test reply",
    "action":"replyall"
}'

# List All Emails in a Folder
Purpose
This API lists all emails in a specified folder of an account.

OAuth Scope
Use the scope

MailApps.messages.ALL (or) MailApps.messages.READ

ALL - Full access to the messages.

READ - Read emails.

To generate Authtoken, refer here.

Request URL
Method: GET

https://mail360.zoho.com/api/accounts/{account_key}/messages

Path Parameters
account_key* string
This key is used to identify the account from which the emails have to be retrieved. It is generated during account addition.
This parameter can be fetched from Get all accounts API.
Query Parameters
folderId  long
This parameter specifies the folder ID of the folder from which the emails need to be retrieved. 
This can be fetched using the Get all folders API.
start int
This parameter specifies the starting sequence number of the emails to be retrieved.
The default value is 1.
limit int
This parameter specifies the number of emails to be retrieved from the start value mentioned.
The value can be between 1 to 200.
The default value is 10.
flagid int
Provide the flag ID to retrieve emails based on the specific flag.
The value can be between 0 to 9.
The default value is 0.
labelId long
Provide the label ID to retrieve emails based on the specific label.
The default value is 0.
sortorder boolean
This parameter specifies the sort order of the retrieved list, allowing you to indicate whether ascending or descending order is required.
The value can be 
true, for ascending order 
false, for descending order
The default value is false.
includesent boolean
This parameter allows you to indicate whether sent emails need to be included or not on the list of emails retrieved.
The value can be 
true, to include sent emails
false, to not include sent emails.
The default value is false.
sortBy string
This parameter specifies on which basis the sorting of the list of emails should be done.
The values can be 
date 
messageId 
size
The default value is date.
status string
Provide this parameter to retrieve emails by read or unread status. 
The value can be 
read
unread
attachedMails boolean
Provide this parameter to retrieve only the emails with attachments.  
The value can be 
true, to retrieve the emails with attachments. 
false, to retrieve all emails.
The default value is false.
inlinedMails boolean
Provide this parameter to retrieve only the emails with inline images. 
The value can be 
true, to retrieve the emails with inline images. 
false, to retrieve all emails.
The default value is false.
flaggedMails boolean
Provide this parameter to retrieve only flagged emails. 
The value can be 
true, to retrieve flagged emails.
false, to retrieve all emails.
The default value is false.
respondedMails boolean
Provide this parameter to retrieve only emails with replies.
The value can be 
true, to retrieve emails with replies.
false, to retrieve all emails.
The default value is false.
 

* - Mandatory parameter

Note:

While the Messages APIs focus on individual messages, the Threads APIs deal with entire conversation threads, each of which contains multiple messages.

Sample request
curl "https://mail360.zoho.com/api/accounts/Gcc**CM/messages?folderId=293**002014" \
-X GET \
-H "Accept: application/json" \
-H "Authorization:Zoho-oauthtoken ***" 
Sample response
{
    "status": {
        "code": 200,
        "description": "success"
    },
    "data": [
        {
            "summary": "Email recovery status - Success Hello Rebecca. The email recovery initiated for the account rebecca@zylker.com has been completed. The deleted emails were recovered to the folder deleted. Do not hesitate to write to us at support@zohomail.com in ca",
            "sentDateInGMT": "1551307312000",
            "calendarType": 0,
            "subject": "Email recovery - Consolidated status for rebecca@zylker.com",
            "messageId": "1586349970129010002",
            "flagid": "flag_not_set",
            "status2": "0",
            "priority": "3",
            "hasInline": "true",
            "toAddress": "<admin@zm.m100.org>",
            "folderId": "2452000000003161",
            "ccAddress": "Not Provided",
            "hasAttachment": "0",
            "size": "1640",
            "sender": "noreply@zohosmtpin.india.adventnet.com",
            "receivedTime": "1551327112000",
            "fromAddress": "noreply@zohosmtpin.india.adventnet.com",
            "status": ""
        }
    ]
}

# List Emails Based on Search Key
Purpose
This API lists all the emails that match the specified search parameter.

OAuth Scope
Use the scope

MailApps.messages.ALL (or) MailApps.messages.READ

ALL - Full access to the messages.

READ - Read emails.

To generate Authtoken, refer here.

Request URL
Method: GET

https://mail360.zoho.com/api/accounts/{account_key}/messages/search

Path Parameters
account_key*string
This key is used to identify the account from which the emails have to be retrieved. It is generated during account addition.
This parameter can be fetched from Get all accounts API.
Query Parameters
emailId*string
This parameter specifies the email IDs for which the search needs to be performed. 
Values should be provided as email addresses separated by commas.
startint
This parameter specifies the starting sequence number of the emails to be retrieved.
The default value is 1.
limitint
This parameter specifies the number of emails to be retrieved from the start value mentioned.
The value can be between 1 to 200.
The default value is 10.
mailQrystring
This parameter specifies the particular data to search for.
The possible value can be sender, sendername, to, cc, bcc, senddate, receiveddate, content, subject, hasattach, folderid, flagid, hasinline, threadid, attachid, attachlabel, attachtype, attachname.
dateRange string
This parameter specifies the time frame for retrieving emails.
Format : startDate:endDate
Example:31-Dec-1969:13-May-2024
 

* - Mandatory parameter

Note:

While the Messages APIs focus on individual messages, the Threads APIs deal with entire conversation threads, each of which contains multiple messages.

# Get a Specific Email
Purpose
This API is used to retrieve a specific email using the message ID.

OAuth Scope
Use the scope

MailApps.messages.ALL (or) MailApps.messages.READ

ALL - Full access to the messages.

READ - Read emails.

To generate Authtoken, refer here.

Request URL
Method: GET

https://mail360.zoho.com/api/accounts/{account_key}/messages/{messageId}

Path Parameters
account_key* string
This key is used to identify the account from which the emails have to be retrieved. It is generated during account addition.
This parameter can be fetched from Get all accounts API.
messageId* long
This is a unique key used to identify a specific email.
 

* - Mandatory parameter

Note:

While the Messages APIs focus on individual messages, the Threads APIs deal with entire conversation threads, each of which contains multiple messages.

Sample request
curl "https://mail360.zoho.com/api/accounts/x7**00s/messages/16756****0001" \
-X GET \
-H "Accept: application/json" \
-H "Content-Type: application/json" \
-H "Authorization:Zoho-oauthtoken 8***f47d1a896d59" \
Sample response
{
 "status": {
 "code": 200,
 "description": "success"
 },
 "data": {
 "summary": "New device signed in to rebecca@gmail.com
Your Google Account was just signed in to from a new Linux device.
You're getting this email to make sure it was you.Check activityYou
can also see security activity at https://myaccount.google.com/noti",
 "sentDateInGMT": "1632707012000",
 "calendarType": 0,
 "subject": "Security alert",
 "messageId": "1632727152728010003",
 "flagid": "flag_not_set",
 "status2": "0",
 "priority": "3",
 "hasInline": "true",
 "toAddress": "&rebecca@gmail.com&gt;",
 "folderId": "10022000000002045",
 "ccAddress": "Not Provided",
 "hasAttachment": "0",
 "size": "6310",
 "sender": "Google",
 "receivedTime": "1632726812000",
 "fromAddress": "no-reply@accounts.google.com",
 "status": "0"
 }
 }

 # Get Email Content
Purpose
This API is used to retrieve the content of a specific email using the message ID.

OAuth Scope
Use the scope

MailApps.messages.ALL (or) MailApps.messages.READ

ALL - Full access to the messages.

READ - Read the messages using the message ID.

To generate Authtoken, refer here.

Request URL
Method: GET

https://mail360.zoho.com/api/accounts/{account_key}/messages/{messageId}/content

Path Parameters
account_key* string
This key is used to identify the account from which the emails have to be retrieved. It is generated during account addition.
This parameter can be fetched from Get all accounts API.
messageId* long
This is a unique key used to identify a specific email.
Query Parameters
includeBlockContent boolean
This parameter specifies whether the block content needs to be included or not. 
The possible value can be
true - include block content.
false - do not include block content.
 

* - Mandatory parameter

Note:

While the Messages APIs focus on individual messages, the Threads APIs deal with entire conversation threads, each of which contains multiple messages.

Sample request
curl "https://mail360.zoho.com/api/accounts/x7**0s/messages/15**40001/content?includeBlockContent=true" \
-X GET \
-H "Accept: application/json" \
-H "Authorization:Zoho-oauthtoken 80**896d59" 
Sample response
{
    "status": {
        "code": 200,
        "description": "success"
    },
    "data": {
        "messageId": 1586347664165010002,
        "content": "<meta /><div><div style=\"font-family: Verdana, Arial, Helvetica, sans-serif; font-size: 10.0pt;\"><div><br /></div><div id=\"\">Test,<br />Vacation reply.<br /></div><br /><br /></div><br /></div><br /><span style=\"color: rgb(0,0,0); font-family: Verdana, Arial, Helvetica, sans-serif; font-size: 13.333333px; font-style: normal; font-variant: normal; font-weight: normal; letter-spacing: normal; line-height: 18.0px; text-align: left; text-indent: 0.0px; text-transform: none; white-space: normal; widows: 1; word-spacing: 0.0px; display: inline; float: none; background-color: rgb(255,255,255);\">M110 Disclaimer <br /><br />Rebecca.<br /></span>"
    }
}

# Get Email Header
Purpose
This API is used to retrieve the header of a specific email using the message ID.

OAuth Scope
Use the scope

MailApps.messages.ALL (or) MailApps.messages.READ

ALL - Full access to the messages.

READ - Read the message header using the message ID.

To generate Authtoken, refer here.

Request URL
Method: GET

https://mail360.zoho.com/api/accounts/{account_key}/messages/{messageId}/header

Path Parameters
account_key* string
This key is used to identify the account from which the emails have to be retrieved. It is generated during account addition.
This parameter can be fetched from Get all accounts API.
messageId* long
This is the unique key used to identify a specific email.
 

* - Mandatory parameter

Note:

While the Messages APIs focus on individual messages, the Threads APIs deal with entire conversation threads, each of which contains multiple messages.

Sample request
curl "https://mail360.zoho.com/api/accounts/x7**0s/messages/15**40001/header" \
-X GET \
-H "Accept: application/json" \
-H "Authorization:Zoho-oauthtoken 80**896d59" 
Sample response
{
    "status": {
        "code": 200,
        "description": "success"
    },
    "data": {
        "messageId": "1675764701732140010",
        "headerContent": "Delivered-To: paula@gmail.com\r\nReceived: by 2002:a05:6022:39c:b0:37:1a24:8eb9 with SMTP id 28csp4027121lak;\r\n        Tue, 7 Feb 2023 02:06:24 -0800 (PST)\r\nX-Google-Smtp-Source: AK7set/UP2SBw1uyLF3fCkbMN8pvpDnI695vLnTdm+0NnettI+5LOfecBRFpgHQI+1yPGpkOkFZ9\r\nX-Received: by 2002:a17:90b:30c2:b0:230:caa5:5213 with SMTP id hi2-20020a17090b30c200b00230caa55213mr3551131pjb.24.1675764384037;\r\n        Tue, 07 Feb 2023 02:06:24 -0800 (PST)\r\nARC-Seal: i=2; a=rsa-sha256; t=1675764384; cv=pass;\r\n        d=google.com; s=arc-20160816;\r\n        b=FJjmP873eHJJgAqJJzDWkb2MxjBMZBilULLLBW+Rw3pvc+k/TUbwXztDQtNqmxKb2l\r\n         IFZZkfOAIM52CeWrAPz+YliPthP4KoH2OOn1Sm4h/t5XLXtfGsqT+853D1ij+jvJdvJ4\r\n         DBKOTyO2cyxl5A6zEvlAxKjB8XHYl4a5irUYxp8A7iemIATp7cOL0uQRDqd4dhfyxl7C\r\n         mRJAcggfWlk/Qx2MsEWngmdv0XVbf7TR7yZswNoUlgCiMZvFGeb0x0/vs/n8DJOcKl4w\r\n         gBnOx6Mh+5UwCFtb+aW+Qsm5ziiOaTfzDBvpTI3U5zA9y6NheZgm6ZZcOlzR6UDyJif+\r\n         Bxyg==\r\nARC-Message-Signature: i=2; a=rsa-sha256; c=relaxed/relaxed; d=google.com; s=arc-20160816;\r\n        h=tm-mail-jid:original-envelope-id:content-transfer-encoding\r\n         :mime-version:subject:message-id:to:from:date:dkim-signature;\r\n        bh=gIvsCnhQt5nzGaUClWDzhsrpB+sWB8lBo4CyhOCSfVE=;\r\n        b=BLf7L2FXzR4OLhr7P2RpqqgHXdJbcXic/AODD2ilvnx67E/IED/M3xcEUqbwfiB8w4\r\n         AE3VWGiVb6/4sp1ZRGailFVcTSd1TW01bUp3Uq896y6m/56tqKZpTNL5T4Y0Z9VbxOFo\r\n         Xlkj2pXXlkmB3LhLFy6VoEhUikgj61hVyKjbtDGkpFBMs3yb5m78PArgs0baXohF7B19\r\n         ovRn+MN0qtl88Q05f5pnPr4LB0Z0EwhupCouB4+7tgyDimaYATlhVp5bMOy5gV7vIG02\r\n         wrwnxDZz0uo2gRkcLeOwUyip6ciec/lEnbs0UkH0kbep1YO0eU8tHEIkC2QiDJn5nMpa\r\n         zfsw==\r\nARC-Authentication-Results: i=2; mx.google.com;\r\n       dkim=pass header.i=@checkzepto.zylker.com header.s=14201810 header.b=WwSUO4+x;\r\n       arc=pass (i=1 spf=pass spfdomain=mailapps.zylker.com dkim=pass dkdomain=checkzepto.zylker.com dmarc=pass fromdomain=checkzepto.zylker.com>);\r\n       spf=pass (google.com: domain of test+01f70380-a6cf-11ed-a008-5254000e3179_vt1@mailapps.zylker.com designates 136.143.184.132 as permitted sender) smtp.mailfrom=test+01f70380-a6cf-11ed-a008-5254000e3179_vt1@mailapps.zylker.com;\r\n       dmarc=pass (p=NONE sp=NONE dis=NONE) header.from=zylker.com\r\nReturn-Path: <test+01f70380-a6cf-11ed-a008-5254000e3179_vt1@mailapps.zylker.com>\r\nReceived: from sender3-g1-132.zohomail360.com (sender3-g1-132.zohomail360.com. [136.143.184.132])\r\n        by mx.google.com with ESMTPS id t2-20020a63b242000000b004e67f9c47d8si14505786pgo.265.2023.02.07.02.06.23\r\n        (version=TLS1_2 cipher=ECDHE-ECDSA-AES128-GCM-SHA256 bits=128/128);\r\n        Tue, 07 Feb 2023 02:06:24 -0800 (PST)\r\nReceived-SPF: pass (google.com: domain of test+01f70380-a6cf-11ed-a008-5254000e3179_vt1@mailapps.zylker.com designates 136.143.184.132 as permitted sender) client-ip=136.143.184.132;\r\nAuthentication-Results: mx.google.com;\r\n       dkim=pass header.i=@checkzepto.zylker.com header.s=14201810 header.b=WwSUO4+x;\r\n       arc=pass (i=1 spf=pass spfdomain=mailapps.zylker.com dkim=pass dkdomain=checkzepto.zylker.com dmarc=pass fromdomain=checkzepto.zylker.com>);\r\n       spf=pass (google.com: domain of test+01f70380-a6cf-11ed-a008-5254000e3179_vt1@mailapps.zylker.com designates 136.143.184.132 as permitted sender) smtp.mailfrom=test+01f70380-a6cf-11ed-a008-5254000e3179_vt1@mailapps.zylker.com;\r\n       dmarc=pass (p=NONE sp=NONE dis=NONE) header.from=zylker.com\r\nARC-Seal: i=1; a=rsa-sha256; t=1675764382; cv=none; \r\n\td=zohomail360.com; s=zohoarc; \r\n\tb=DgDBwJl9wkzxSv4f1QsoaFDY7nNWA6v+vdVwBSEjADsE1Ztx0B00oN2vMZ5ONnGo5FjW6LIlH9DF1ssY5jlo0eS4FmXpKoWpiUW63V1vm4TuR/tOVVwLhY9cGCRbApj0RLLi9z7VOQDcR4EpSXBxtiN/nXl44hHsTZYlqtixb/w=\r\nARC-Message-Signature: i=1; a=rsa-sha256; c=relaxed/relaxed; d=zohomail360.com; s=zohoarc; \r\n\tt=1675764382; h=Content-Type:Content-Transfer-Encoding:Date:From:MIME-Version:Message-ID:Subject:To; \r\n\tbh=gIvsCnhQt5nzGaUClWDzhsrpB+sWB8lBo4CyhOCSfVE=; \r\n\tb=VCnBTLDhnrjhK8mTkEzG7GN1Q0AKtDNqE5R5PpL+w1GDqhm8UWr5WzaabYDdt+yai7UudbaeDy/+w1V8RiQobU+kpZnkQNYPGPqdydG6V68wSK95wylB/OU7OBy/RNi672oteQcOk4G3IL3cE8OSI+XDU9M6z3xkEK49OxUgYoY=\r\nARC-Authentication-Results: i=1; mx.zohomail360.com;\r\n\tdkim=pass  header.i=checkzepto.zylker.com;\r\n\tspf=pass  smtp.mailfrom=test+01f70380-a6cf-11ed-a008-5254000e3179_vt1@mailapps.zylker.com;\r\n\tdmarc=pass header.from=<noreply@checkzepto.zylker.com>\r\nReceived: from [10.47.36.141] (10.47.36.141 [10.47.36.141]) by mx.zohomail.com\r\n\twith SMTPS id 167576438090015.062799275904695; Tue, 7 Feb 2023 02:06:20 -0800 (PST)\r\nDKIM-Signature: a=rsa-sha256; b=WwSUO4+xIY5jtK3M+82gKSo56rpufvOEPtuvXPIC518gVD3D0muHBYjfpjQomdyoXSHHhoJFcVzeDYFfGGpnBCvZaeWrBS/+3Edsxp3P5wAHpOH+ZSsg+zjEDI/QrfxdZiEEtsxHOgC6g1CMFtRWWoIYmyisdXSiCE3iRMifSJY=; c=relaxed/relaxed; s=14201810; d=checkzepto.zylker.com; v=1; bh=gIvsCnhQt5nzGaUClWDzhsrpB+sWB8lBo4CyhOCSfVE=; h=date:from:reply-to:to:cc:message-id:subject:mime-version:content-type:date:from:reply-to:to:cc:message-id:subject;\r\nDate: Tue, 7 Feb 2023 02:06:20 -0800 (PST)\r\nFrom: noreply <noreply@checkzepto.zylker.com>\r\nTo:  <zaarazen.mail@gmail.com>, \r\n\t <paula@gmail.com>, \r\n\tpaula <paula@zylker.com>, paula <paula@zylker.com>\r\nMessage-ID: <2d6f.29241e3e.m1.01f70380-a6cf-11ed-a008-5254000e3179.1862b56cbb8@mailapps.zylker.com>\r\nSubject: Test Email\r\nMIME-Version: 1.0\r\nContent-Type: text/html;charset=\"UTF-8\"\r\nContent-Transfer-Encoding: quoted-printable\r\nOriginal-Envelope-Id: 2d6f.29241e3e.m1.01f70380-a6cf-11ed-a008-5254000e3179.1862b56cbb8\r\nX-Report-Abuse: <mailto:abuse+2d6f.29241e3e.m1.01f70380-a6cf-11ed-a008-5254000e3179.1862b56cbb8@zeptomail.com>\r\nTM-MAIL-JID: 2d6f.29241e3e.m1.01f70380-a6cf-11ed-a008-5254000e3179.1862b56cbb8\r\nX-JID: 2d6f.29241e3e.m1.01f70380-a6cf-11ed-a008-5254000e3179.1862b56cbb8\r\nX-App-Message-ID: 2d6f.29241e3e.m1.01f70380-a6cf-11ed-a008-5254000e3179.1862b56cbb8\r\nX-ZohoMailClient: External"
    }
}
Sample Failure Response
{
    "status": {
        "code": 500,
        "description": "Internal Error"
    },
    "data": {
        "moreInfo": "Internal Error"
    }
}

# Get Attachment Details of an Email
Purpose
This API is used to retrieve the details of all the attachments of a specific email using a message ID.

OAuth Scope
Use the scope

MailApps.messages.ALL (or) MailApps.messages.READ

ALL - Full access to the messages.

READ - Fetch the attachment details of the messages.

To generate Authtoken, refer here.

Request URL
Method: GET

https://mail360.zoho.com/api/accounts/{account_key}/messages/{messageId}/attachments

Path Parameters
account_key* string
This key is used to identify the account from which the attachments have to be retrieved. It is generated during account addition.
This parameter can be fetched from Get all accounts API.
messageId* long
This is the unique key used to identify a specific email.
Query Parameters
includeInline boolean
This parameter specifies whether to include the inline attachment details in the response.
The possible value can be
true - include inline attachment.
false - do not include inline attachment.
 

* - Mandatory parameter

Note:

While the Messages APIs focus on individual messages, the Threads APIs deal with entire conversation threads, each of which contains multiple messages.

Sample request
curl "https://mail360.zoho.com/api/accounts/x7**B00s/messages/16*0001/attachments?includeInline=true" \
-X GET \
-H "Accept: application/json" \
-H "Authorization:Zoho-oauthtoken 8**b64f"
Sample response
{
    "status": {
        "code": 200,
        "description": "success"
    },
    "data": {
        "attachments": [
            {
                "attachmentSize": 5237,
                "attachmentName": "aa.jpeg",
                "attachmentId": 138056404665890070
            }
        ],
        "inline": [
            {
                "attachmentId": "138933999122460040",
                "attachmentName": "1.png",
                "attachmentSize": 86973,
                "cid": "0.28870117710.2693392459576172169.185c88f48c9__inline__img__src"
            }
        ],
        "messageId": 1586347665519010005
    }
}

 # Mark Emails as Read
Purpose
This API is used to mark single or multiple emails as read.

OAuth Scope
Use the scope

MailApps.messages.ALL (or) MailApps.messages.UPDATE

ALL  - Full access to the messages.

UPDATE  - Mark the email as read.

To generate Authtoken, refer here.

Request URL
Method: PUT

https://mail360.zoho.com/api/accounts/{account_key}/messages

Path Parameters
account_key* string
This key is used to identify the specific account and is generated during account addition.
This parameter can be retrieved from Get all Accounts API.
Request Body (JSON object)
mode* string
This parameter represents the type of operation that is to be performed.
Provide the value as markAsRead.
messageId* JSON Array of long 
This parameter should be passed as an array containing one or more message IDs that need to be marked as read. A message ID is a unique identifier for an email.
 

* - Mandatory parameter

Note:

While the Messages APIs focus on individual messages, the Threads APIs deal with entire conversation threads, each of which contains multiple messages.

Sample Request
curl "https://mail360.zoho.com/api/accounts/x7**00s/messages" \
-X PUT \
-H "Accept: application/json" \
-H "Content-Type: application/json" \
-H "Authorization:Zoho-oauthtoken 80**74d5ac77" \
-d '{
  "mode" :"markAsRead",
  "messageId":"[164522103243001,16452210000001]"
}'
Sample Success Response
{
  "status": {
    "code": 200,
    "description": "success"
  }
}
Sample Failure Response
{
    "status": {
        "code": 500,
        "description": "Internal Error"
    },
    "data": {
        "moreInfo": "Internal Error"
    }
}

# Mark Emails as Unread
Purpose
This API is used to mark single or multiple emails as unread.

OAuth Scope
Use the scope

MailApps.messages.ALL (or) MailApps.messages.UPDATE

ALL-Full access to the messages.

UPDATE -Mark the email as unread.

To generate Authtoken, refer here.

Request URL
Method: PUT

https://mail360.zoho.com/api/accounts/{account_key}/messages

Path Parameters
account_key* string
This key is used to identify the specific account and is generated during account addition.
This parameter can be retrieved from Get all Accounts API.
Request Body (JSON object)
mode* string
This parameter represents the type of operation that is to be performed.
Provide the value as markAsUnread.
messageId* JSON Array of long values
This parameter should be passed as an array containing one or more message IDs that need to be marked as unread. A message ID is a unique identifier for an email.
 

* - Mandatory parameter

Note:

While the Messages APIs focus on individual messages, the Threads APIs deal with entire conversation threads, each of which contains multiple messages.

Sample Request
curl "https://mail360.zoho.com/api/accounts/x7k**00s/messages" \
-X PUT \
-H "Accept: application/json" \
-H "Content-Type: application/json" \
-H "Authorization:Zoho-oauthtoken 8024329***d5ac77" \
-d '{
  "mode" :"markAsUnread",
  "messageId":"[164522103243001,16452210000001]"
}' 
Sample Success Response
{
  "status": {
    "code": 200,
    "description": "success"
  }
}
Sample Failure Response
{
  "status": {
    "code": 500,
    "description": "Internal Error"
  },
  "data": {
    "moreInfo": "Internal Error"
  }
}

# Move Emails
Purpose
This API is used to move single or multiple emails to a different folder.

OAuth Scope
Use the scope

MailApps.messages.ALL (or) MailApps.messages.READ

ALL - Full access to the messages.

UPDATE - Move messages.

To generate Authtoken, refer here.

Request URL
Method: PUT

https://mail360.zoho.com/api/accounts/{account_key}/messages

Path Parameters
account_key* string
This key is used to identify the account. It is generated during account addition.
This parameter can be fetched from Get all accounts API.
Request Body (JSON Object)
mode* string
This parameter represents the type of operation that is to be performed.
Provide the value as moveMessage.
messageId* JSON Array of long
This parameter should be passed as an array of single or multiple message IDs of emails which has to be moved to the specified destination folder. Each message ID serves as a unique identifier for an email or message.
destfolderId* long
This parameter specifies the ID of the destination folder to which emails need to be moved.
 

* - Mandatory parameter

Note:

While the Messages APIs focus on individual messages, the Threads APIs deal with entire conversation threads, each of which contains multiple messages.

Sample request
curl "https://mail360.zoho.com/api/accounts/x7k**0s/messages" \
-X PUT \
-H "Accept: application/json" \
-H "Content-Type: application/json" \
-H "Authorization:Zoho-oauthtoken 802**11a0274d5ac77" \
-d '{
  "mode" :"moveMessage",
  "messageId":"[164522103243001,16452210000001]",
  "destfolderId":"182024000000003011"
}' 
Sample Success Response
{
    "status": {
        "code": 200,
        "description": "success"
    }
}
Sample Failure Response
{
    "status": {
        "code": 500,
        "description": "Internal Error"
    },
    "data": {
        "moreInfo": "Internal Error"
    }
}

# Flag Emails
Purpose
This API is used to apply a flag to a single or multiple emails.

OAuth Scope
Use the scope

MailApps.messages.ALL (or) MailApps.messages.UPDATE

ALL - Full access to the messages.

UPDATE - Flag emails.

To generate Authtoken, refer here.

Request URL
Method: PUT

https://mail360.zoho.com/api/accounts/{account_key}/messages

Path Parameters
account_key* string
This key is used to identify the account. It is generated during account addition.
This parameter can be fetched from Get all accounts API.
Request Body (JSON Object)
mode* string
This parameter represents the type of operation that is to be performed.
Provide the value as setFlag.
messageId* JSON Array of long
This parameter should be passed as an array of single or multiple message IDs of emails that need to be flagged. Each message ID serves as a unique identifier for an email or message.
flagid* string
This parameter is passed to update emails with the specific flag.
The value can be
info
important
followup
flag_not_set
The default value is flag_not_set.
 

* - Mandatory parameter

Note:

While the Messages APIs focus on individual messages, the Threads APIs deal with entire conversation threads, each of which contains multiple messages.

Sample request
curl "https://mail360.zoho.com/api/accounts/x7**0s/messages" \
-X PUT \
-H "Accept: application/json" \
-H "Content-Type: application/json" \
-H "Authorization:Zoho-oauthtoken 802**74d5ac77" \
-d '{
  "mode" :"setFlag",
  "messageId":"[164522103243001,16452210000001]",
  "flagid":"info"
}'
Sample Success Response
{
    "status": {
        "code": 200,
        "description": "success"
    }
}
Sample Failure Response
{
    "status": {
        "code": 500,
        "description": "Internal Error"
    },
    "data": {
        "moreInfo": "Internal Error"
    }
}

# Apply Labels to Emails
Purpose
This API is used to apply labels to a single email or multiple emails.

OAuth Scope
Use the scope

MailApps.messages.ALL (or) MailApps.messages.UPDATE

ALL - Full access to the messages.

UPDATE - Apply label to emails.

To generate Authtoken, refer here.

Request URL
Method: PUT

https://mail360.zoho.com/api/accounts/{account_key}/messages

Path Parameters
account_key* string
This key is used to identify the account. It is generated during account addition.
This parameter can be fetched from Get all accounts API.
Request Body (JSON Object)
mode* string
This parameter represents the type of operation that is to be performed.
Provide the value as applyLabel.
messageId* JSON Array of long
This parameter should be passed as an array of single or multiple message IDs of emails that need to be labelled. Each message ID serves as a unique identifier for an email or message.
labelId* JSON Array of long
This parameter should be passed as an array of single or multiple label IDs that need to be applied to emails. Each label ID serves as a unique identifier for a label.
 

* - Mandatory parameter

Note:

While the Messages APIs focus on individual messages, the Threads APIs deal with entire conversation threads, each of which contains multiple messages.

Sample Request
curl "https://mail360.zoho.com/api/accounts/x7k**B00s/messages" \
-X PUT \
-H "Accept: application/json" \
-H "Content-Type: application/json" \
-H "Authorization:Zoho-oauthtoken 802432953.9d9**8b4ac3" \
-d '{
  "mode" :"applyLabel",
  "messageId":"[1675839032459140122,1675839056963140305]",
  "labelId":"[182024000000016004]"
}' 
Sample Success Response
{
    "status": {
        "code": 200,
        "description": "success"
    }
}
Sample Failure Response
{
    "status": {
        "code": 500,
        "description": "Internal Error"
    },
    "data": {
        "moreInfo": "Internal Error"
    }
}

# Remove Specific Labels from Emails
Purpose
This API is used to remove specific labels from a single email or multiple emails.

OAuth Scope
Use the scope

MailApps.messages.ALL (or) MailApps.messages.UPDATE

ALL - Full access to the messages.

UPDATE - Remove labels from emails.

To generate Authtoken, refer here.

Request URL
Method: PUT

https://mail360.zoho.com/api/accounts/{account_key}/messages

Path Parameters
account_key* string
This key is used to identify the account. It is generated during account addition.
This parameter can be fetched from Get all accounts API.
Request Body (JSON Object)
mode* string
This parameter represents the type of operation that is to be performed.
Provide the value as removeLabel.
messageId* JSON Array of long
This parameter should be passed as an array of single or multiple message IDs of emails that need to be unlabelled. Each message ID serves as a unique identifier for an email or message.
labelId* JSON Array of long
This parameter should be passed as an array of single or multiple label IDs that need to be removed from emails. Each label ID serves as a unique identifier for a label.
 

* - Mandatory parameter

Note:

While the Messages APIs focus on individual messages, the Threads APIs deal with entire conversation threads, each of which contains multiple messages.

Sample request
curl "https://mail360.zoho.com/api/accounts/x**00s/messages" \
-X PUT \
-H "Accept: application/json" \
-H "Content-Type: application/json" \
-H "Authorization:Zoho-oauthtoken 802432953**bafac09d8c98b4ac3" \
-d '{
  "mode" :"removeLabel",
  "messageId":"[1675839032459140122,1675839056963140305]",
  "labelId":"[182024000000016004]"
}' 

Sample Success Response
{
    "status": {
        "code": 200,
        "description": "success"
    }
}
Sample Failure Response
{
    "status": {
        "code": 500,
        "description": "Internal Error"
    },
    "data": {
        "moreInfo": "Internal Error"
    }
}

# Remove All Labels from Emails
Purpose
This API is used to remove all labels from a single email or multiple emails.

OAuth Scope
Use the scope

MailApps.messages.ALL (or) MailApps.messages.UPDATE

ALL - Full access to the messages.

UPDATE - Remove labels from emails.

To generate Authtoken, refer here.

Request URL
Method: PUT

https://mail360.zoho.com/api/accounts/{account_key}/messages

Path Parameters
account_key* string
This key is used to identify the account. It is generated during account addition.
This parameter can be fetched from Get all accounts API.
Request Body (JSON Object)
mode* string
This parameter represents the type of operation that is to be performed.
Provide the value as removeAllLabels.
messageId* JSON Array of long values
This parameter needs to be passed as an array of single or multiple message IDs of emails that need to be unlabelled. Each message ID serves as a unique identifier for an email.
 

* - Mandatory parameter

Note:

While the Messages APIs focus on individual messages, the Threads APIs deal with entire conversation threads, each of which contains multiple messages.

Sample request
curl "https://mail360.zoho.com/api/accounts/x**B00s/messages" \
-X PUT \
-H "Accept: application/json" \
-H "Content-Type: application/json" \
-H "Authorization:Zoho-oauthtoken 802432953.9d**b4ac3" \
-d '{
  "mode" :"removeAllLabels",
  "messageId":"[1675839032459140122,1675839056963140305]"
}' 
Sample response
{
    "status": {
        "code": 200,
        "description": "success"
    }
}
Sample Failure Response
{
    "status": {
        "code": 500,
        "description": "Internal Error"
    },
    "data": {
        "moreInfo": "Internal Error"
    }
}

# Delete an Email
Purpose
This API is used to delete a specific email using the message ID.

OAuth Scope
Use the scope

MailApps.messages.ALL (or) MailApps.messages.DELETE

ALL - Full access to the messages.

DELETE - Delete an email.

To generate Authtoken, refer here.

Request URL
Method: DELETE

https://mail360.zoho.com/api/accounts/{account_key}/messages/{messageId}

Path Parameters
account_key* string
This key is used to identify the account from which the emails have to be deleted. It is generated during account addition.
This parameter can be fetched from Get all accounts API.
messageId* long
This is a unique key used to identify a specific email.
Request Body(JSON Object)
expunge boolean
This parameter specifies whether to delete the email from the trash or not.
The possible value can be
true - Delete from trash too.
false - Move to trash.
 

* - Mandatory parameter

Note:

While the Messages APIs focus on individual messages, the Threads APIs deal with entire conversation threads, each of which contains multiple messages.

Sample Request
curl "https://mail360.zoho.com/api/accounts/x7**0s/messages/167**01" \
-X DELETE \
-H "Accept: application/json" \
-H "Content-Type: application/json" \
-H "Authorization:Zoho-oauthtoken ***" \
Sample Success Response
{
  "status": {
    "code": 200,
    "description": "success"
  }
}
Failure response
{
  "status": {
    "code": 500,
    "description": "Internal Error"
  },
  "data": {
    "moreInfo": "Internal Error"
  }
}

# Upload an Attachment
Purpose
This API is used to upload an attachment.

OAuth Scope
Use the scope

MailApps.attachments.ALL (or) MailApps.attachments.CREATE

ALL - Full access to attachments.

CREATE - Upload an attachment.

To generate Authtoken, refer here.

Request URL
Method: POST

https://mail360.zoho.com/api/accounts/{account_key}/attachments

Path Parameters
account_key* string
This key is used to identify the account. It is generated during account addition.
This parameter can be fetched from Get all accounts API.
Request Body (JSON Object)
fileName* string
This is the file name of the attachment that needs to be uploaded.
 

* - Mandatory parameter

Sample Request
curl "https://mail360.zoho.com/api/accounts/G0****9r/attachments?fileName=<file_name>" \
-X POST \
-H "Content-Type: application/octet-stream" \
-H "Authorization: Zoho-oauthtoken ***" \
--data-binary "@/<file_path>/<file_name>"
Sample Success Response
{
   "status": {
      "code": 200,
      "description": "success"
   },
   "data": {
      "fileId": "33e5fac5f2976edb758b/test.png"
   }
}
Sample Failure Response
{
   "status": {
      "code": 404,
      "description": "Invalid Input"
   },
   "data": {
      "moreInfo": "Error with file attached"
   }
}

Download an Attachment
Purpose
This API is used to fetch the attachment content using the attachment ID.

OAuth Scope
Use the scope

MailApps.attachments.ALL (or) MailApps.attachments.READ

ALL - Full access to attachments.

READ - Fetch a specific attachment.

To generate Authtoken, refer here.

Request URL
Method: GET

https://mail360.zoho.com/api/accounts/{account_key}/messages/{messageId}/attachments/{attachmentId}

Path Parameters
account_key* string
This key is used to identify the account from which the emails have to be retrieved. It is generated during account addition.
This parameter can be fetched from Get all accounts API.
messageId* long
This is the unique key to identifying a specific email.
This parameter can be fetched from List emails in a folder API.
attachmentId* long
This is the unique key to identifying a specific attachment.
This parameter can be fetched from Get attachment details API.
 

* - Mandatory parameter

Sample request
curl 
"https://mail360.zoho.com/api/accounts/x7**B00s/messages/16*0001/attachments/138**10" \
-X GET \
-H "Accept: application/json" \
-H "Content-Type: application/json" \
-H "Authorization:Zoho-oauthtoken 8**b64f" \
Sample response
Success message :

Downloaded file!

