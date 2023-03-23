[[__toc__]]

## Introduction

This file documents design choices which may lead to missing edge case implementattions or other decisions differing from
the standard or the original strophejs library choices or goals.

## 1.1 No route attribute for BOSH XML element

### Standard:

Source: https://xmpp.org/extensions/xep-0124.html
A connection manager MAY be configured to enable sessions with more than one server in different domains. When
requesting a session with such a "proxy" connection manager, a client SHOULD include a 'route' attribute that specifies
the protocol, hostname, and port of the server with which it wants to communicate, formatted as "proto:host:port" (e.g.,
"xmpp:example.com:9999"). [17] A connection manager that is configured to work only with a single server (or only with a
defined list of domains and the associated list of hostnames and ports that are serving those domains) MAY ignore the
'route' attribute. (Note that the 'to' attribute specifies the domain being served, not the hostname of the machine that
is serving the domain.)

### Decision

An explicit connection Manager as proxy for multiple XMPP servers are as seldom as the BOSH Connection usage.
