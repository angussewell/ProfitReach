

Refresh

Follow

Ehab Ghabour
0:00
Nov 27, 2023
Hi i'm getting 400 errors when provisioning my app to any of my subaccounts. app was working fine i even created a new app but did not help
A
Anonymous
Jan 25, 2024
I am also having this issue

SIFTR Sales
Jan 30, 2024
I had this initially, but make sure that on this page: (https://highlevel.stoplight.io/docs/integrations/a04191c0fabf9-authorization), step 3, that the app in your app marketplace corresponds with the redirect url AND the scopes are correct. I found that my scopes were incorrect and received that error until I corrected the scopes. Here is the example: https://marketplace.gohighlevel.com/oauth/chooselocation?
response_type=code&
redirect_uri=https://myapp.com/oauth/callback/gohighlevel&
client_id=CLIENT_ID&
scope=conversations/message.readonly conversations/message.write

SIFTR Sales
Jan 30, 2024
The issue I am having now is that not all the endpoints in API 2.0 are represented by the available scopes, which makes API 2.0 far from ready to deploy and replace API 1.0. I would strongly suggest API 1.0 not be replaced for at least 6 months after API 2.0 is complete. For example, the endpoint for Add Followers exists, but its not accessible with the available scopes. Critical error. The other critical error is how the conversations endpoints work. Please vote for this: https://ideas.gohighlevel.com/automations/p/new-contacts-followers-almost-uslesshttps://ideas.gohighlevel.com/automations/p/new-contacts-followers-almost-uslesshttps://ideas.gohighlevel.com/automations/p/new-contacts-followers-almost-usless

Craig Pretzinger
May 4, 2024
OMG THANK YOU!! I WAS USING Underdscores!!!
Reply

Click for more reactions

Collapse replies

Антон Гетьман
0:00
Jan 15, 2024
Did anyone tried to use it in MS Power Automate?

Saifullah Kunbher
Jan 21, 2024
yes

Esiah Stephanie Naparan
Aug 22, 2024
Did it work?
Reply

Click for more reactions

Kaan Götürmen
0:00
Jan 26, 2024
Did you have issue getting the API key or wasted a lot of time ? 

Get your API key in under 2 minutes here: https://www.gohilevelapikey.com

H1. GFX
May 2, 2024
29 bucks to get the key ?
Reply

Click for more reactions

Douglas Tobar
0:00
Jan 31, 2024

Can I obtain the access token directly through https://highlevel.stoplight.io/docs/integrations/00d0c0ecaa369-get-access-token without using the authorization code? I'm facing challenges automating this process on Cloud Functions using Python because the authorization code prompts a window where I have to manually select the subaccount. How can I automate the token retrieval for each subaccount without going through the authorization step?

2 more replies
R
Regie Mon Averion
July 23, 2024
did you solve this? have the same issue

Frank Dambra
July 31, 2024
(edited)
This is the exact problem I'm having. The 'code' in the query params that is used to generate the authentication token at callback seems to only be instantiated by a manual selection of an account. Are we missing something here or does this API truly only function in the context of a user having to manually login?
Reply

Click for more reactions

Brandon Thomas
0:00
Feb 8, 2024

https://github.com/GoHighLevel/oauth-demo/blob/main/lib/callback.js

1 more reply

Norman Love
Apr 14, 2024
No. they are basically getting rid of normal API's, they want Apps. its a bad move on their part where they dont really put developers first

Nick Gillis
May 24, 2024
👍
Reply

Click for more reactions

Rohit Sharma
0:00
Feb 13, 2024
I want to integrate this with my wordpress plugin. How can I integrate this can you help me with this ?
Reply

Click for more reactions

Gareth Millward
0:00
Feb 28, 2024
What about the people who are just using the current API V1 to post contact data from lead forms on their websites? This seems like a total headache and overkill, I realise it has to be done, but my word, surely there is a simple way. 

Norman Love
Apr 14, 2024
🙏

Frank Dambra
July 31, 2024
Yes I wonder if this will even be possible anymore? It seems like a login with the GHL UI is necessary to start the whole long-winded authentication process.
Reply

Click for more reactions

George Eracleous
0:00
Mar 5, 2024
Hi there. I successfully receive a token and place it in the authorization header (with "Bearer" prefix) but I get the following error when I actually do an API request to some endpoint:

`Token's user type mismatch!`

I made 10000% sure that I pass "user_type" (Location) in the token request. 

I am stuck! Any ideas? Help?

Mridula vats
July 11, 2024
did you resolve it?
Reply

Click for more reactions

Deependra Gupta
0:00
May 13, 2024
I have followed the approach but got 400 error.

Esteban Valbuena
Aug 1, 2024
In case you need help with this https://theghlpartner.com/go-high-level-api-integrations
Reply

Click for more reactions

Esteban Valbuena
0:00
Aug 1, 2024
In case you need help with this https://theghlpartner.com/go-high-level-api-integrations
Reply

Click for more reactions

Nitesh Kumar
0:00
Sept 12, 2024
How to get location ID, will you describe step by step ?
Reply

Click for more reactions

Frank Dambra
0:00
Sept 16, 2024
I gave up trying to use this for server to server data object transmissions because it wasnt even giving me correct scopes back with valid API calls. - I surmise the ultimate solution (in the event we had time for app dev) would be to set up a node server like this man has going, generate the initial keys, then set up an infinite daily refresh for new tokens that are passed in as a variable to whatever API calls you want to make from server to server. In our case we just wanted to post a contact object on form submission to the respective GHL subaccount. We decided not to do this because of lack of devlopment time. Instead we used a native GHL form and passed info we needed into hidden fields in the form via query parameters. Kind of unfortunate that we had to jerry-rig this but we did not have time to deal with debugging, app dev, and other hassles from this API
Reply

Click for more reactions
This comment was deleted.

3 more replies

Douglas Tobar
Feb 5, 2024
🙏

Stanislav Didukh
May 1, 2024
Thanks man, the most helpful comment!
Reply

Click for more reactions

Joedel Espinosa
0:01
May 16, 2024
Anyone here having a hard time automating their tokens, just email me I can help you.

3 more replies

Frank Dambra
July 31, 2024
Can you send me an email? frank@goodagency.com

Sergio Garcia
Aug 1, 2024
i will be glad if you can help me please! sergiog@myfirstassistant.com
Reply

Click for more reactions

Norman Love
0:03
Apr 14, 2024
Your API sucks! Fire whoever thought this was ok. its not

3 more replies

Frank Dambra
July 30, 2024
🎯

Jonathan Matthews
Jan 7
👍
Reply

Click for more reactions
a
adam ja
0:06
Feb 19, 2024
WHY so complicated!!! 

and we are in 2024 and you post a video with 480p quality, really!!!

Alexa Centerfield
Feb 23, 2024
🙌
Reply

Click for more reactions
a
adam ja
0:06
Feb 19, 2024
How to skip the location selection if I have a node app?
Reply

Click for more reactions

Wendell Encorporado
0:10
Jan 10, 2024
Do you have a sample implementation using Nextjs?
Reply

Click for more reactions

Anand Rana
0:14
Dec 24, 2024
if we select agency we are facing error 
Reply

Click for more reactions

Jonathan Matthews
1:28
Jan 7
trying to connect a zapier alternative (n8n) to ghl via this method, what a horrendously terrible process to do something simple, stuck on 400 errors
Reply

Click for more reactions

Darran Hall
1:31
Nov 22, 2023
ntacts.readonly
Reply

Click for more reactions

Info Emberholdings
2:02
July 25, 2024
Where is the GitHub link?

Info Emberholdings
Aug 9, 2024
👍

Val Kuikman
Sept 2, 2024
👍
Reply

Click for more reactions

Jérémy ESCOLANO
2:04
May 22, 2024
still facing the 400 issue, any clue to solve this ?
Reply

Click for more reactions

Hưng
2:11
July 8, 2024
I encountered a 401 error. I've tried several clientId's but it still shows error 401 {
"status": 401,
"message": "HttpException: No integration found with the id: 668b95fde01d40724100da6b",
"name": "HttpException",
"traceId": "6bf041ed-02bf-455d-8783-4923e6888b03"
} Has anyone else encountered a similar issue?

Esteban Valbuena
Aug 1, 2024
In case you need help with this https://theghlpartner.com/go-high-level-api-integrations
Reply

Click for more reactions
A
Anonymous
2:25
Sept 16, 2024
what is the redirect URL if using zapier? Make has a redirect URL for GHL, but not sure what to use for zapier?
Reply

Click for more reactions

Shubham Rana
2:43
Dec 12, 2023
Hi Support,
Is there any php curl version api for authentication?

Антон Гетьман
Jan 15, 2024
👍
Reply

Click for more reactions

Ed Middlebrooks
3:20
Jan 20, 2024
So is this Webhook URL just random with no setup or anything you need to do?

SIFTR Sales
Jan 30, 2024
In a way, the webhook url can be anything made up OR you can make it perform a task. For example, I created a url that reads the 'code' parameter and writes it to a file. 
Reply

Click for more reactions

Camilo Buitrago
3:39
June 7, 2024
Why make it easy if you can make it hard? Really!! What a nightmare and overly complex way to authenticate a simple API. Why not offer a simple API Key and allow us to integrate it from server to server? 

Will Cooksey
July 30, 2024
🙏
Reply

Click for more reactions

DEVMIUP srl Milano
3:49
July 26, 2024
Guys, I did it!!!
I just had to clarify this, without this useless 14 minute video.
You can follow the video up to minute 3:50 then:
- access the url (read the guide https://highlevel.stoplight.io/docs/integrations/a04191c0fabf9-authorization)
pay attention that the url is written all on one line
- copy and paste in the browser
- select "Agency" or the Sub-account you want (I use Agency) and continue
- once the redirect is done copy the "code" parameter and save it
- call the "Get access token" api with grant_type='authorization_code' and save the expiration date, the token and the refresh_token in the database
- the token expires after one day, before using it, check the expiration date in the db, if it has expired:
call the "Get access token" api with grant_type='refresh_token' using the last saved refresh_token

Basically the "code" parameter is only needed the first time, then you can always get new tokens using the last valid refresh_token with the "Get access token" api with grant_type='refresh_token' .
I hope I was clear, I don't understand why they didn't explain it like this in the documentation.

Daysha Blount
4d
@devmiup did your replace anything in the url? I keep getting no client id
Reply

Click for more reactions
This comment was deleted.

1 more reply

Rebecca Holka
Nov 12, 2024
🔥

Rebecca Holka
Nov 12, 2024
Yes here is the guide in HL for Private integrations. https://help.gohighlevel.com/support/solutions/articles/155000003054-private-integrations-everything-you-need-to-know
Reply

Click for more reactions

Ankur Rana
4:19
May 10, 2024
How can i call getcontacts API via PHP
Reply

Click for more reactions

Stephen Malone
4:40
Dec 19, 2024
is there an updated video? im getting a 400 error and not seen any solution for this in all the comments. kind of crazy this video is a year old now. 
Reply

Click for more reactions

Slavik Shen
4:54
Dec 21, 2023
How to test the installation?  Is there anyway to install the private app?

Nandha Hajari
May 30, 2024
👍
Reply

Click for more reactions

Mike Birtwistle
5:21
Sept 18, 2024
I have followed this exactly and I keep getting invalid authorization with no explanation why?
Reply

Click for more reactions
A
Anonymous
5:22
Mar 8, 2024
That's completely stupid. Just use the authorization link and put in on browser without any code also can work
Reply

Click for more reactions

Greg Hadley
5:25
Nov 1, 2023
you have to run an application just to get a fkin auth key? 

2 more replies

Kaan Götürmen
Jan 22, 2024
I made an template of my solution: https://ghlapptemplate.com

Craig Pretzinger
June 7, 2024
That doesnt work?
Reply

Click for more reactions

Gino Murin
5:31
Dec 7, 2024
You're confusing people here by using code when it's unnecessary. You should just be manually typing the URL into the browser. i understand that you aren't wanting to expose secrets here, but there was a better way to go about this that wouldn't have made it seem like you need to spin up a server just to get the auth code.
Reply

Click for more reactions

Deepak Suthar
5:32
May 2, 2024
do you have to have access to the Agency account for this to work, or can I get this to work at just the sub-account level?  I keep getting access is denied.

Cyril Nicko Gaspar
May 2, 2024
Sub-account access is enough. You may check agency and sub-account on app creation, but do not set it to public, set to private instead.

Deepak Suthar
May 2, 2024
Thanks! Is there a specific role / permission needed for this to work? 
Reply

Click for more reactions

Ed Middlebrooks
5:34
Jan 20, 2024
(edited)
What was that statement? "You have the code available on get hyresatopolotree?!"  Please re-record that or something and tell us what you said.

1 more reply

Ed Middlebrooks
June 7, 2024
👍

Craig Pretzinger
June 7, 2024
😆
Reply

Click for more reactions

Michael Romrell
5:51
Aug 23, 2023
How can we get the Code (Needed for the Access Token) WITHOUT manually selecting a location on a redirected page?  (Basically: how do we authenticate server-to-server api calls that don't need manual input from a user?)

6 more replies

Splitwire ML
July 18, 2024
I need help on this as well Joedel, please tell me your email.

Sergio Garcia
Aug 1, 2024
i will be glad if you can help me please! sergiog@myfirstassistant.com
Reply

Click for more reactions

Rahul SIngh
5:52
Feb 8, 2024
(edited)
422 Unprocessable Entity
{
  "statusCode": 422,
  "message": [
    "refresh_token should not be empty",
    "refresh_token must be a string"
  ],
  "error": "Unprocessable Entity",
  "traceId": "6b2872e6-c085-4be0-ae2e-5250ca35795d"
}

Please help me
Reply

Click for more reactions

Satyajit Singh
5:53
June 18, 2024
when i redirect through the client id with this url 
https://marketplace.gohighlevel.com/oauth/chooselocation?
response_type=code&
redirect_uri=https://myapp.com/oauth/callback/gohighlevel&
client_id=CLIENT_ID&
scope=conversations/message.readonly conversations/message.write
it can says no clientid found while i am correctly place the client id please give a solution

DEVMIUP srl Milano
July 25, 2024
me too!! did you resolve this problem? It's fucking hard this implementation!
Reply

Click for more reactions

Anas Ch
5:54
Jan 18, 2024
When I hit the initiate endpoint the page opens but they say go to gohighlevel and when I go to the gohighlevel and then login to GHL account then account opens but redirection not works and even when I hit the call back url manually it gives the empty response even after the successful login to GHL account. I am using my clients agency account for this. And test app is on my personal gmail. I am not understanding the problem
Reply

Click for more reactions

Cyril Nicko Gaspar
6:03
Mar 15, 2024
Hi. I would like to ask, I succeeded this before. But now I've got this error:
TypeError: Cannot read property 'clientKeys' of null.

I tried to put clientKeys or client_keys in the url param but didn't succeeded.
Reply

Click for more reactions

Dmitriy Paliy
6:04
Sept 14, 2023
How do I get an Agency contact in the list if it is enabled in the settings of the marketplace account?
Reply

Click for more reactions

Jackson Tyler
6:12
Oct 6, 2023
I get an error 400 when selecting a sub-account. Following it into the console further the error is:

{"status":401,"message":"No Authorization header found for authentication!","traceId":"************"}

1 more reply

Douglas Tobar
Feb 8, 2024
I am facing the same issue

Josh Folsom
July 17, 2024
👍
Reply

Click for more reactions
This comment was deleted.

1 more reply

Kenrick Callwood
May 21, 2024
🔥

Ike Jones
July 3, 2024
That's fucking stupid 
Reply

Click for more reactions

Luis Hernandez
6:17
Mar 21, 2024
Why not allow us to specify a location on the "https://marketplace.gohighlevel.com/oauth/chooselocation" call?? Avoid the manual input. Has this been done and if so whats the parameter to pass?

2 more replies

Joedel Espinosa
May 16, 2024
I've managed to work this one out, we have an automation on this. email me if you're still struggling.
C
Cam Loom
June 17, 2024
Hey Joedel... still struggling.
Reply

Click for more reactions
A
Anonymous
6:18
July 26, 2024
So annoying and in my opinion pointless that you blank out the screen. You can just delete your key secret even the app after making the video...

The video however is useful, but this auth flow is not fun for automated processes that don't need or want user intervention. I just have a simple app that looks for an opportunity in a certain state then kicks off a process. I don't need a user based process to get a token.
Reply

Click for more reactions

Jeffrey Lemoine
6:27
Oct 18, 2024
Here's the github btw
https://github.com/GoHighLevel/oauth-demo
Reply

Click for more reactions

Hakob Ash
6:44
Mar 7, 2024
I get an error 400 when selecting a sub-account. Following it into the console f

2 more replies

braiden goddard
June 22, 2024
have you figured this out?

Rodrigo Isabelo
Oct 2, 2024
Have you guys figured this out? encountering the same issue redirect_uri not matched
Reply

Click for more reactions
A
Anonymous
6:58
Dec 23, 2024
you don't have access this feature
Reply

Click for more reactions

Jugal Singh
7:01
Sept 26, 2023
Is it possible to send custom query parameter through the "Authorization URL" so that after successful authorization, we can get that custom query parameter along with "Code" in the redirect URL ?

1 more reply

Wendell Encorporado
Jan 22, 2024
👍

Wendell Encorporado
Jan 22, 2024
hey guys, i just found a solution...
This is my solution:
I just add state in my redirect during authorization:

```return res.redirect(
    `${BASE_URL}/oauth/chooselocation?response_type=${
      options.requestType
    }&redirect_uri=${options.redirectUrl}&client_id=${
      options.clientId
    }&scope=${options.scopes.join(" ")}&state=${some-state-value}`
  );
```
Reply

Click for more reactions

Harry Fox
7:08
Feb 16, 2024
This is hands down the most ridiculously designed system to get a key to my own app I have ever seen. What on earth we're you guys thinking?

4 more replies

Ike Jones
July 3, 2024
So fucking dumb for no reason 

Will Cooksey
July 30, 2024
✅
Reply

Click for more reactions

André Fael
7:21
Nov 1, 2024
this is fucking insanely complicated. I just wanted to check my own calendar free timeslots through the API. I guess I'll just setup the calendar in Calendly bc wtf is this shit

2 more replies

André Fael
Nov 18, 2024
thx Cam, idk why they didn't start with that ahah. got it going now, cheers

Will Cooksey
Dec 7, 2024
😂 I know lol
Reply

Click for more reactions

Frank Dambra
7:39
July 30, 2024
This is insane. I just need to make a contact POST request to a sub account.

Will Cooksey
July 30, 2024
👍
Reply

Click for more reactions

Frank Dambra
7:39
July 30, 2024
Process is not working
Reply

Click for more reactions

Damian Estevez
7:50
Aug 15, 2024
Is user_type company the same as saying agency?
Reply

Click for more reactions

Miguel Mayori
7:58
Jan 13, 2024
Bs api!!! How would you implement that in the back end if you want to build a gateway!! inefficient 

1 more reply

Roscar Cunanan
Feb 14, 2024
true. how can they not make it simple like stripe implementation? This doesnt work well with server actions.

Napoleon Jones
Apr 9, 2024
👍
Reply

Click for more reactions

Miguel Mayori
7:58
Jan 13, 2024
If we are trying to integrate this with our internal app, let say a gateway to access on readonly mode, to pull information from any agency or perhap trigger a campaign from a mobile app, this api authentication does not work at all! 
Reply

Click for more reactions

Greg Hadley
7:58
Feb 8, 2024
this is a joke. I bet most people just want to connect webhooks but in order to do that we need to know how to set up a whole app. wtf

Will Cooksey
July 30, 2024
🙌
Reply

Click for more reactions
A
Anonymous
7:58
Sept 29, 2024
You really need to provide a client_credential flow. so that you can do machine to machine authentication. for api usage we can't always ask for user interaction unless the auth token is a long lived token and we only do this once. also, how do you provide a callback url if your app is auth protected? this means you need the callback url public right?
Reply

Click for more reactions

Ed Middlebrooks
8:01
Jan 19, 2024
Why is all of this necessary?  Creating applications on the marketplace et al... all I want to do is query for a contact and see if it exists.  This is all overkill.

4 more replies

Will Cooksey
July 30, 2024
👍

Abdus Samad
Aug 5, 2024
👍
Reply

Click for more reactions

David Dickson
8:01
Apr 2, 2024
what's a good alternative to highlevel? this is clearly a nonstarter
S
Scott Cain
May 27, 2024
🔥
Reply

Click for more reactions

Ben Lewis
8:24
Feb 15, 2024
(edited)
Postman should really be the first example to show here as this is how most people are going to gain access to keys...

You can also use it's in-built oauth2 functionality to receive your request code and bearer token without needing to run a nodeJS app to get your request code.

But the downside of most oauth implementations is that bearer and refresh tokens expire, making it a poor solution for server to server integrations.

Roscar Cunanan
Feb 15, 2024
👍

Mick Wiedermann
Aug 7, 2024
👍
Reply

Click for more reactions

Carlos Alberto
8:30
July 7, 2024
They make it so difficult that we are forced to use the inboud webhook and the cost webhook, and guess what... they are both premium!!!

Will Cooksey
July 30, 2024
👍
Reply

Click for more reactions

Abed Malak
9:02
Mar 22, 2024
where can we find the gthub repository?

i'm struggling to set this up
Reply

Click for more reactions

Ed Middlebrooks
9:06
Jan 19, 2024
Why can't I just go into GHL grab my API key and let that be my bearer token?  DAMN! I have to write an app to get a token?  Unbelieveable.

2 more replies

Greg Hadley
Feb 8, 2024
great, that doesn't mean it has to be this difficult.

Norman Love
Apr 14, 2024
🙏
Reply

Click for more reactions

Ameer Ali
9:22
July 12, 2023
Can you provide the code as well ?

Nickolas Casalinuovo
July 15, 2023
https://github.com/GoHighLevel/oauth-demo

Ennio Cuteri
Jan 6, 2024
🙏
Reply

Click for more reactions

Ed Middlebrooks
9:30
Jan 19, 2024
What an overly complicated complete waste of time and energy.

1 more reply

Norman Love
Apr 14, 2024
🙏

Leo ReGrow Hair Restoration
May 16, 2024
🤣
Reply

Click for more reactions

Frank Dambra
9:33
July 31, 2024
Please not that the POST request was not working in the API docs but is working via Postman. I assume this is an issue with the backend of the API docs
Reply

Click for more reactions

Ed Middlebrooks
9:42
Jan 19, 2024
Well it's about time.  Took you long enough.
Reply

Click for more reactions

Ed Burnette
9:51
Oct 28, 2024
I have a NodeJS program that uses the V1 API now, and I'd like to convert it to V2. It runs unattended, so I can't prompt the user or open a browser. Is this supported in V2?
Reply

Click for more reactions

Wendell Encorporado
10:03
Jan 11, 2024
I get Invalid code error! can someone help?
Reply

Click for more reactions

Bilal Malik Hassan
10:34
Dec 9, 2024
I want to Book or delete Appointments using GoHighLevel Calendar API following Documentation 2.0 provided code it give error 401 on my Key. Anyone can Assist with this? I use key from trades Gang calendar API
Reply

Click for more reactions

Phillip Espina
10:42
Dec 6, 2023
I followed these exact instructions and got the same scopes when the bearer auth was returned to me, but im getting error: This authClass type is not allowed to access this scope. Please reach out to the Platform team to get it added

Roscar Cunanan
Feb 14, 2024
remove Bearer prefix from authorization header
Reply

Click for more reactions

Frank Dambra
10:44
July 31, 2024
I have gotten to this point but am getting 'version header was not found' even though the version is correctly specified in the headers.
Reply

Click for more reactions

Cyril Nicko Gaspar
10:52
Apr 15, 2024
I've got this error: "This authClass type is not allowed to access this scope. Please reach out to the Platform team to get it added". How to fix this? I've the scopes I added are only this: "calendars/events.readonly",
"calendars/events.write".
Reply

Click for more reactions

Frank Dambra
11:37
July 31, 2024
(edited)
If I need to post to a sub-account via a backend API request how am I supposed to get around the part where the 'code' in the query parameter returned to the callback path is produced from the process of physically selecting an account from the login page that the initiate path directs one to? Is there someway to handle this programmatically? Also the code generated from the GHL account login screen that is returned to the callback path is only valid once for generation of an Authentication token....
Reply

Click for more reactions

Rick T
12:26
Feb 2, 2024
(edited)
When does the access token expire?  I am assuming this is when you use the refresh token?

Frank Dambra
July 31, 2024
👍
Reply

Click for more reactions

SIFTR Sales
12:49
Jan 29, 2024
I have made some real good progress here. I have successfully retrieved the 'code'. However, now I am struggling to understand which 'Scope' to select. I recieved this error: "The token is not authorized for this scope." If every endpoint must be assigned to a scope, which one does this belong to? I need to select when using the 'Add Followers' endpoint: https://highlevel.stoplight.io/docs/integrations/d6499bc9a04e7-add-followers

Juergen Schreck
July 25, 2024
This is a showstopping issue for me as well. I've successfully implemented the OAuth flow. I'm able to authenticate and refresh expired tokens.

Juergen Schreck
July 25, 2024
I can call any api I requested in the the scopes on my app and in my authentication call.

However, I can not execute workflow triggers and will always get The token is not authorized for this scope. 

Support has not been helpful at all.
Reply

Click for more reactions

Cam Smith
13:25
Apr 14, 2024
why even share your screen if you are going to use sensitive info and block it from being seen?

Norman Love
Apr 14, 2024
agree

Mick Wiedermann
Aug 7, 2024
👍
Reply

Click for more reactions
A
Anonymous
13:32
Sept 16, 2024
This is very difficult to understand. 
Reply

Click for more reactions

Leobardo Cortés
13:38
July 3, 2024
Worst demo of all time....
Reply

Click for more reactions
A
Anonymous
13:42
Oct 10, 2023
Thank you Support! 🙏
Reply

Click for more reactions
B
Boban Petrovic
13:42
Nov 22, 2023
Thank you Support! 🙏
Reply

Click for more reactions
B
Boban Petrovic
13:42
Nov 22, 2023
Thank you Support! 🙏
Reply

Click for more reactions
A
Anonymous
13:42
Nov 30, 2023
Thank you Support! 🙏
Reply

Click for more reactions
A
Anonymous
13:42
Dec 5, 2023
Thank you Support! 🙏
Reply

Click for more reactions
A
Anonymous
13:42
Dec 7, 2023
Thank you Support! 🙏
Reply

Click for more reactions

Bhavin Radadiya
13:42
Dec 11, 2023
(edited)
I've selected agency and subaccunt both while creating app and it's working fine with both option in my account, But when our customers tries to integrate with subaccount it's gives 400 error.
Reply

Click for more reactions

Prince Roger Robielos
13:42
Dec 19, 2023
Thank you Support! 🙏
Reply

Click for more reactions

Jay Isidro
13:42
Jan 3, 2024
Thank you Support! 🙏
Reply

Click for more reactions

Tonx Santos
13:42
Jan 28, 2024
This tutorial is really bad!  
I suggest to replace it with something meaningful and people to understand. 

Tim Jedrek
Feb 1, 2024
🤣

Leo ReGrow Hair Restoration
May 16, 2024
🤣
Reply

Click for more reactions

Rahul SIngh
13:42
Feb 5, 2024
Thank you Support! 🙏
Reply

Click for more reactions

arif 786
13:42
Feb 12, 2024
Thank you Support! 🙏
Reply

Click for more reactions
A
Anonymous
13:42
Feb 16, 2024
Please I want to know if it is possible to integrate MercadoPago Gateway in the 2 step order form for a client
Reply

Click for more reactions

Wesley Edgar
13:42
Feb 21, 2024
(edited)
Wow, this seems like an incredibly over complicated process. I currently send contact data to clients based on a completed phone call from another piece of software. Simple REST API via webhook. It seems I know need to hire a developer to maintain this functionality, cause most of this is way over my head :(

Norman Love
Apr 14, 2024
👍
Reply

Click for more reactions
R
Ranajoy Saha
13:42
Feb 23, 2024
Thank you Support! 🙏
Reply

Click for more reactions

Marko Michinaux
13:42
Mar 25, 2024
This is a very convoluted and inflexible way to authenticate, please rework.

Gareth Millward
Mar 25, 2024
👍
Reply

Click for more reactions
B
Brian Miglionico
13:42
Apr 10, 2024
Has there been any updates to this since the video?
Reply

Click for more reactions

Norman Love
13:42
Apr 14, 2024
Not a very high quality video.
Normally we want people without strong accents to do a tutorial. Sometimes half the screen was blacked out to hide screen details. Just cancel tokens after the video and show everything. API doesnt show how to fetch multiple pages, what the default number of records is. we dont know. In General Stripe has best support, best developers, best developers help on Discord. Research Stripe and so what they do. Your APi is unnecessary complex. Why you want us refreshing tokens every 24 hours for? Are you the NSA? Are developers asking for this? No, then why do it. 

1 more reply
S
Scott Cain
May 27, 2024
Solving a problem that doesn't exist. Creating job security for the developers who created this nonsense? It'll be the stake in the coffin that finally gets me to leave the shitshow that is HighLevel.

Mick Wiedermann
Aug 7, 2024
💯
Reply

Click for more reactions

Narek Team
13:42
May 3, 2024
Thank you Support! 🙏
Reply

Click for more reactions

Pat Sudhaus
13:42
May 3, 2024
How on earth does a service like highlevel not offer the STANDARD OAuth 2 client credential flow for systems to integrate with each-other. The terrible developer experience for something as simple as getting a token makes me extremely hesitant about using HighLevel

1 more reply

Ben Lewis
May 5, 2024
(edited)
As far as I can see, it is standard oauth2?
I think this is just a poor explainer - there's really no need to use a stand alone app to get keys.

For example, you can totally use postman to get token and credentials.

Leo ReGrow Hair Restoration
May 16, 2024
🤣
Reply

