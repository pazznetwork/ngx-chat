# XMPP

## General

Xmpp stands for "Extensible Messaging and Presence Protocol" and was called in the past Jabber, that is the reason why
there are so many references to jabber instead of xmpp.

Xmpp connects over BOSH (Bidirectional-streams Over Synchronous HTTP) which means that 2 HTTP connection will be kept
open which sends stanzas (XML payloads) to the server in the first and gets them in the second one.
Xmpp can now be implemented with Websocket except secure reconnections, discovery and other specific technical
expectations.

## General Technical Design Guidelines

In general the xmpp design choices can be better understood if you imagine trying to make a chat out of email.
Therefore, there a specifications for the case of multi-user clients on a device,
multi device users, multi device users on multiple servers which all support or can support different sets of features
while also the same client can offer the user multiple different sets of features to support.

The goal of the authentication as well the communication line encryption tries always to be as simple and secure as
possible as-well as supporting all versions and iterations of the specifications dedicated to it.

As the clients struggled with a high amount of complexity for many users the complexity was pushed slowly back to
the specifications also different specifications sets.
Modern clients should orient themselves on the compliance for the XMPP IM (instant messaging) client and look for the
extended protocols.
See: https://xmpp.org/extensions/xep-0443.html#im and https://xmpp.org/extensions/xep-0369.html the MIX specification
making it possible to skip the previous implementations.

TODO MORE:

### Contact Management

Every user can write to any other user as long they know or have their jid, guessed of from a shared room. A user can be
blocked or added to your contacts.
An add to the contacts is a subscription to as users presence which will be broadcast by him when he logs in.
When a user added you to your contacts you can also add them which creates a bidirectional subscriptions.

The add, remove and block are managed by the rooster spec and block spec which manage contact and block lists of a user.

There is always the case of the user writing without sending a contact request which leads to the need to also analyse
the received messages by the user to visualize all contacts.

### Messaging

In the core specification messages arrive to a user only when he is online and only to the specific client and specific
device and are only kept in one session.
For managing offline messages and the message history the Message Archive Management shorted to MAM was added.

When a server supports this feature

Other Message Features other Chat Clients offer and are in specification process:

- Time

### Connection Management

To establish a stable connection the implementation of the ping specification is necessary to avoid timeouts if there
are no actions performed on the connections.
To have proper timeouts on requests there is the need for the ack specifications which checks regular if a set amount
of requests was answered and makes a reconnections possible on the last set of packages.

## Specifications

### [XMPP Core RFC-6121](https://datatracker.ietf.org/doc/html/rfc6121)

### [XMPP Extension for Websocket RFC-7395](https://tools.ietf.org/html/rfc7395)

### [Extensible Messaging and Presence Protocol (XMPP): Instant Messaging and Presence](https://xmpp.org/rfcs/rfc3921.html)

### Abstract Specification extending or amending existing ones

#### XMPP Forms, XHTML, X-Forms

[XEP-0004](https://xmpp.org/extensions/xep-0004.html)
Used in publish-subscribe, message-archive or multi-user-chat.

#### Extended Stanza Addressing

[XEP-0033](https://xmpp.org/extensions/xep-0033.html)
Used to send one message to several JIDs at the same time and to forward messages.

## Plugins

### service-discovery

[XEP-0030](https://xmpp.org/extensions/xep-0030.html)

| XEP                                                   | Version | Status  | Name                                             | Plugins                            | Notes                                                                                                      |
| ----------------------------------------------------- | :------ | ------- | ------------------------------------------------ | ---------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| [XEP-0045](https://xmpp.org/extensions/xep-0045.html) | 1.31.2  | Partial | Multi-user chat rooms                            | multi-user-chat                    | All basics stuff is supported. Also, some more advanced features like invitations, creation of rooms, etc. |
| [XEP-0048](https://xmpp.org/extensions/xep-0048.html) | 1.1     | Partial | Bookmarks                                        | bookmark                           |                                                                                                            |
| [XEP-0049](https://xmpp.org/extensions/xep-0049.html) | 1.2     | Discuss | Private XML Storage                              |                                    | For bookmark storage and meta contacts.                                                                    |
| [XEP-0050](https://xmpp.org/extensions/xep-0050.html) | 1.2     | Discuss | Ad-Hoc Commands                                  |                                    |                                                                                                            |
| [XEP-0054](https://xmpp.org/extensions/xep-0054.html) | 1.2     | Discuss | VCard-temp                                       |                                    |                                                                                                            |
| [XEP-0055](https://xmpp.org/extensions/xep-0055.html) | 1.3     | Discuss | Jabber Search                                    |                                    |                                                                                                            |
| [XEP-0059](https://xmpp.org/extensions/xep-0059.html) | 1.0     | Partial | Result Set Management                            | message-archive                    | Used by XEP-0313.                                                                                          |
| [XEP-0060](https://xmpp.org/extensions/xep-0060.html) | 1.13    | Partial | Publish-Subscribe                                | publish-subscribe                  |                                                                                                            |
| [XEP-0065](https://xmpp.org/extensions/xep-0065.html) | 1.8     | Discuss | SOCKS5 Bytestreams                               |                                    |                                                                                                            |
| [XEP-0066](https://xmpp.org/extensions/xep-0066.html) | 1.5     | Planned | Out of Band Data                                 |                                    | Support for URLs in messages.                                                                              |
| [XEP-0070](https://xmpp.org/extensions/xep-0070.html) | 1.0     | Discuss | Verifying HTTP Requests via XMPP                 |                                    |                                                                                                            |
| [XEP-0071](https://xmpp.org/extensions/xep-0071.html) | 1.4     | Discuss | XHTML-IM                                         |                                    |                                                                                                            |
| [XEP-0077](https://xmpp.org/extensions/xep-0077.html) | 2.4     | Partial | In-band registration                             | registration                       |                                                                                                            |
| [XEP-0083](https://xmpp.org/extensions/xep-0083.html) | 1.0     | Discuss | Nested Roster Groups                             |                                    |                                                                                                            |
| [XEP-0084](https://xmpp.org/extensions/xep-0084.html) | 1.1.1   | Discuss | User Avatar                                      |                                    |                                                                                                            |
| [XEP-0085](https://xmpp.org/extensions/xep-0085.html) | 2.1     | Discuss | Chat State Notifications                         |                                    |                                                                                                            |
| [XEP-0095](https://xmpp.org/extensions/xep-0095.html) | 1.1     | Discuss | Stream Initiation                                |                                    |                                                                                                            |
| [XEP-0107](https://xmpp.org/extensions/xep-0107.html) | 1.2     | Discuss | User Mood                                        |                                    |                                                                                                            |
| [XEP-0108](https://xmpp.org/extensions/xep-0108.html) | 1.3     | Discuss | User Activity                                    |                                    |                                                                                                            |
| [XEP-0115](https://xmpp.org/extensions/xep-0115.html) | 1.5     | Partial | Entity Capabilities                              | roster                             |                                                                                                            |
| [XEP-0118](https://xmpp.org/extensions/xep-0118.html) | 1.2     | Discuss | User Tune                                        |                                    |                                                                                                            |
| [XEP-0144](https://xmpp.org/extensions/xep-0144.html) | 1.1.1   | Discuss | Roster Item Exchange                             |                                    | Makes sharing of roster contacts possible                                                                  |
| [XEP-0145](https://xmpp.org/extensions/xep-0145.html) | 1.0     | Discuss | Annotations                                      |                                    | Notes for contacts                                                                                         |
| [XEP-0146](https://xmpp.org/extensions/xep-0146.html) | 1.0     | Discuss | Remote Controlling Clients                       |                                    |                                                                                                            |
| [XEP-0153](https://xmpp.org/extensions/xep-0153.html) | 1.0     | Discuss | vCard-Based Avatars                              |                                    |                                                                                                            |
| [XEP-0157](https://xmpp.org/extensions/xep-0157.html) | 1.1.0   | Discuss | Contact Addresses for XMPP Services              |                                    |                                                                                                            |
| [XEP-0158](https://xmpp.org/extensions/xep-0158.html) | 1.0     | Discuss | CAPTCHA Forms                                    |                                    | Images only.                                                                                               |
| [XEP-0163](https://xmpp.org/extensions/xep-0163.html) | 1.2     | Partial | Personal Eventing Protocol                       | publish-subscribe, message-archive |                                                                                                            |
| [XEP-0166](https://xmpp.org/extensions/xep-0166.html) | 1.1.2   | Discuss | Jingle                                           |                                    |                                                                                                            |
| [XEP-0172](https://xmpp.org/extensions/xep-0172.html) | 1.0     | Discuss | User Nickname                                    |                                    |                                                                                                            |
| [XEP-0184](https://xmpp.org/extensions/xep-0184.html) | 1.2     | Discuss | Message Receipt                                  |                                    | Message was read notification                                                                              |
| [XEP-0191](https://xmpp.org/extensions/xep-0191.html) | 1.3     | Partial | Blocking Command                                 | block                              | Implemented instead of XEP-0016                                                                            |
| [XEP-0198](https://xmpp.org/extensions/xep-0198.html) | 1.6     | Partial | Stream Management                                | foreign:xmpp/stream-management     | Automatically responds to acks but does not support requesting acks yet.                                   |
| [XEP-0199](https://xmpp.org/extensions/xep-0199.html) | 2.0     | Partial | XMPP Ping                                        | ping                               |                                                                                                            |
| [XEP-0200](https://xmpp.org/extensions/xep-0200.html) | 0.2     | Discuss | Stanza Encryption                                |                                    |                                                                                                            |
| [XEP-0202](https://xmpp.org/extensions/xep-0202.html) | 2.0     | Partial | Entity Time                                      | entity-time                        |                                                                                                            |
| [XEP-0203](https://xmpp.org/extensions/xep-0203.html) | 2.0     | Discuss | Delayed Delivery                                 |                                    |                                                                                                            |
| [XEP-0209](https://xmpp.org/extensions/xep-0209.html) | 0.1     | Discuss | Metacontacts                                     |                                    |                                                                                                            |
| [XEP-0221](https://xmpp.org/extensions/xep-0221.html) | 1.0     | Discuss | Data Forms Media Element                         |                                    |                                                                                                            |
| [XEP-0222](https://xmpp.org/extensions/xep-0222.html) | 1.0     | Discuss | Persistent Storage of Public Data via PubSub     |                                    |                                                                                                            |
| [XEP-0223](https://xmpp.org/extensions/xep-0223.html) | 1.1     | Discuss | Persistent Storage of Private Data via PubSub    |                                    |                                                                                                            |
| [XEP-0224](https://xmpp.org/extensions/xep-0224.html) | 1.0     | Discuss | Attention                                        |                                    |                                                                                                            |
| [XEP-0231](https://xmpp.org/extensions/xep-0231.html) | 1.0     | Discuss | Bits of Binary                                   |                                    |                                                                                                            |
| [XEP-0234](https://xmpp.org/extensions/xep-0234.html) | 0.17.1  | Discuss | Jingle File Transfer                             |                                    |                                                                                                            |
| [XEP-0237](https://xmpp.org/extensions/xep-0237.html) | 1.2     | Discuss | Roster Versioning                                |                                    |                                                                                                            |
| [XEP-0245](https://xmpp.org/extensions/xep-0245.html) | 1.0     | Discuss | The /me Command                                  |                                    |                                                                                                            |
| [XEP-0249](https://xmpp.org/extensions/xep-0249.html) | 1.2     | Discuss | Direct MUC Invitations                           |                                    |                                                                                                            |
| [XEP-0258](https://xmpp.org/extensions/xep-0258.html) | 1.1.1   | Discuss | Security Labels in XMPP                          |                                    |                                                                                                            |
| [XEP-0260](https://xmpp.org/extensions/xep-0260.html) | 1.0.3   | Discuss | Jingle SOCKS5 Bytestreams Transport Method       |                                    |                                                                                                            |
| [XEP-0261](https://xmpp.org/extensions/xep-0261.html) | 1.0     | Discuss | Jingle In-Band Bytestreams Transport Method      |                                    |                                                                                                            |
| [XEP-0280](https://xmpp.org/extensions/xep-0280.html) | 0.12.0  | Partial | Message Carbons                                  | message-carbons                    | Without implementing §6.1                                                                                  |
| [XEP-0284](https://xmpp.org/extensions/xep-0284.html) | 0.1.3   | Discuss | Shared XML Editing                               |                                    |                                                                                                            |
| [XEP-0292](https://xmpp.org/extensions/xep-0292.html) | 0.11    | Discuss | vCard4 Over XMPP                                 |                                    |                                                                                                            |
| [XEP-0297](https://xmpp.org/extensions/xep-0297.html) | 0.3     | Partial | Stanza Forwarding                                | message-carbons                    | Supported only for XEP-0313/xep-0280.                                                                      |
| [XEP-0300](https://xmpp.org/extensions/xep-0300.html) | 1.0.0   | Discuss | Use of Cryptographic Hash Functions in XMPP      |                                    |                                                                                                            |
| [XEP-0306](https://xmpp.org/extensions/xep-0306.html) | 0.2.1   | Discuss | Extensible Status Conditions for Multi-User Chat |                                    |                                                                                                            |
| [XEP-0308](https://xmpp.org/extensions/xep-0308.html) | 1.0     | Discuss | Last Message Correction                          |                                    |                                                                                                            |
| [XEP-0313](https://xmpp.org/extensions/xep-0313.html) | 0.6.3   | Partial | Message Archive Management                       | message-archive                    | Makes message history for users                                                                            |
| [XEP-0316](https://xmpp.org/extensions/xep-0316.html) | 0.1     | Discuss | MUC Eventing protocol                            |                                    |                                                                                                            |
| [XEP-0317](https://xmpp.org/extensions/xep-0317.html) | 0.1     | Discuss | Hats                                             |                                    |                                                                                                            |
| [XEP-0319](https://xmpp.org/extensions/xep-0319.html) | 1.0.2   | Discuss | Last User Interaction in Presence                |                                    |                                                                                                            |
| [XEP-0333](https://xmpp.org/extensions/xep-0333.html) | 0.4     | Discuss | Chat Markers                                     |                                    |                                                                                                            |
| [XEP-0334](https://xmpp.org/extensions/xep-0334.html) | 0.3.0   | Discuss | Message Processing Hints                         |                                    |                                                                                                            |
| [XEP-0352](https://xmpp.org/extensions/xep-0352.html) | 1.0.0   | Discuss | Client State Indication                          |                                    |                                                                                                            |
| [XEP-0357](https://xmpp.org/extensions/xep-0357.html) | 0.4.1   | Partial | Push Notifications                               | push                               |                                                                                                            |
| [XEP-0359](https://xmpp.org/extensions/xep-0359.html) | 0.6.1   | Partial | Unique and Stable Stanza IDs                     | message-uid                        |                                                                                                            |
| [XEP-0363](https://xmpp.org/extensions/xep-0363.html) | 1.0.0   | Partial | HTTP File Upload                                 | http-file-upload                   |                                                                                                            |
| [XEP-0368](https://xmpp.org/extensions/xep-0368.html) | 1.1.0   | Partial | SRV records for XMPP over TLS                    | foreign:xmpp/resolve               |                                                                                                            |
| [XEP-0372](https://xmpp.org/extensions/xep-0372.html) | 0.5.0   | Discuss | References                                       |                                    |                                                                                                            |
| [XEP-0373](https://xmpp.org/extensions/xep-0373.html) | 0.4.0   | Discuss | OpenPGP plugin.                                  |                                    |                                                                                                            |
| [XEP-0377](https://xmpp.org/extensions/xep-0377.html) | 0.3     | Discuss | Spam Reporting                                   |                                    |                                                                                                            |
| [XEP-0380](https://xmpp.org/extensions/xep-0380.html) | 0.3.0   | Discuss | Explicit Message Encryption                      |                                    |                                                                                                            |
| [XEP-0382](https://xmpp.org/extensions/xep-0382.html) | 0.2.0   | Discuss | Spoiler messages                                 |                                    |                                                                                                            |
| [XEP-0384](https://xmpp.org/extensions/xep-0384.html) | 0.7.0   | Discuss | OMEMO Encryption                                 |                                    |                                                                                                            |
| [XEP-0392](https://xmpp.org/extensions/xep-0392.html) | 0.7.0   | Discuss | Consistent Color Generation                      |                                    |                                                                                                            |
| [XEP-0393](https://xmpp.org/extensions/xep-0393.html) | 1.1.1   | Discuss | Message Styling                                  |                                    |                                                                                                            |
| [XEP-0398](https://xmpp.org/extensions/xep-0398.html) | 0.2.1   | Discuss | User Avatar to vCard-Based Avatars Conversion    |                                    |                                                                                                            |
| [XEP-0411](https://xmpp.org/extensions/xep-0411.html) | 1.0.0   | Discuss | Bookmarks Conversion                             |                                    |                                                                                                            |
| [XEP-0422](https://xmpp.org/extensions/xep-0422.html) | 0.2.0   | Discuss | Message Fastening                                |                                    |                                                                                                            |
| [XEP-0424](https://xmpp.org/extensions/xep-0424.html) | 0.3.0   | Discuss | Message Retractions                              |                                    |                                                                                                            |
| [XEP-0425](https://xmpp.org/extensions/xep-0425.html) | 0.2.1   | Discuss | Message Moderation                               |                                    |                                                                                                            |
| [XEP-0437](https://xmpp.org/extensions/xep-0437.html) | 0.2.0   | Discuss | Room Activity Indicators                         |                                    |                                                                                                            |
| [XEP-0441](https://xmpp.org/extensions/xep-0441.html) | 0.2.0   | Discuss | Message Archive Management Preferences           |                                    |                                                                                                            |
| [XEP-0453](https://xmpp.org/extensions/xep-0453.html) | 0.1.0   | Discuss | DOAP usage in XMPP                               |                                    |                                                                                                            |
| [XEP-0453](https://xmpp.org/extensions/xep-0453.html) | 0.1.0   | Discuss | OMEMO Media sharing                              |                                    |                                                                                                            |

## plugin overview

| Plugins              | Core XEP | Relevant XEPs                | Function                                      | Notes |
| -------------------- | -------- | ---------------------------- | --------------------------------------------- | ----- |
| block                | XEP-0191 |                              | Blocking contact                              |       |
| bookmark             | XEP-0048 |                              | Storing Stanzas for later actions             |       |
| entity-time          | XEP-0202 |                              | Message Timestamps                            |       |
| http-file-upload     | XEP-0363 |                              | File upload                                   |       |
| message              | RFC 6120 |                              | Messaging Core                                |       |
| message-archive      | XEP-0313 | XEP-0004, XEP-0059, XEP-0163 | Message History                               |       |
| message-carbons      | XEP-0280 | XEP-0297                     | Message Multidevice Sync                      |       |
| message-state        | CUSTOM   | XEP-0184                     | Custom Message Read                           |       |
| message-uuid         | XEP-0359 |                              | Unique                                        |       |
| muc-sub              | Ejabberd |                              | Chat Room Notifications                       |       |
| multi-user-chat      | XEP-0045 | XEP-0004                     | Chat Rooms                                    |       |
| ping                 | XEP-0199 |                              | Checks connections                            |       |
| publish-subscribe    | XEP-0060 | XEP-0004, XEP-0163           | Publish und Subscribe between Nodes with IQ   |       |
| push                 | XEP-0357 |                              | Inform about message when offline             |       |
| registration         | XEP-0077 |                              | Registration without Admin                    |       |
| roster               | XEP-0115 |                              | List of contacts                              |       |
| service-discovery    | XEP-0030 | XEP-0163                     | Check for provided Services (XEP's) by server |       |
| unread-message-count | CUSTOM   |                              | Count unread messages                         |       |
