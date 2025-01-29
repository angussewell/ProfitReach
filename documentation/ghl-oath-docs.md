Overview
These APIs use OAuth 2.0 flow for authentication.

To get started, please follow Authorization steps.

Standard Response Fields
Below we have listed the standard fields you would receive with every request.

TraceId
A traceId represents a unique id for every request and is returned with every response. It is useful in pinpointing the exact request and helps while debugging.

Scopes
Here is a list of the scopes you require to access the API Endpoints and Webhook Events.

Scope	API Endpoints	Webhook Events	Access Type
businesses.readonly	GET /businesses		Sub-Account
 	GET /businesses/:businessId		Sub-Account
businesses.write	POST /businesses		Sub-Account
 	PUT /businesses/:businessId		Sub-Account
 	DELETE /businesses/:businessId		Sub-Account
calendars.write	POST /calendars/		Sub-Account
 	PUT /calendars/:calendarId		Sub-Account
 	DELETE /calendars/:calendarId		Sub-Account
calendars.readonly	GET /calendars/		Sub-Account
 	GET /calendars/:calendarId		Sub-Account
 	GET /calendars/:calendarId/free-slots		Sub-Account
calendars/groups.readonly	GET /calendars/groups		Sub-Account
calendars/groups.write	POST /calendars/groups		Sub-Account
 	POST /calendars/groups/validate-slug		Sub-Account
 	DELETE /calendars/groups/:groupId		Sub-Account
 	PUT /calendars/groups/:groupId		Sub-Account
 	PUT /calendars/groups/:groupId/status		Sub-Account
calendars/resources.readonly	GET /calendars/resources/:resourceType		Sub-Account
 	GET /calendars/resources/:resourceType/:id		Sub-Account
calendars/resources.write	POST /calendars/resources		Sub-Account
 	PUT /calendars/resources/:resourceType/:id		Sub-Account
 	DELETE /calendars/resources/:resourceType/:id		Sub-Account
calendars/events.readonly	GET /calendars/events/appointments/:eventId		Sub-Account
 	GET /calendars/events		Sub-Account
 	GET /calendars/blocked-slots		Sub-Account
 	GET /calendars/appointments/:appointmentId/notes		Sub-Account
calendars/events.write	DELETE /calendars/events/:eventId		Sub-Account
 	POST /calendars/events/block-slots		Sub-Account
 	PUT /calendars/events/block-slots/:eventId		Sub-Account
 	POST /calendars/events/appointments		Sub-Account
 	PUT /calendars/events/appointments/:eventId		Sub-Account
 	POST /calendars/appointments/:appointmentId/notes		Sub-Account
 	PUT /calendars/appointments/:appointmentId/notes/:noteId		Sub-Account
 	DELETE /calendars/appointments/:appointmentId/notes/:noteId		Sub-Account
campaigns.readonly	GET /campaigns/	CampaignStatusUpdate	Sub-Account
contacts.readonly	GET /contacts/:contactId	ContactCreate	Sub-Account
 	GET /contacts/:contactId/tasks	ContactDelete	Sub-Account
 	GET /contacts/:contactId/tasks/:taskId	ContactDndUpdate	Sub-Account
 	GET /contacts/:contactId/notes	ContactTagUpdate	Sub-Account
 	GET /contacts/:contactId/notes/:id	NoteCreate	Sub-Account
 	GET /contacts/:contactId/appointments	NoteDelete	Sub-Account
 	GET /contacts/	TaskCreate	Sub-Account
 	GET /contacts/business/:businessId	TaskDelete	Sub-Account
contacts.write	POST /contacts/	 	Sub-Account
 	PUT /contacts/:contactId	 	Sub-Account
 	DELETE /contacts/:contactId	 	Sub-Account
 	POST /contacts/:contactId/tasks	 	Sub-Account
 	PUT /contacts/:contactId/tasks/:taskId	 	Sub-Account
 	PUT /contacts/:contactId/tasks/:taskId/completed	 	Sub-Account
 	DELETE /contacts/:contactId/tasks/:taskId	 	Sub-Account
 	POST /contacts/:contactId/tags	 	Sub-Account
 	DELETE /contacts/:contactId/tags	 	Sub-Account
 	POST /contacts/:contactId/notes	 	Sub-Account
 	PUT /contacts/:contactId/notes/:id	 	Sub-Account
 	DELETE /contacts/:contactId/notes/:id	 	Sub-Account
 	POST /contacts/:contactId/campaigns/:campaignId	 	Sub-Account
 	DELETE /contacts/:contactId/campaigns/removeAll	 	Sub-Account
 	DELETE /contacts/:contactId/campaigns/:campaignId	 	Sub-Account
 	POST /contacts/:contactId/workflow/:workflowId	 	Sub-Account
 	DELETE /contacts/:contactId/workflow/:workflowId	 	Sub-Account
objects/schema.readonly	GET /objects/:key	 	Sub-Account
 	GET /objects	 	Sub-Account
objects/schema.write		 	Sub-Account
objects/record.readonly	GET /objects/:schemaKey/records/:id	 	Sub-Account
objects/record.write	POST /objects/:schemaKey/records	 	Sub-Account
 	PUT /objects/:schemaKey/records/:id	 	Sub-Account
 	DELETE /objects/:schemaKey/records/:id	 	Sub-Account
conversations.readonly	GET /conversations/:conversationsId	ConversationUnreadWebhook	Sub-Account
 	GET /conversations/search	 	Sub-Account
conversations.write	POST /conversations/	 	Sub-Account
 	PUT /conversations/:conversationsId	 	Sub-Account
 	DELETE /conversations/:conversationsId	 	Sub-Account
conversations/message.readonly	GET conversations/messages/:messageId/locations/:locationId/recording	InboundMessage	Sub-Account
 		OutboundMessage	Sub-Account
 	GET conversations/locations/:locationId/messages/:messageId/transcription	InboundMessage	Sub-Account
 		OutboundMessage	Sub-Account
 	GET conversations/locations/:locationId/messages/:messageId/transcription/download	InboundMessage	Sub-Account
 		OutboundMessage	
conversations/message.write	POST /conversations/messages	ConversationProviderOutboundMessage	Sub-Account
 	POST /conversations/messages/inbound	 	Sub-Account
 	POST /conversations/messages/upload	 	Sub-Account
 	PUT /conversations/messages/:messageId/status	 	Sub-Account
 	DELETE /conversations/messages/:messageId/schedule	 	Sub-Account
 	DELETE /conversations/messages/email/:emailMessageId/schedule	 	Sub-Account
conversations/livechat.write	POST /conversations/providers/live-chat/typing	 	Sub-Account
forms.readonly	GET /forms/	 	Sub-Account
 	GET /forms/submissions	 	Sub-Account
invoices.readonly	GET /invoices/	 	Sub-Account
 	GET /invoices/:invoiceId	 	Sub-Account
 	GET /invoices/generate-invoice-number	 	Sub-Account
invoices.write	POST /invoices	 	Sub-Account
 	PUT /invoices/:invoiceId	 	Sub-Account
 	DELETE /invoices/:invoiceId	 	Sub-Account
 	POST /invoices/:invoiceId/send	 	Sub-Account
 	POST /invoices/:invoiceId/void	 	Sub-Account
 	POST /invoices/:invoiceId/record-payment	 	Sub-Account
 	POST /invoices/text2pay	 	Sub-Account
invoices/schedule.readonly	GET /invoices/schedule/	 	Sub-Account
 	GET /invoices/schedule/:scheduleId	 	Sub-Account
invoices/schedule.write	POST /invoices/schedule	 	Sub-Account
 	PUT /invoices/schedule/:scheduleId	 	Sub-Account
 	DELETE /invoices/schedule/:scheduleId	 	Sub-Account
 	POST /invoices/schedule/:scheduleId/schedule	 	Sub-Account
 	POST /invoices/schedule/:scheduleId/auto-payment	 	Sub-Account
 	POST /invoices/schedule/:scheduleId/cancel	 	Sub-Account
invoices/template.readonly	GET /invoices/template/	 	Sub-Account
 	GET /invoices/template/:templateId	 	Sub-Account
invoices/template.write	POST /invoices/template/	 	Sub-Account
 	PUT /invoices/template/:templateId	 	Sub-Account
 	DELETE /invoices/template/:templateId	 	Sub-Account
links.readonly	GET /links/	 	Sub-Account
links.write	POST /links/	 	Sub-Account
 	PUT /links/:linkId	 	Sub-Account
 	DELETE /links/:linkId	 	Sub-Account
locations.readonly	GET /locations/:locationId	LocationCreate	Sub-Account, Agency
LocationUpdate	Sub-Account, Agency
GET /locations/search	 	Sub-Account, Agency
GET /locations/timeZones	 	Sub-Account
locations.write	POST /locations/	 	Agency
PUT /locations/:locationId	 	Agency
DELETE /locations/:locationId	 	Agency
locations/customValues.readonly	GET /locations/:locationId/customValues	 	Sub-Account
 	GET /locations/:locationId/customValues/:id	 	Sub-Account
locations/customValues.write	POST /locations/:locationId/customValues	 	Sub-Account
 	PUT /locations/:locationId/customValues/:id	 	Sub-Account
 	DELETE /locations/:locationId/customValues/:id	 	Sub-Account
locations/customFields.readonly	GET /locations/:locationId/customFields	 	Sub-Account
 	GET /locations/:locationId/customFields/:id	 	Sub-Account
 	GET /custom-fields/:id	 	Sub-Account
 	GET /custom-field/object-key/:key	 	Sub-Account
locations/customFields.write	POST /locations/:locationId/customFields	 	Sub-Account
 	PUT /locations/:locationId/customFields/:id	 	Sub-Account
 	DELETE /locations/:locationId/customFields/:id	 	Sub-Account
locations/tags.readonly	GET /locations/:locationId/tags	 	Sub-Account
GET /locations/:locationId/tags/:tagId	 	Sub-Account
locations/tags.write	POST /locations/:locationId/tags/	 	Sub-Account
 	PUT /locations/:locationId/tags/:tagId	 	Sub-Account
 	DELETE /locations/:locationId/tags/:tagId	 	Sub-Account
locations/templates.readonly	GET /locations/:locationId/templates	 	Sub-Account
locations/tasks.readonly	POST /locations/:locationId/tasks/search	 	Sub-Account
medias.readonly	GET /medias/files	 	Sub-Account
medias.write	POST /medias/upload-file	 	Sub-Account
funnels/redirect.readonly	GET /funnels/lookup/redirect/list	 	Sub-Account
funnels/redirect.write	POST /funnels/lookup/redirect	 	Sub-Account
funnels/page.readonly	GET /funnels/page	 	Sub-Account
funnels/funnel.readonly	GET /funnels/funnel/list	 	Sub-Account
funnels/pagecount.readonly	GET /funnels/page/count	 	Sub-Account
 	DELETE /funnels/lookup/redirect/:id	 	Sub-Account
 	PATCH /funnels/lookup/redirect/:id	 	Sub-Account
 	DELETE /medias/:fileId	 	Sub-Account
opportunities.readonly	GET /opportunities/search	OpportunityCreate	Sub-Account
 	GET /opportunities/:id	OpportunityDelete	Sub-Account
 	GET /opportunities/pipelines	OpportunityStageUpdate	Sub-Account
 	 	OpportunityStatusUpdate	Sub-Account
 	 	OpportunityMonetaryValueUpdate	Sub-Account
opportunities.write	DELETE /opportunities/:id	 	Sub-Account
 	PUT /opportunities/:id/status	 	Sub-Account
 	POST /opportunities	 	Sub-Account
 	PUT /opportunities/:id	 	Sub-Account
payments/integration.readonly	GET /payments/integrations/provider/whitelabel	 	Sub-Account
payments/integration.write	POST /payments/integrations/provider/whitelabel	 	Sub-Account
payments/orders.readonly	GET /payments/orders/	 	Sub-Account
 	GET /payments/orders/:orderId	 	Sub-Account
 	GET /payments/orders/:orderId/fulfillments	 	Sub-Account
payments/orders.write	POST /payments/orders/:orderId/fulfillments	 	Sub-Account
payments/transactions.readonly	GET /payments/transactions/	 	Sub-Account
 	GET /payments/transactions/:transactionId	 	Sub-Account
payments/subscriptions.readonly	GET /payments/subscriptions/	 	Sub-Account
 	GET /payments/subscriptions/:subscriptionId	 	Sub-Account
products.readonly	GET /products/	 	Sub-Account
 	GET /products/:productId	 	Sub-Account
products.write	POST /products/	 	Sub-Account
 	PUT /products/:productId	 	Sub-Account
 	DELETE /products/:productId	 	Sub-Account
products/prices.readonly	GET /products/:productId/price/	 	Sub-Account
 	GET /products/:productId/price/:priceId	 	Sub-Account
products/prices.write	POST /products/:productId/price/	 	Sub-Account
 	PUT /products/:productId/price/:priceId	 	Sub-Account
 	DELETE /products/:productId/price/:priceId	 	Sub-Account
oauth.readonly	GET /oauth/installedLocations	 	Agency
oauth.write	POST /oauth/locationToken	 	Agency
saas/location.write	PUT /update-saas-subscription/:locationId	 	Agency
 	POST /enable-saas/:locationId	 	Sub-Account, Agency
saas/location.read	GET /locations	 	Sub-Account, Agency
saas/company.write	POST /bulk-disable-saas/:companyId	 	Sub-Account, Agency
snapshots.readonly	GET /snapshots	 	Agency
socialplanner/account.readonly	GET /social-media-posting/:locationId/accounts	 	Sub-Account
socialplanner/account.write	DELETE /social-media-posting/:locationId/accounts/:id	 	Sub-Account
socialplanner/csv.readonly	GET /social-media-posting/:locationId/csv	 	Sub-Account
 	GET /social-media-posting/:locationId/csv/:id	 	Sub-Account
socialplanner/csv.write	POST /social-media-posting/:locationId/csv	 	Sub-Account
 	POST /social-media-posting/:locationId/set-accounts	 	Sub-Account
 	DELETE /social-media-posting/:locationId/csv/:id	 	Sub-Account
 	PATCH /social-media-posting/:locationId/csv/:id	 	Sub-Account
 	POST /social-media-posting/:locationId/posts/bulk-delete	 	Sub-Account
 	DELETE /social-media-posting/:locationId/csv/:csvId/post/:postId	 	Sub-Account
socialplanner/category.readonly	GET /social-media-posting/:locationId/categories	 	Sub-Account
 	GET /social-media-posting/:locationId/categories/:id	 	Sub-Account
socialplanner/oauth.readonly	GET /social-media-posting/oauth/facebook/start	 	Sub-Account
 	GET /social-media-posting/oauth/:locationId/facebook/accounts/:accountId	 	Sub-Account
 	GET /social-media-posting/oauth/google/start	 	Sub-Account
 	GET /social-media-posting/oauth/:locationId/google/locations/:accountId	 	Sub-Account
 	GET /social-media-posting/oauth/instagram/start	 	Sub-Account
 	GET /social-media-posting/oauth/:locationId/instagram/accounts/:accountId	 	Sub-Account
 	GET /social-media-posting/oauth/linkedin/start	 	Sub-Account
 	GET /social-media-posting/oauth/:locationId/linkedin/accounts/:accountId	 	Sub-Account
 	GET /social-media-posting/oauth/tiktok/start	 	Sub-Account
 	GET /social-media-posting/oauth/:locationId/tiktok/accounts/:accountId	 	Sub-Account
 	GET /social-media-posting/oauth/tiktok-business/start	 	Sub-Account
 	GET /social-media-posting/oauth/:locationId/tiktok-business/accounts/:accountId	 	Sub-Account
 	GET /social-media-posting/oauth/twitter/start	 	Sub-Account
 	GET /social-media-posting/oauth/:locationId/twitter/accounts/:accountId	 	Sub-Account
socialplanner/oauth.write	POST /social-media-posting/oauth/:locationId/facebook/accounts/:accountId	 	Sub-Account
 	POST /social-media-posting/oauth/:locationId/google/locations/:accountId	 	Sub-Account
 	POST /social-media-posting/oauth/:locationId/instagram/accounts/:accountId	 	Sub-Account
 	POST /social-media-posting/oauth/:locationId/linkedin/accounts/:accountId	 	Sub-Account
 	POST /social-media-posting/oauth/:locationId/tiktok/accounts/:accountId	 	Sub-Account
 	POST /social-media-posting/oauth/:locationId/twitter/accounts/:accountId	 	Sub-Account
socialplanner/post.readonly	GET /social-media-posting/:locationId/posts/:id	 	Sub-Account
 	POST /social-media-posting/:locationId/posts/list	 	Sub-Account
socialplanner/post.write	POST /social-media-posting/:locationId/posts	 	Sub-Account
 	PUT /social-media-posting/:locationId/posts/:id	 	Sub-Account
 	DELETE /social-media-posting/:locationId/posts/:id	 	Sub-Account
 	PATCH /social-media-posting/:locationId/posts/:id	 	Sub-Account
socialplanner/tag.readonly	GET /social-media-posting/:locationId/tags	 	Sub-Account
 	POST /social-media-posting/:locationId/tags/details	 	Sub-Account
surveys.readonly	GET /surveys/	 	Sub-Account
 	GET /surveys/submissions	 	Sub-Account
users.readonly	GET /users/	 	Sub-Account, Agency
 	GET /users/:userId	 	Sub-Account, Agency
users.write	POST /users/	 	Sub-Account, Agency
 	DELETE /users/:userId	 	Sub-Account, Agency
 	PUT /users/:userId	 	Sub-Account, Agency
workflows.readonly	GET /workflows/	 	Sub-Account
courses.write	POST courses/courses-exporter/public/import	 	Sub-Account
emails/builder.readonly	GET emails/builder	 	Sub-Account
emails/builder.write	POST emails/builder	 	Sub-Account
 	POST /emails/builder/data	 	Sub-Account
 	DELETE /emails/builder/:locationId/:templateId	 	Sub-Account
blogs/post.write	POST /blogs/posts	 	Sub-Account
blogs/post-update.write	PUT /blogs/posts/:postId	 	Sub-Account
blogs/check-slug.readonly	GET /blogs/posts/url-slug-exists	 	Sub-Account
blogs/category.readonly	GET /blogs/categories	 	Sub-Account
blogs/author.readonly	GET /blogs/authors	 	Sub-Account

Authorization
HighLevel supports the Authorization Code Grant flow with v2 APIs. Please find the step-by-step procedure to use and understand the OAuth 2.0 flow.

Here's a Loom Video to walk you through the entire process.

1. Register an OAuth app
Go to the Marketplace
Sign up for a developer account.
Go to "My Apps," and click on "Create App."
Fill up the required details in the form, then your app will be created.
Click on the app, and it will take you to settings where you can configure the scopes, generate the keys, etc.
2. Add the app to your desired location
Make the location/agency Admin go to the app's Authorization Page URL.
They select the location they want to connect.
They are redirected to the redirect URL with the Authorization Code.
Use the Authorization Code to get the Access token via the Get Access Token API under OAuth 2.0.
Use the Access Token to call any API.
3. Get the app's Authorization Page URL
To generate the Authorization Page URL for an app, replace the client_id, redirect_uri, and scope in the template below. Then, redirect the location/agency admin trying to install your app to the URL.

For standard Auth URL flow:
https://marketplace.gohighlevel.com/oauth/chooselocation?
response_type=code&
redirect_uri=https://myapp.com/oauth/callback/gohighlevel&
client_id=CLIENT_ID&
scope=conversations/message.readonly conversations/message.write
For White-labeled Auth URL flow:
https://marketplace.leadconnectorhq.com/oauth/chooselocation?
response_type=code&
redirect_uri=https://myapp.com/oauth/callback/gohighlevel&
client_id=CLIENT_ID&
scope=conversations/message.readonly conversations/message.write
NOTE: For the users who are not logged in to the application at the time of giving consent, developer has option to initiate login in new tab or in same tab. For initiating login in same tab, developer need to append &loginWindowOpenMode=self to authorization url. If the query param not passed, login in new tab would be default.

When a user grants access, their browser is redirected to the specified redirect URI, and the Authorization Code is passed inside the code query parameter.

https://myapp.com/oauth/callback/gohighlevel?code=7676cjcbdc6t76cdcbkjcd09821jknnkj
OAuth FAQs
How long are the access tokens valid?
The access tokens are valid for a day. After that, you can use the refresh token to get a new access token which will be valid for another day.

How long are the refresh tokens valid?
The refresh tokens are valid for a year unless they are used. If they are used, the new refresh token is valid for a year as well.

How should we handle token expiry?
You should:

Make a request to any of our APIs using the accessToken.
If you get a response saying that the token is expired, refresh the token using our API and save the new access token and refresh token in your database.
Make the request again with the new accessToken.
You can write a wrapper function on your end to achieve this. You can use it for all the API calls you make to our APIs.

What are current rate limits for API 2.0?
GHL has implemented rate limits on our public V2 APIs using OAuth to ensure optimal performance and stability. These limits have been adjusted to:

Burst limit: A maximum of 100 API requests per 10 seconds for each Marketplace app (i.e., client) per resource (i.e., Location or Company). Daily limit: 200,000 API requests per day for each Marketplace app (i.e., client) per resource (i.e., Location or Company).

These new limits contribute to better overall performance and stability of our system.

To monitor your limited usage, refer to the following API response headers:

'X-RateLimit-Limit-Daily': Your daily limit 'X-RateLimit-Daily-Remaining': The remaining number of requests for the day 'X-RateLimit-Interval-Milliseconds': The time interval for burst requests 'X-RateLimit-Max': The maximum request limit in the specified time interval 'X-RateLimit-Remaining': The remaining number of requests in the current time interval

Example: If the 'GHL-APP' is installed on two locations (Sub-account A and Sub-account B) on the GHL Marketplace, the rate limits for each location would be as follows:

Sub-account A: 'GHL-APP' can make 200,000 API requests per day and 100 API requests per 10 seconds.
Sub-account B: 'GHL-APP' can make 200,000 API requests per day and 100 API requests per 10 seconds.

Billing Webhook
This webhook is essential for externally billed apps within our marketplace. It must be accessed by developers to authorize the installation of the app.

The primary purpose of this webhook is to capture and update payment information for apps that employ a Paid business model and do not utilize HighLevel's internal billing mechanism.

1. Prerequisites for using this webhook
Before using this webhook, ensure that you meet the following prerequisites on the Marketplace:

You should have an app with a Business Model marked as Paid.
External Billing must be enabled for your app.
You must have entered the Billing URL.
2. Retrieving Parameters from the Billing URL
When an Agency or Location installs your app, they will be redirected to the Billing URL specified in the configuration. You will receive the following parameters in the URL:

Parameter Name	Possible Values	Notes
clientId	<client_id>	Used for validation.
installType	location, agency	You will receive agency,location in case of both agency and location.
locationId	<location_id>	You will receive this in case of location or agency,location.
companyId	<agency_id>	You will receive this in case of agency or agency,location.
3. Using The Webhook
After successfully processing the payment on your end, you need to make a request to our billing webhook endpoint:

https://services.leadconnectorhq.com/oauth/billing/webhook
The parameters you need to include in the webhook request are as follows:

Request Method: POST

Request Headers:

Name	Value	Notes
x-ghl-client-key	Your client key	This should be from the same client for which you are authorizing the payment.
x-ghl-client-secret	Your Client Secret	The corresponding client secret for the client key used.
Content-Type	application/json	
Request Body:

Name	Value	Notes
clientId	Your client ID	
authType	Enum	Possible values are company and location.
locationId	<location_id>	Required when authType is location.
companyId	<company_id>	Required when authType is company.
subscriptionId	Your subscription ID	You can include this if you have configured a subscription model.
paymentId	Your Payment ID	In case of a one-time payment model, you can send this parameter.
amount	Billed Amount	Required.
status	Enum	Possible values are COMPLETED and FAILED.
paymentType	Enum	Possible values are one_time and recurring.
Example
Here is a sample cURL command for the webhook request:

curl --location 'https://services.leadconnectorhq.com/oauth/billing/webhook' \
--header 'x-ghl-client-key: <client_key>' \
--header 'x-ghl-client-secret: <client_secret>' \
--header 'Content-Type: application/json' \
--data '{
    "clientId": "<client_id>",
    "authType": "location",
    "locationId": "<location_id>",
    "subscriptionId": "<subscription_id>",
    "paymentId": "<payment_id>",
    "amount": 12,
    "status": "COMPLETED",
    "paymentType": "recurring"
}'
Webhook FAQs
Can I get multiple location ids in the Billing URL?
Yes, in the case of multiple installations, you will receive a list of locationIds in a comma-separated format in the billing URL.

Can I update for multiple locations in one call?
No, you need to trigger the webhook for each location and company separately.

External Authentication
External authentication enables developers to authenticate HighLevel users using their credentials with the developer’s system before installing the application on HighLevel.

This feature allows you to configure custom authentication fields as necessary, such as:

apiKey
username
password
How to enable external authentication on an application?
Navigate to Developer Marketplace > My Apps > select your app and click on ‘External Authentication’ tab in the navigation pane.

drawing

There are three sections available.

Section 1: Configure your fields
This section contains all the fields that developers want to ask from users while installing the application.

drawing

To add a field to the user’s authentication form, you may configure the following:
Label: It is a helpful text describing the field.
Key: The key that holds the value of the user's input. You may pass the user’s input to your authentication endpoint in the header or body by using the key.
Type: The type of input shown to the user. Currently, two field types are supported: "text" and "password."
Required: Is the field required?
Help Text: A brief about the field that is displayed to the user. The help text can be used to indicate where the user may get the required credentials. You may include hyperlinks here.
Default field: Default value to be sent in case the user leaves the field empty.
NOTE: We currently support a maximum of three fields only.

drawing

Section 2: Configure authentication endpoint
This section lets you configure the HTTP request template that would be made when a user tries to install the application.



drawing

Type of request: The request can be one of "GET", "POST", "PUT" or "PATCH" (When GET is selected, you will not be able to configure the request body) URL: It is the URL that would be hit with the request. URL params: The params that need to be sent with the request. HTTP headers: The headers that need to be sent with the request. Request Body: The body that needs to be sent with the request.

IMPORTANT NOTE:
You may need to pass the user-entered value, such as API Key/ Username / Password for authentication. You can easily access user input data from the userData object, which has the key of field and value entered by the users and can be accessed with {{userData.key}}. For example, if your field’s key is ‘apiKey’, then you may access the user-entered value for the ‘apiKey’ using {{userData.apiKey}}.
For external auth verification to complete the authentication url should return one of the following status codes: 200, 201, 202, 204.

Section 3: Test your authentication
This section will allow developers to test the authentication flow with sample values.

drawing



drawing

End user experience during app installation
At the time of installation, user would be asked to enter the fields that you have configured. Here’s a sample authentication form displayed to the user at the time of installation.

drawing

External authentication - request parameters
Key	Type	Details
companyId	string	
This parameter is set to agencyId if the application was installed by an agency;
It will be null if the application was installed by a location
{field_key}	string	
Key: The key for the parameter is the key of the field.
There can be a maximum of three fields and hence three keys in the request parameter.
The value for the parmeters will be as per the agency user’s response
approveAllLocations	boolean	
True - if “Select all N sub-accounts” checkbox was selected during installation
False - if “Select all N sub-accounts” checkbox was not selected during installation
drawing
locationId	string[]	
If approveAllLocations = false, this parameter contains an array of locationIds selected during installation
If approveAllLocation = true, this parameter is set to null.
excludedLocations	string[]	
If approveAllLocations = false, this parameter is set to null.
If approveAllLocation = true, this parameter contains an array of locationIds which were not selected during installation
NOTE:
In the POST, PATCH, and PUT requests, the above fields would be sent as part of the body
In the GET request, the fields would be passed as params
Examples:
Say an agency has 5 locations - A,B,C,D,E
Let’s assume that the app requires two fields, “username” and “password”.
Scenario 1: User selects location A while installing the app

{
"companyId": "123",
"locationId": ["A"],
"username" : "user1",
"password" : "password123",
"approveAllLocations": false,
"excludedLocations": null
}
Scenario 2: User selects locations A and B while installing the app

{
"companyId": "123",
"locationId": ["A","B"],
"username" : "user1",
"password" : "password123",
"approveAllLocations": false,
"excludedLocations": null
}
Scenario 3: User selects “Select all 5 locations”

{
"companyId": "123",
"locationId": null,
"username" : "user1",
"password" : "password123",
"approveAllLocations": true,
"excludedLocations": null
}
Scenario 4: User selects “Select all 5 locations”, but unchecks location C and D

{
"companyId": "123",
"locationId": null,
"username" : "user1",
"password" : "password123",
"approveAllLocations": true,
"excludedLocations": ["C","D"]
}
Some important notes on the external authentication
The new External Authentication feature is backward compatible. Existing apps with the existing external auth setup will continue to work without any action required by developers or app users.
If you update external auth settings, existing app users would need to re-install the application for new external auth to take place. This is a current limitation in beta that will be addressed shortly.

Webhook Authentication Guide
How It Works
1. Receiving the Webhook
When your endpoint receives a webhook request, it will include the following:

Headers:
x-wh-signature: The digital signature of the payload.
Body: The payload containing the timestamp, webhook ID, and data.
Example payload:

{
"timestamp": "2025-01-28T14:35:00Z",
"webhookId": "abc123xyz",
...<add_other_webhook_data>
}
2. Verifying the Signature
To verify the authenticity of the webhook request:

Retrieve the x-wh-signature header from the request.
Use the public key mentioned below to verify the signature:
Compute the signature on your end using the payload and the public key.
Compare your computed signature with the x-wh-signature header.
-----BEGIN PUBLIC KEY-----
MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAokvo/r9tVgcfZ5DysOSC
Frm602qYV0MaAiNnX9O8KxMbiyRKWeL9JpCpVpt4XHIcBOK4u3cLSqJGOLaPuXw6
dO0t6Q/ZVdAV5Phz+ZtzPL16iCGeK9po6D6JHBpbi989mmzMryUnQJezlYJ3DVfB
csedpinheNnyYeFXolrJvcsjDtfAeRx5ByHQmTnSdFUzuAnC9/GepgLT9SM4nCpv
uxmZMxrJt5Rw+VUaQ9B8JSvbMPpez4peKaJPZHBbU3OdeCVx5klVXXZQGNHOs8gF
3kvoV5rTnXV0IknLBXlcKKAQLZcY/Q9rG6Ifi9c+5vqlvHPCUJFT5XUGG5RKgOKU
J062fRtN+rLYZUV+BjafxQauvC8wSWeYja63VSUruvmNj8xkx2zE/Juc+yjLjTXp
IocmaiFeAO6fUtNjDeFVkhf5LNb59vECyrHD2SQIrhgXpO4Q3dVNA5rw576PwTzN
h/AMfHKIjE4xQA1SZuYJmNnmVZLIZBlQAF9Ntd03rfadZ+yDiOXCCs9FkHibELhC
HULgCsnuDJHcrGNd5/Ddm5hxGQ0ASitgHeMZ0kcIOwKDOzOU53lDza6/Y09T7sYJ
PQe7z0cvj7aE4B+Ax1ZoZGPzpJlZtGXCsu9aTEGEnKzmsFqwcSsnw3JB31IGKAyk
T1hhTiaCeIY/OwwwNUY2yvcCAwEAAQ==
-----END PUBLIC KEY-----
If they match, the payload is valid and comes from a trusted source.

3. Handling Replay Attacks
To protect against replay attacks:

Ensure the timestamp in the payload is within an acceptable time window (e.g., 5 minutes).
Reject any requests with duplicate webhookId values.
4. Handling Public Key Rotation
Please keep an eye on your email and our social channels for notices regarding public key rotation to stay updated. The public key in this doc is the one to use to validate the webhook payload.

Example Code
Here’s an example of how to verify the signature in Node.js:

const crypto = require('crypto');
const publicKey = `<use_the_above_key>`;
function verifySignature(payload, signature) {
const verifier = crypto.createVerify('SHA256');
verifier.update(payload);
verifier.end();
return verifier.verify(publicKey, signature, 'base64');
}
// Example usage
const payload = JSON.stringify({
"timestamp": "2025-01-28T14:35:00Z",
"webhookId": "abc123xyz",
...<add_other_webhook_data>
});
const signature = "<received-x-wh-signature>";
const isValid = verifySignature(payload, signature);
return isValid;
Summary
These new features significantly enhance the security of webhook integrations. By including a timestamp, webhook ID, and a digitally signed payload, we ensure your data remains secure and trusted. Implement these changes today to keep your integrations robust and secure!

Get Access Token
post
https://services.leadconnectorhq.com/oauth/token
Use Access Tokens to access GoHighLevel resources on behalf of an authenticated location/company.

Request
Body

application/x-www-form-urlencoded

application/x-www-form-urlencoded
client_id
string
required
The ID provided by GHL for your integration

client_secret
string
required
grant_type
string
required
Allowed values:
authorization_code
refresh_token
code
string
refresh_token
string
user_type
string
The type of token to be requested

Allowed values:
Company
Location
Example:
Location
redirect_uri
string
The redirect URI for your application

Example:
https://myapp.com/oauth/callback/gohighlevel
Responses
200
400
401
422
Successful response

Body

application/json

application/json
access_token
string
Example:
ab12dc0ae1234a7898f9ff06d4f69gh
token_type
string
Example:
Bearer
expires_in
number
Example:
86399
refresh_token
string
Example:
xy34dc0ae1234a4858f9ff06d4f66ba
scope
string
Example:
conversations/message.readonly conversations/message.write
userType
string
Example:
Location
locationId
string
Location ID - Present only for Sub-Account Access Token

Example:
l1C08ntBrFjLS0elLIYU
companyId
string
Company ID

Example:
l1C08ntBrFjLS0elLIYU
approvedLocations
array[string]
Approved locations to generate location access token

Example:
["l1C08ntBrFjLS0elLIYU"]
userId
string
required
USER ID - Represent user id of person who performed installation

Example:
l1C08ntBrFjLS0elLIYU
planId
string
Plan Id of the subscribed plan in paid apps.

Example:
l1C08ntBrFjLS0elLIYU

Get Location Access Token from Agency Token
post
https://services.leadconnectorhq.com/oauth/locationToken
This API allows you to generate locationAccessToken from AgencyAccessToken

Request
Headers
Version
string
required
API Version

Allowed value:
2021-07-28
Body

application/x-www-form-urlencoded

application/x-www-form-urlencoded
companyId
string
required
Company Id of location you want to request token for

locationId
string
required
The location ID for which you want to obtain accessToken

Responses
200
400
401
422
Successful response

Body

application/json

application/json
access_token
string
Location access token which can be used to authenticate & authorize API under following scope

Example:
ab12dc0ae1234a7898f9ff06d4f69gh
token_type
string
Example:
Bearer
expires_in
number
Time in seconds remaining for token to expire

Example:
86399
scope
string
Scopes the following accessToken have access to

Example:
conversations/message.readonly conversations/message.write
locationId
string
Location ID - Present only for Sub-Account Access Token

Example:
l1C08ntBrFjLS0elLIYU
planId
string
Plan Id of the subscribed plan in paid apps.

Example:
l1C08ntBrFjLS0elLIYU
userId
string
required
USER ID - Represent user id of person who performed installation

Example:
l1C08ntBrFjLS0elLIYU

Get Location where app is installed
get
https://services.leadconnectorhq.com/oauth/installedLocations
This API allows you fetch location where app is installed upon

Request
Query Parameters
isInstalled
boolean
Filters out location which are installed for specified app under the specified company

Examples:
true
limit
string
Parameter to limit the number installed locations

Default:
20
Examples:
10
onTrial
boolean
Filters out locations which are installed for specified app in trial mode

Examples:
true
planId
string
Filters out location which are installed for specified app under the specified planId

Examples:
true
query
string
Parameter to search for the installed location by name

Examples:
location name
skip
string
Parameter to skip the number installed locations

Default:
0
Examples:
1
appId
string
required
Parameter to search by the appId

Examples:
tDtDnQdgm2LXpyiqYvZ6
companyId
string
required
Parameter to search by the companyId

Examples:
tDtDnQdgm2LXpyiqYvZ6
Headers
Version
string
required
API Version

Allowed value:
2021-07-28
Responses
200
400
401
422
Successful response

Body

application/json

application/json
locations
array[object]
_id
string
required
Location ID

Example:
0IHuJvc2ofPAAA8GzTRi
name
string
required
Name of the location

Example:
John Deo
address
string
required
Address linked to location

Example:
47 W 13th St, New York, NY 10011, USA
isInstalled
boolean
Check if the requested app is installed for following location

Example:
true
count
number
Total location count under the company

Example:
1231
installToFutureLocations
boolean
Boolean to control if user wants app to be automatically installed to future locations

Example:
true

BadRequestDTO
Export
statusCode
number
Example:
400
message
string
Example:
Bad Request
{
  "statusCode": 400,
  "message": "Bad Request"

UnauthorizedDTO
Export
statusCode
number
Example:
401
message
string
Example:
Invalid token: access token is invalid
error
string
Example:
Unauthorized
{
  "statusCode": 401,
  "message": "Invalid token: access token is invalid",
  "error": "Unauthorized"
}

GetAccessCodebodyDto
Export
client_id
string
required
The ID provided by GHL for your integration

client_secret
string
required
grant_type
string
required
Allowed values:
authorization_code
refresh_token
code
string
refresh_token
string
user_type
string
The type of token to be requested

Allowed values:
Company
Location
Example:
Location
redirect_uri
string
The redirect URI for your application

Example:
https://myapp.com/oauth/callback/gohighlevel
{
  "client_id": "string",
  "client_secret": "string",
  "grant_type": "authorization_code",
  "code": "string",
  "refresh_token": "string",
  "user_type": "Company",
  "redirect_uri": "https://myapp.com/oauth/callback/gohighlevel"
}

GetAccessCodeSuccessfulResponseDto
Export
access_token
string
Example:
ab12dc0ae1234a7898f9ff06d4f69gh
token_type
string
Example:
Bearer
expires_in
number
Example:
86399
refresh_token
string
Example:
xy34dc0ae1234a4858f9ff06d4f66ba
scope
string
Example:
conversations/message.readonly conversations/message.write
userType
string
Example:
Location
locationId
string
Location ID - Present only for Sub-Account Access Token

Example:
l1C08ntBrFjLS0elLIYU
companyId
string
Company ID

Example:
l1C08ntBrFjLS0elLIYU
approvedLocations
array[string]
Approved locations to generate location access token

Example:
["l1C08ntBrFjLS0elLIYU"]
userId
string
required
USER ID - Represent user id of person who performed installation

Example:
l1C08ntBrFjLS0elLIYU
planId
string
Plan Id of the subscribed plan in paid apps.

Example:
l1C08ntBrFjLS0elLIYU
{
  "access_token": "ab12dc0ae1234a7898f9ff06d4f69gh",
  "token_type": "Bearer",
  "expires_in": 86399,
  "refresh_token": "xy34dc0ae1234a4858f9ff06d4f66ba",
  "scope": "conversations/message.readonly conversations/message.write",
  "userType": "Location",
  "locationId": "l1C08ntBrFjLS0elLIYU",
  "companyId": "l1C08ntBrFjLS0elLIYU",
  "approvedLocations": [
    "l1C08ntBrFjLS0elLIYU"
  ],
  "userId": "l1C08ntBrFjLS0elLIYU",
  "planId": "l1C08ntBrFjLS0elLIYU"
}

UnprocessableDTO
Export
statusCode
number
Example:
422
message
array[string]
Example:
["Unprocessable Entity"]
error
string
Example:
Unprocessable Entity
{
  "statusCode": 422,
  "message": [
    "Unprocessable Entity"
  ],
  "error": "Unprocessable Entity"
}

GetLocationAccessCodeBodyDto
Export
companyId
string
required
Company Id of location you want to request token for

locationId
string
required
The location ID for which you want to obtain accessToken

{
  "companyId": "string",
  "locationId": "string"
}

GetLocationAccessTokenSuccessfulResponseDto
Export
access_token
string
Location access token which can be used to authenticate & authorize API under following scope

Example:
ab12dc0ae1234a7898f9ff06d4f69gh
token_type
string
Example:
Bearer
expires_in
number
Time in seconds remaining for token to expire

Example:
86399
scope
string
Scopes the following accessToken have access to

Example:
conversations/message.readonly conversations/message.write
locationId
string
Location ID - Present only for Sub-Account Access Token

Example:
l1C08ntBrFjLS0elLIYU
planId
string
Plan Id of the subscribed plan in paid apps.

Example:
l1C08ntBrFjLS0elLIYU
userId
string
required
USER ID - Represent user id of person who performed installation

Example:
l1C08ntBrFjLS0elLIYU
{
  "access_token": "ab12dc0ae1234a7898f9ff06d4f69gh",
  "token_type": "Bearer",
  "expires_in": 86399,
  "scope": "conversations/message.readonly conversations/message.write",
  "locationId": "l1C08ntBrFjLS0elLIYU",
  "planId": "l1C08ntBrFjLS0elLIYU",
  "userId": "l1C08ntBrFjLS0elLIYU"
}

InstalledLocationSchema
Export
_id
string
required
Location ID

Example:
0IHuJvc2ofPAAA8GzTRi
name
string
required
Name of the location

Example:
John Deo
address
string
required
Address linked to location

Example:
47 W 13th St, New York, NY 10011, USA
isInstalled
boolean
Check if the requested app is installed for following location

Example:
true
{
  "_id": "0IHuJvc2ofPAAA8GzTRi",
  "name": "John Deo",
  "address": "47 W 13th St, New York, NY 10011, USA",
  "isInstalled": true
}

GetInstalledLocationsSuccessfulResponseDto
Export
locations
array[object]
_id
string
required
Location ID

Example:
0IHuJvc2ofPAAA8GzTRi
name
string
required
Name of the location

Example:
John Deo
address
string
required
Address linked to location

Example:
47 W 13th St, New York, NY 10011, USA
isInstalled
boolean
Check if the requested app is installed for following location

Example:
true
count
number
Total location count under the company

Example:
1231
installToFutureLocations
boolean
Boolean to control if user wants app to be automatically installed to future locations

Example:
true
{
  "locations": [
    {
      "_id": "0IHuJvc2ofPAAA8GzTRi",
      "name": "John Deo",
      "address": "47 W 13th St, New York, NY 10011, USA",
      "isInstalled": true
    }
  ],
  "count": 1231,
  "installToFutureLocations": true
}

